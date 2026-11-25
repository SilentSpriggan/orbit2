"""Local data: crew, latest readings, evidence passages, shared assistant context, voice settings.

Seeded from data/seed.json (synthetic). Saved vitals and voice settings are written to
data/runtime/ so they survive a restart. Nothing leaves this machine.
"""

import json
import re
import threading
import uuid
from datetime import datetime, timezone
from typing import Any

from .config import DATA_DIR, RUNTIME_DIR

VITAL_META: dict[str, dict[str, Any]] = {
    "heart_rate": {"label": "Heart rate", "unit": "bpm", "min": 20, "max": 250},
    "spo2": {"label": "SpO₂", "unit": "%", "min": 50, "max": 100},
    "systolic_bp": {"label": "Systolic BP", "unit": "mmHg", "min": 50, "max": 260},
    "diastolic_bp": {"label": "Diastolic BP", "unit": "mmHg", "min": 20, "max": 160},
    "temperature": {"label": "Temperature", "unit": "°C", "min": 30, "max": 43},
    "respiratory_rate": {"label": "Respiratory rate", "unit": "/min", "min": 4, "max": 60},
}

_WORD = re.compile(r"[a-z0-9]+")


def _library_passage(p: dict[str, Any]) -> dict[str, Any]:
    """One Evidence library entry as a searchable passage.

    The excerpt carries the evidence type and tracking guidance so the model can
    say how strong the finding is; keywords add the topic and the papers' titles."""
    words = " ".join([p["topic"], *(f"{s['cite']} {s['title']}" for s in p["sources"])])
    return {
        "documentId": p["documentId"],
        "chunkId": p["chunkId"],
        "title": p["title"],
        "excerpt": f"{p['excerpt']} Evidence type: {p['evidence']}. Tracking guidance: {p['tracking']}",
        "keywords": _WORD.findall(words.lower()),
    }


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _missions(q: str) -> set[str]:
    """Missions named in a lowercase question, spelled as the library spells them ("ma-9" means Mercury-Atlas 9)."""
    found = set(re.findall(r"\b(?:apollo|skylab|mercury-atlas|gemini) (?:\d+|[ivx]+(?:-a)?)\b", q))
    found |= {f"mercury-atlas {n}" for n in re.findall(r"\bma-?(\d+)\b", q)}
    return found


def _stem(word: str) -> str:
    """Very small stemmer so 'bones'/'bone' and 'skeletal'/'skeleton' match."""
    return word[:5] if len(word) > 5 else word.rstrip("s")


def _dated_today(item: dict[str, Any], field: str) -> dict[str, Any]:
    """Replace a "dailyAt" local time of day ("07:00") with today's date at that time, in UTC."""
    if "dailyAt" not in item:
        return item
    hour, minute = (int(x) for x in item["dailyAt"].split(":"))
    local = datetime.now().astimezone().replace(hour=hour, minute=minute, second=0, microsecond=0)
    at = min(local, datetime.now().astimezone())  # never in the future, as on the website
    out = {k: v for k, v in item.items() if k != "dailyAt"}
    out[field] = at.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    return out


class Store:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        seed = json.loads((DATA_DIR / "seed.json").read_text(encoding="utf-8"))
        self.crew: list[dict[str, Any]] = seed["crew"]
        self.summaries: dict[str, dict[str, Any]] = seed["summaries"]
        # The website's Evidence library (ui/research-library.js, exported by
        # scripts/export-research.mjs), so the assistant cites what the website shows.
        # seed.json's synthetic passages are only a fallback if the export is missing.
        library = DATA_DIR / "research-library.json"
        evidence_file = library if library.exists() else DATA_DIR / "seed.json"
        # The exported entries as written, for answers that show each paper (onboard_library.py).
        self.library: dict[tuple[str, str], dict[str, Any]] = (
            {(p["documentId"], p["chunkId"]): p for p in json.loads(library.read_text(encoding="utf-8"))["passages"]}
            if library.exists()
            else {}
        )
        self.evidence: list[dict[str, Any]] = (
            [_library_passage(p) for p in self.library.values()] if self.library else seed["evidence"]
        )
        self.evidence_updated_at = datetime.fromtimestamp(
            evidence_file.stat().st_mtime, timezone.utc
        ).isoformat(timespec="seconds").replace("+00:00", "Z")
        # Records a person approved for one voice session, keyed by its WebRTC pc_id.
        # Never global: one session's records must not reach another session's prompt.
        self.shared_context: dict[str, list[dict[str, Any]]] = {}
        RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
        self._vitals_log = RUNTIME_DIR / "vitals.jsonl"
        self._replay_saved_vitals()

    # ------------------------------------------------------------------ crew

    def get_crew(self, crew_id: str) -> dict[str, Any] | None:
        return next((c for c in self.crew if c["id"] == crew_id), None)

    def summary(self, crew_id: str) -> dict[str, Any]:
        summary = self.summaries.get(crew_id) or {"crewId": crew_id, "readings": [], "wellbeing": None}
        # The sample crew's readings roll forward on the website (a reading every morning), so the
        # seed gives a local time of day ("dailyAt") and they are dated today here.
        readings = [_dated_today(r, "recordedAt") for r in summary["readings"]]
        wellbeing = summary.get("wellbeing")
        if wellbeing and "dailyAt" in wellbeing:
            wellbeing = _dated_today(wellbeing, "checkInAt")
        return {**summary, "readings": readings, "wellbeing": wellbeing}

    def add_vital(self, crew_id: str, kind: str, value: float, recorded_at: str | None) -> dict[str, Any]:
        """Validate and store a reading. Raises ValueError with a readable message."""
        meta = VITAL_META.get(kind)
        if not meta:
            raise ValueError(f"Unknown reading type: {kind}.")
        if not (meta["min"] <= value <= meta["max"]):
            raise ValueError(f"{value} {meta['unit']} is outside {meta['min']}–{meta['max']} {meta['unit']}.")
        saved = {
            "id": f"v-{uuid.uuid4().hex[:10]}",
            "crewId": crew_id,
            "kind": kind,
            "value": value,
            "unit": meta["unit"],
            "recordedAt": recorded_at or now_iso(),
            "source": "assistant",
        }
        with self._lock:
            self._apply_vital(saved)
            with self._vitals_log.open("a", encoding="utf-8") as f:
                f.write(json.dumps(saved) + "\n")
        return saved

    def _apply_vital(self, v: dict[str, Any]) -> None:
        summary = self.summaries.setdefault(v["crewId"], {"crewId": v["crewId"], "readings": [], "wellbeing": None})
        reading = {
            "kind": v["kind"],
            "label": VITAL_META[v["kind"]]["label"],
            "value": v["value"],
            "unit": v["unit"],
            "recordedAt": v["recordedAt"],
            "source": v["source"],
        }
        summary["readings"] = [r for r in summary["readings"] if r["kind"] != v["kind"]] + [reading]

    def _replay_saved_vitals(self) -> None:
        if not self._vitals_log.exists():
            return
        for line in self._vitals_log.read_text(encoding="utf-8").splitlines():
            try:
                v = json.loads(line)
                if v.get("kind") in VITAL_META:
                    self._apply_vital(v)
            except json.JSONDecodeError:
                continue

    # -------------------------------------------------------------- evidence

    def search_evidence(self, query: str, k: int) -> list[dict[str, Any]]:
        """Keyword search over the local passages (no embeddings yet)."""
        # Keep short numerical record identifiers (e.g. 001, 9) and ignore question filler.
        stop = {"what", "was", "were", "the", "for", "and", "with", "does", "this", "that", "show", "tell", "about", "during",
                "how", "why", "who", "when", "where", "which", "did", "are", "much", "many", "like", "can", "you", "its", "there"}
        # Everyday words for what an entry states in other terms ("How hot is Venus?" asks about temperature).
        synonyms = {"hot": "temperature", "cold": "temperature", "heat": "temperature", "warm": "temperature",
                    "air": "atmosphere", "windy": "winds", "wind": "winds"}
        words_in = [w for w in _WORD.findall(query.lower()) if (len(w) > 2 or w.isdigit()) and w not in stop]
        terms = {_stem(synonyms.get(w, w)) for w in words_in}
        if not terms:
            return []
        q = query.lower()
        # Historical records name a crew role. Longest first, so "pilot" never means "Scientist Pilot".
        asked_role = next((r for r in ("scientist pilot", "commander", "pilot") if re.search(rf"\b{r}\b", q)), None)
        # What was measured. A record that measures what is asked outranks one that only shares
        # context words (e.g. "after landing" heart rates for a body temperature question).
        measure_words = {
            "heart": ("heart rate",), "pulse": ("heart rate",),
            "temperature": ("body temperature",), "fever": ("body temperature",),
            "respiratory": ("respiratory rate",), "breathing": ("respiratory rate",), "breaths": ("respiratory rate",),
            "systolic": ("systolic bp",), "diastolic": ("diastolic bp",), "blood pressure": ("systolic bp", "diastolic bp"),
            "ventilation": ("minute ventilation",), "oxygen": ("oxygen consumption",),
            "co2": ("co2 production",), "carbon dioxide": ("co2 production",),
        }
        asked_measures = {m for word, names in measure_words.items() if re.search(rf"\b{word}\b", q) for m in names}
        asked_missions = _missions(q)
        scored = []
        for chunk in self.evidence:
            # The website topic (e.g. "Hostile Environments") is searchable too.
            words = {_stem(w) for w in _WORD.findall(f"{chunk['title']} {chunk.get('topic', '')} {chunk['excerpt']}".lower())}
            words |= {_stem(w) for w in chunk.get("keywords", [])}
            hits = len(terms & words)
            if hits:
                # Exact record ids outrank incidental word matches in other records.
                record_ids = re.findall(r"\b(?:NASA-VITAL-\d+|SKYLAB[\w-]+)\b", query, re.IGNORECASE)
                exact = any(record_id.lower() in chunk["title"].lower() for record_id in record_ids)
                # A word in the entry's title (a planet, a mission) says more than one in passing.
                title_hits = len(terms & {_stem(w) for w in _WORD.findall(chunk["title"].lower())})
                score = hits / len(terms) + 0.25 * title_hits / len(terms) + (1 if exact else 0)
                # "Mercury" is a planet and a mission program: without mission words, mean the planet.
                planet = re.match(r"Planet (\w+)", chunk["title"])
                if planet and re.search(rf"\b{planet.group(1).lower()}\b", q):
                    mission_words = re.search(r"atlas|mission|cooper|carpenter|pilot|astronaut|crew|flight|\bma-?\d", q)
                    score += -0.5 if mission_words and planet.group(1) == "Mercury" else 1
                # A named mission ("Apollo 10", "Gemini XI", "MA-7") outranks shared words such as
                # "heart rate" in records from other missions.
                text = f"{chunk['title']} {chunk['excerpt']}".lower()
                if asked_missions and any(re.search(rf"\b{re.escape(m)}\b", text) for m in asked_missions):
                    score += 0.75
                role = re.search(r"Crew role: ([^;.]+)", chunk["excerpt"])
                if asked_role and role:
                    score += 0.5 if role.group(1).strip().lower() == asked_role else -0.5
                measured = re.search(r"Measurements: (.*?)(?:\. Source|$)", chunk["excerpt"])
                if asked_measures and measured:
                    names = [n.strip() for n in re.findall(r"([a-z0-9 ]+?): [\d.]+", measured.group(1))]
                    # A bonus only: a record of the right person and phase that lacks the measure
                    # must still reach the model, so it can say the measure was not recorded.
                    if any(n == a or n.startswith(a + " ") for n in names for a in asked_measures):
                        score += 0.5
                scored.append((score, chunk))
        scored.sort(key=lambda s: s[0], reverse=True)
        return [
            {k_: c[k_] for k_ in ("documentId", "chunkId", "title", "excerpt")} | {"score": round(score, 2)}
            for score, c in scored[:k]
        ]

    @property
    def document_count(self) -> int:
        return len({c["documentId"] for c in self.evidence})


store = Store()

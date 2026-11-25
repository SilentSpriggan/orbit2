"""Anatomy lab API (/api/anatomy/*) for the React Anatomy lab module.

Matches src/modules/anatomy/services/anatomyService.ts. The region catalogue is read
from the module's own regions.json so the two cannot drift. Pins start from the
synthetic seed (data/anatomy-pins.json) and saved changes go to
data/runtime/anatomy-pins.json, so they survive a restart. Nothing leaves this machine.
"""

import json
import threading
import uuid
from typing import Any, Literal

from fastapi import APIRouter, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .config import DATA_DIR, REPO_DIR, RUNTIME_DIR
from .store import now_iso

router = APIRouter(prefix="/api/anatomy")

REGIONS_FILE = REPO_DIR / "src" / "modules" / "anatomy" / "mocks" / "regions.json"
SEED_FILE = DATA_DIR / "anatomy-pins.json"
PINS_FILE = RUNTIME_DIR / "anatomy-pins.json"

PinType = Literal["symptom", "injury", "observation"]
PinSeverity = Literal["nominal", "caution", "critical"]
PinStatus = Literal["open", "monitoring", "resolved"]


class Position3d(BaseModel):
    x: float
    y: float
    z: float
    nx: float
    ny: float
    nz: float


class Position2d(BaseModel):
    view: Literal["front", "back"]
    x: float
    y: float


class PinIn(BaseModel):
    crewId: str = Field(min_length=1, max_length=40)
    regionId: str = Field(min_length=1, max_length=80)
    type: PinType
    title: str = Field(min_length=1, max_length=200)
    severity: PinSeverity
    status: PinStatus
    onsetAt: str = Field(min_length=1, max_length=40)
    authorId: str = Field(min_length=1, max_length=40)
    note: str = Field(default="", max_length=4000)
    linkedVitalKinds: list[str] = Field(default_factory=list, max_length=20)
    position3d: Position3d | None = None
    position2d: Position2d | None = None


class PinPatch(BaseModel):
    crewId: str | None = Field(default=None, min_length=1, max_length=40)
    regionId: str | None = Field(default=None, min_length=1, max_length=80)
    type: PinType | None = None
    title: str | None = Field(default=None, min_length=1, max_length=200)
    severity: PinSeverity | None = None
    status: PinStatus | None = None
    onsetAt: str | None = Field(default=None, min_length=1, max_length=40)
    note: str | None = Field(default=None, max_length=4000)
    linkedVitalKinds: list[str] | None = Field(default=None, max_length=20)
    position3d: Position3d | None = None
    position2d: Position2d | None = None


def _error(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"code": code, "message": message})


class PinStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        source = PINS_FILE if PINS_FILE.exists() else SEED_FILE
        self._pins: list[dict[str, Any]] = json.loads(source.read_text(encoding="utf-8"))["pins"]

    def _save(self) -> None:
        RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
        tmp = PINS_FILE.with_suffix(".tmp")
        tmp.write_text(json.dumps({"pins": self._pins}, indent=1), encoding="utf-8")
        tmp.replace(PINS_FILE)

    def list(self, crew: str | None, region: str | None, status: str | None) -> list[dict[str, Any]]:
        with self._lock:
            return [
                dict(p) for p in self._pins
                if (not crew or p["crewId"] == crew)
                and (not region or p["regionId"] == region)
                and (not status or p["status"] == status)
            ]

    def create(self, data: dict[str, Any]) -> dict[str, Any]:
        now = now_iso()
        pin = {**data, "id": f"p-{uuid.uuid4().hex[:10]}", "createdAt": now, "updatedAt": now}
        with self._lock:
            self._pins.append(pin)
            self._save()
        return dict(pin)

    def update(self, pin_id: str, patch: dict[str, Any]) -> dict[str, Any] | None:
        with self._lock:
            for i, p in enumerate(self._pins):
                if p["id"] == pin_id:
                    self._pins[i] = {**p, **patch, "updatedAt": now_iso()}
                    self._save()
                    return dict(self._pins[i])
        return None

    def delete(self, pin_id: str) -> bool:
        with self._lock:
            before = len(self._pins)
            self._pins = [p for p in self._pins if p["id"] != pin_id]
            if len(self._pins) == before:
                return False
            self._save()
            return True


pins = PinStore()


@router.get("/regions")
async def regions():
    return json.loads(REGIONS_FILE.read_text(encoding="utf-8"))


@router.get("/regions/{region_id}/references")
async def region_references(region_id: str, crew: str | None = None):
    # Pin notes only: there is no server health log or region-to-evidence mapping yet.
    refs = [
        {
            "kind": "pin_note",
            "id": f"note-{p['id']}",
            "title": f"{p['title']} — {p['note'][:90]}{'…' if len(p['note']) > 90 else ''}",
            "at": p["updatedAt"],
            "href": f"/anatomy?crew={p['crewId']}&region={p['regionId']}&pin={p['id']}",
        }
        for p in pins.list(crew, region_id, None)
        if p.get("note", "").strip()
    ]
    return sorted(refs, key=lambda r: r["at"] or "", reverse=True)


@router.get("/pins")
async def list_pins(crew: str | None = None, region: str | None = None, status: str | None = None):
    return pins.list(crew, region, status)


@router.post("/pins", status_code=201)
async def create_pin(body: PinIn):
    return pins.create(body.model_dump(exclude_none=True))


@router.patch("/pins/{pin_id}")
async def update_pin(pin_id: str, body: PinPatch):
    pin = pins.update(pin_id, body.model_dump(exclude_unset=True))
    return pin if pin else _error(404, "pin_not_found", f"Pin {pin_id} does not exist.")


@router.delete("/pins/{pin_id}", status_code=204)
async def delete_pin(pin_id: str):
    if not pins.delete(pin_id):
        return _error(404, "pin_not_found", f"Pin {pin_id} does not exist.")
    return Response(status_code=204)

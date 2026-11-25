"""The website's "Ask the onboard library" panel (ui/onboard-assistant.js).

GET  /api/assistant/status -> {ready, reason?, model}
POST /api/assistant/ask    -> NDJSON lines: {"type":"sources"}, {"type":"text"}...,
                              {"type":"done","covered":bool} or {"type":"error","reason":...}

Answers come only from the Evidence library passages found for the question, via the
local Ollama model. If nothing in the library matches, the model is not called and the
answer is marked as not covered. Nothing leaves this machine.
"""

import json
from typing import Any, AsyncIterator, Literal

import httpx
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from .config import LLM_MODEL, OLLAMA_URL
from .store import store
from .evidence_guidance import HISTORICAL_GUIDANCE

router = APIRouter(prefix="/api/assistant")

MAX_PASSAGES = 4

STYLES = {
    "summary": "Start with one plain summary sentence, then 2 to 5 short bullet points starting with '- '.",
    "paragraphs": "Write one or two short paragraphs. No bullet points.",
    "bullets": "Write only 3 to 6 short bullet points starting with '- '. No introduction.",
}

SYSTEM = (
    "You answer questions from crew members using only the numbered library passages provided. "
    "Cite each claim with the passage number in square brackets, like [1] or [1, 3]. "
    "If the passages do not answer the question, say so plainly instead of guessing. "
    "Never add facts, numbers or advice that are not in the passages. "
    "Do not diagnose or give medical instructions; this is background reading, not clinical advice. "
    "Use plain, everyday words. " + HISTORICAL_GUIDANCE
)


class AskIn(BaseModel):
    question: str = Field(min_length=1, max_length=500)
    style: Literal["summary", "paragraphs", "bullets"] = "summary"


async def _status() -> dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=1.5) as client:
            tags = (await client.get(f"{OLLAMA_URL}/api/tags")).json()
    except (httpx.HTTPError, ValueError):
        return {"ready": False, "reason": "ollama-offline", "model": LLM_MODEL}
    names = {m.get("name") for m in tags.get("models", [])} | {m.get("model") for m in tags.get("models", [])}
    if LLM_MODEL not in names:
        return {"ready": False, "reason": "model-missing", "model": LLM_MODEL}
    return {"ready": True, "model": LLM_MODEL}


@router.get("/status")
async def status():
    return await _status()


def _sources(question: str) -> list[dict[str, Any]]:
    out = []
    hits = store.search_evidence(question, MAX_PASSAGES)
    # Keyword search: a passage matching far fewer words than the best one is noise.
    best = hits[0]["score"] if hits else 0
    for hit in (h for h in hits if h["score"] >= best * 0.6):
        entry = store.library.get((hit["documentId"], hit["chunkId"]))
        if not entry:
            continue
        out.append({
            "n": len(out) + 1,
            "title": entry["title"],
            "section": entry["topic"],
            "evidence": entry["evidence"],
            "text": entry["excerpt"],
            "sources": [{"cite": s["cite"], "url": s["url"]} for s in entry["sources"]],
        })
    return out


def _line(part: dict[str, Any]) -> bytes:
    return (json.dumps(part, ensure_ascii=False) + "\n").encode("utf-8")


async def _answer(body: AskIn) -> AsyncIterator[bytes]:
    sources = _sources(body.question)
    yield _line({"type": "sources", "sources": sources})
    if not sources:
        yield _line({"type": "done", "covered": False})
        return
    passages = "\n\n".join(f"[{s['n']}] {s['title']}\n{s['text']}" for s in sources)
    messages = [
        {"role": "system", "content": f"{SYSTEM} {STYLES[body.style]}"},
        # Passages are data, not instructions.
        {"role": "user", "content": f"<passages>\n{passages}\n</passages>\n\nQuestion: {body.question}"},
    ]
    request = {"model": LLM_MODEL, "messages": messages, "stream": True, "think": False, "keep_alive": "30m"}
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(120, connect=3)) as client:
            async with client.stream("POST", f"{OLLAMA_URL}/api/chat", json=request) as response:
                if response.status_code == 404:
                    yield _line({"type": "error", "reason": "model-missing"})
                    return
                if response.status_code != 200:
                    yield _line({"type": "error", "reason": "ollama-error"})
                    return
                async for raw in response.aiter_lines():
                    if not raw.strip():
                        continue
                    part = json.loads(raw)
                    if part.get("error"):
                        yield _line({"type": "error", "reason": "ollama-error"})
                        return
                    text = part.get("message", {}).get("content", "")
                    if text:
                        yield _line({"type": "text", "text": text})
                    if part.get("done"):
                        break
    except httpx.ConnectError:
        yield _line({"type": "error", "reason": "ollama-offline"})
        return
    except (httpx.HTTPError, ValueError):
        yield _line({"type": "error", "reason": "ollama-error"})
        return
    yield _line({"type": "done", "covered": True})


@router.post("/ask")
async def ask(body: AskIn):
    return StreamingResponse(_answer(body), media_type="application/x-ndjson", headers={"Cache-Control": "no-store"})

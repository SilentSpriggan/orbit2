"""FastAPI app: the /api/* contract the ORBIT frontend expects, plus the built SPA."""

import asyncio
import io
import socket
from contextlib import asynccontextmanager
from typing import Any

import numpy as np
import soundfile as sf
from fastapi import BackgroundTasks, FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from loguru import logger
from pipecat.transports.smallwebrtc.request_handler import (
    IceCandidate,
    SmallWebRTCPatchRequest,
    SmallWebRTCRequest,
    SmallWebRTCRequestHandler,
)
from pydantic import BaseModel, Field

from . import config
from .anatomy import router as anatomy_router
from .onboard_library import router as onboard_library_router
from .certs import cert_expiry, lan_ip
from .health import ollama_state, pipeline_health
from .store import VITAL_META, now_iso, store
from .voice import is_live_session, refresh_session_prompt, run_bot, warm_up_session_prompt
from .voice_settings import SPEED_RANGE, VOICE_IDS, VOICES, VoiceSettings, load_settings, save_settings

webrtc = SmallWebRTCRequestHandler()  # no ICE servers: host candidates only, local network


@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(warm_up_session_prompt())
    yield
    await webrtc.close()


app = FastAPI(title="ORBIT local server", lifespan=lifespan, docs_url=None, redoc_url=None)


def api_error(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"code": code, "message": message})


# --------------------------------------------------------------------- system


@app.get("/api/system/status")
async def system_status():
    ip = lan_ip()
    return {
        "network": {
            "mode": "https_lan" if ip else "offline_local",
            "host": socket.gethostname(),
            "lanIp": ip,
            "ssid": None,
            "certExpiresAt": cert_expiry(),
        },
        "ollama": {"state": await ollama_state(), "model": config.LLM_MODEL, "loadProgress": None},
        "faiss": {
            # There is no FAISS index yet; evidence search is keyword matching over the
            # local passages. Report the index as missing rather than claim one exists.
            "state": "missing",
            "documentCount": store.document_count,
            "chunkCount": len(store.evidence),
            "buildProgress": None,
            "updatedAt": store.evidence_updated_at,
        },
        "serverTime": now_iso(),
    }


# ----------------------------------------------------------------------- crew


@app.get("/api/crew")
async def list_crew():
    return store.crew


@app.get("/api/crew/{crew_id}/summary")
async def crew_summary(crew_id: str):
    if not store.get_crew(crew_id):
        return api_error(404, "crew_not_found", f"No crew member {crew_id}.")
    return store.summary(crew_id)


class VitalIn(BaseModel):
    kind: str
    value: float
    unit: str | None = None
    recordedAt: str | None = None
    source: str | None = None


@app.post("/api/crew/{crew_id}/vitals")
async def save_vital(crew_id: str, body: VitalIn):
    if not store.get_crew(crew_id):
        return api_error(404, "crew_not_found", f"No crew member {crew_id}.")
    meta = VITAL_META.get(body.kind)
    if meta and body.unit and body.unit.lower() != meta["unit"].lower():
        return api_error(422, "invalid_unit", f"Expected {meta['unit']}, got {body.unit}.")
    try:
        return store.add_vital(crew_id, body.kind, body.value, body.recordedAt)
    except ValueError as e:
        return api_error(422, "invalid_vital", str(e))


# ------------------------------------------------------------------- evidence


class SearchIn(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    k: int = Field(3, ge=1, le=10)


@app.post("/api/evidence/search")
async def evidence_search(body: SearchIn):
    return {"chunks": store.search_evidence(body.query, body.k)}


# ----------------------------------------------------- shared assistant context


class ShareIn(BaseModel):
    sessionId: str = Field(min_length=1)
    crewId: str
    sections: list[str]
    content: dict[str, Any]


@app.post("/api/assistant/context")
async def share_context(body: ShareIn):
    if not store.get_crew(body.crewId):
        return api_error(404, "crew_not_found", f"No crew member {body.crewId}.")
    if not is_live_session(body.sessionId):
        return api_error(409, "session_not_active", "Records can only be shared with an active voice session.")
    shared_at = now_iso()
    store.shared_context.setdefault(body.sessionId, []).append(
        {"crewId": body.crewId, "sections": body.sections, "content": body.content, "sharedAt": shared_at}
    )
    await refresh_session_prompt(body.sessionId)
    return {"sharedAt": shared_at}


@app.delete("/api/assistant/context", status_code=204)
async def clear_context(sessionId: str):
    """Forget what was shared with one session. Records also go when the session ends."""
    store.shared_context.pop(sessionId, None)
    await refresh_session_prompt(sessionId)
    return Response(status_code=204)


# ---------------------------------------------------------------------- voice


@app.get("/api/voice/config")
async def voice_config():
    return {
        "voices": VOICES,
        "defaults": load_settings().model_dump(),
        "capabilities": {
            "supportsBlend": False,
            "speedRange": list(SPEED_RANGE),
            "sttModel": f"faster-whisper {config.STT_MODEL}",
            "llmModel": config.LLM_MODEL,
            "ttsModel": "Kokoro-82M",
            # Not Smart Turn: a fixed silence timer decides when the person has finished.
            "turnDetection": f"Silence timer · {config.SILENCE_SECONDS:g} s",
        },
        "pipelineHealth": await pipeline_health(),
    }


@app.put("/api/voice/settings")
async def put_voice_settings(body: VoiceSettings):
    try:
        return save_settings(body).model_dump()
    except ValueError as e:
        return api_error(422, "invalid_settings", str(e))


_preview_kokoro = None


def _synth_wav(voice_id: str, speed: float) -> bytes:
    global _preview_kokoro
    if _preview_kokoro is None:
        from kokoro_onnx import Kokoro

        model, voices = config.kokoro_paths()
        _preview_kokoro = Kokoro(str(model), str(voices))
    lang = "en-gb" if voice_id.startswith("b") else "en-us"
    samples, sr = _preview_kokoro.create(
        "This is how I sound in the ORBIT console.", voice=voice_id, speed=speed, lang=lang
    )
    buf = io.BytesIO()
    sf.write(buf, np.asarray(samples), sr, format="WAV", subtype="PCM_16")
    return buf.getvalue()


class PreviewIn(BaseModel):
    voiceId: str
    speed: float = Field(1.0, ge=SPEED_RANGE[0], le=SPEED_RANGE[1])


@app.post("/api/voice/preview")
async def voice_preview(body: PreviewIn):
    if body.voiceId not in VOICE_IDS:
        return api_error(422, "unknown_voice", f"Unknown voice: {body.voiceId}")
    wav = await asyncio.to_thread(_synth_wav, body.voiceId, body.speed)
    return Response(content=wav, media_type="audio/wav")


@app.post("/api/voice/offer")
async def voice_offer(request: Request, background_tasks: BackgroundTasks):
    """WebRTC signaling: SDP offer in, SDP answer out. Starts the pipeline for new connections."""
    body = await request.json()

    async def on_connection(connection):
        background_tasks.add_task(run_bot, connection)

    try:
        answer = await webrtc.handle_web_request(SmallWebRTCRequest.from_dict(body), on_connection)
    except Exception as e:  # noqa: BLE001
        logger.exception("Offer failed")
        return api_error(400, "offer_failed", str(e))
    return answer


@app.patch("/api/voice/offer")
async def voice_ice_candidates(request: Request):
    body = await request.json()
    await webrtc.handle_patch_request(
        SmallWebRTCPatchRequest(
            pc_id=body["pc_id"],
            candidates=[IceCandidate(**c) for c in body.get("candidates", [])],
        )
    )
    return {"status": "ok"}


# Registered before the catch-all below, which answers every other /api/* with 404.
app.include_router(anatomy_router)
app.include_router(onboard_library_router)


@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def api_not_found(path: str):
    return api_error(404, "not_found", f"No API route /api/{path}.")


# ------------------------------------------------------------- built frontend

if config.DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=config.DIST_DIR / "assets"), name="assets")

    @app.get("/{path:path}")
    async def spa(path: str):
        file = (config.DIST_DIR / path).resolve()
        if path and file.is_file() and config.DIST_DIR.resolve() in file.parents:
            return FileResponse(file)
        entry = "voice/index.html" if path == "voice" or path.startswith("voice/") else "index.html"
        return FileResponse(config.DIST_DIR / entry)
else:

    @app.get("/")
    async def no_build():
        return JSONResponse(
            {"message": "API is running. Run `npm run build` to serve the console here, or use `npm run dev`."}
        )


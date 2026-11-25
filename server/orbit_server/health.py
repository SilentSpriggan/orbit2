"""Readiness of each pipeline stage, checked locally (no network calls beyond localhost)."""

import httpx
from huggingface_hub import try_to_load_from_cache

from .config import LLM_MODEL, OLLAMA_URL, STT_MODEL, kokoro_paths


async def ollama_state() -> str:
    """'ready' when Ollama answers and has the model, else 'unavailable'."""
    try:
        async with httpx.AsyncClient(timeout=1.5) as client:
            tags = (await client.get(f"{OLLAMA_URL}/api/tags")).json()
    except (httpx.HTTPError, ValueError):
        return "unavailable"
    names = {m.get("name") for m in tags.get("models", [])} | {m.get("model") for m in tags.get("models", [])}
    return "ready" if LLM_MODEL in names else "unavailable"


def stt_state() -> str:
    cached = try_to_load_from_cache(f"Systran/faster-whisper-{STT_MODEL}", "model.bin")
    return "ready" if isinstance(cached, str) else "unavailable"


def tts_state() -> str:
    model, voices = kokoro_paths()
    return "ready" if model.exists() and voices.exists() else "unavailable"


async def pipeline_health() -> dict[str, str]:
    return {
        "stt": stt_state(),
        "llm": await ollama_state(),
        "tts": tts_state(),
        "vad": "ready",  # Silero ships inside pipecat
        "turn": "ready",  # fixed-silence end of turn, no model needed
    }


async def warm_up_llm(system_prompt: str | None = None, tools: list[dict] | None = None) -> None:
    """Load the model and pre-process the session's prompt so the first reply is fast.

    Ollama caches the processed prompt prefix. With the same system prompt and tools as
    the real session, the first turn skips ~4 s of prompt processing. Errors are ignored.
    """
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            await client.post(f"{OLLAMA_URL}/api/generate", json={"model": LLM_MODEL, "keep_alive": "30m"})
            if system_prompt:
                body = {
                    "model": LLM_MODEL,
                    "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": "Hi"}],
                    "max_tokens": 1,
                    "reasoning_effort": "none",
                }
                if tools:
                    body["tools"] = tools
                await client.post(f"{OLLAMA_URL}/v1/chat/completions", json=body)
    except httpx.HTTPError:
        pass

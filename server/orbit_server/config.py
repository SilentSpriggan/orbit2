"""Server settings. Every value can be overridden in server/.env (see .env.example)."""

import os
from pathlib import Path

from dotenv import load_dotenv

SERVER_DIR = Path(__file__).resolve().parent.parent
REPO_DIR = SERVER_DIR.parent

load_dotenv(SERVER_DIR / ".env")

# Local-first: never reach Hugging Face at runtime; models must already be cached.
# Set ORBIT_ALLOW_DOWNLOADS=1 once (with internet) to fetch missing models.
if os.getenv("ORBIT_ALLOW_DOWNLOADS") != "1":
    os.environ.setdefault("HF_HUB_OFFLINE", "1")
    os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

HOST = os.getenv("ORBIT_HOST", "0.0.0.0")
PORT = int(os.getenv("ORBIT_PORT", "8443"))

DIST_DIR = REPO_DIR / "dist"
DATA_DIR = SERVER_DIR / "data"
RUNTIME_DIR = DATA_DIR / "runtime"
CERT_DIR = SERVER_DIR / "certs"

OLLAMA_URL = os.getenv("ORBIT_OLLAMA_URL", "http://localhost:11434").rstrip("/")
LLM_MODEL = os.getenv("ORBIT_LLM_MODEL", "qwen3:8b")

# faster-whisper model name ("base.en" is fast; "small.en" is more accurate but ~2 s slower per turn on CPU)
STT_MODEL = os.getenv("ORBIT_STT_MODEL", "base.en")

# Kokoro model files. Leave empty to use Pipecat's cache (~/.cache/pipecat/kokoro-onnx).
KOKORO_MODEL_PATH = os.getenv("ORBIT_KOKORO_MODEL") or None
KOKORO_VOICES_PATH = os.getenv("ORBIT_KOKORO_VOICES") or None

# Seconds of silence after the user stops talking before the assistant replies.
SILENCE_SECONDS = float(os.getenv("ORBIT_SILENCE_SECONDS", "1.0"))
VAD_STOP_SECS = 0.2

GREETING = os.getenv("ORBIT_GREETING", "Hi, I'm the ORBIT crew assistant. What do you need?")


def kokoro_paths() -> tuple[Path, Path]:
    """Resolved Kokoro model and voices paths (explicit setting, else Pipecat's cache)."""
    cache = Path.home() / ".cache" / "pipecat" / "kokoro-onnx"
    model = Path(KOKORO_MODEL_PATH) if KOKORO_MODEL_PATH else cache / "kokoro-v1.0.onnx"
    voices = Path(KOKORO_VOICES_PATH) if KOKORO_VOICES_PATH else cache / "voices-v1.0.bin"
    return model, voices

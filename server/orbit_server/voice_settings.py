"""Voice settings shared by the REST API and live sessions (persisted to data/runtime/)."""

import json
from typing import Literal

from pydantic import BaseModel, Field

from .config import RUNTIME_DIR

SPEED_RANGE = (0.7, 1.4)

VOICES = [
    {"id": "af_heart", "label": "Heart", "language": "English · US", "gender": "female"},
    {"id": "af_bella", "label": "Bella", "language": "English · US", "gender": "female"},
    {"id": "af_nicole", "label": "Nicole", "language": "English · US", "gender": "female"},
    {"id": "am_michael", "label": "Michael", "language": "English · US", "gender": "male"},
    {"id": "am_adam", "label": "Adam", "language": "English · US", "gender": "male"},
    {"id": "bf_emma", "label": "Emma", "language": "English · UK", "gender": "female"},
    {"id": "bf_isabella", "label": "Isabella", "language": "English · UK", "gender": "female"},
    {"id": "bm_george", "label": "George", "language": "English · UK", "gender": "male"},
]
VOICE_IDS = {v["id"] for v in VOICES}


class Blend(BaseModel):
    voiceId: str
    ratio: float = Field(ge=0, le=1)


class VoiceSettings(BaseModel):
    voiceId: str = "af_heart"
    speed: float = Field(1.0, ge=SPEED_RANGE[0], le=SPEED_RANGE[1])
    blend: Blend | None = None
    volume: float = Field(0.9, ge=0, le=1)
    vadSensitivity: Literal["low", "medium", "high"] = "medium"
    endOfTurnThreshold: float = Field(0.5, ge=0, le=1)
    allowInterruptions: bool = True
    responseLength: Literal["concise", "standard"] = "concise"


# Silero VAD confidence per sensitivity: higher sensitivity = lower threshold.
VAD_CONFIDENCE = {"low": 0.85, "medium": 0.7, "high": 0.5}

_FILE = RUNTIME_DIR / "voice_settings.json"


def load_settings() -> VoiceSettings:
    try:
        return VoiceSettings.model_validate_json(_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return VoiceSettings()


def save_settings(s: VoiceSettings) -> VoiceSettings:
    if s.voiceId not in VOICE_IDS:
        raise ValueError(f"Unknown voice: {s.voiceId}")
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    _FILE.write_text(json.dumps(s.model_dump(), indent=2), encoding="utf-8")
    return s

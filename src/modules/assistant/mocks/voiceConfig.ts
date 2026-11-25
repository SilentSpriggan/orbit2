import type { VoiceConfig } from "../types";

/** Kokoro voices available on the local server (synthetic demo config). */
export const MOCK_VOICE_CONFIG: VoiceConfig = {
  voices: [
    { id: "af_heart", label: "Heart", language: "English · US", gender: "female" },
    { id: "af_bella", label: "Bella", language: "English · US", gender: "female" },
    { id: "af_nicole", label: "Nicole", language: "English · US", gender: "female" },
    { id: "am_michael", label: "Michael", language: "English · US", gender: "male" },
    { id: "am_adam", label: "Adam", language: "English · US", gender: "male" },
    { id: "bf_emma", label: "Emma", language: "English · UK", gender: "female" },
    { id: "bf_isabella", label: "Isabella", language: "English · UK", gender: "female" },
    { id: "bm_george", label: "George", language: "English · UK", gender: "male" },
  ],
  defaults: {
    voiceId: "af_heart",
    speed: 1,
    blend: null,
    volume: 0.9,
    vadSensitivity: "medium",
    endOfTurnThreshold: 0.5,
    allowInterruptions: true,
    responseLength: "concise",
  },
  capabilities: {
    supportsBlend: true,
    speedRange: [0.7, 1.4],
    sttModel: "faster-whisper small.en",
    llmModel: "qwen3:8b",
    ttsModel: "Kokoro-82M",
    turnDetection: "Smart Turn v3",
  },
  pipelineHealth: { stt: "ready", llm: "ready", tts: "ready", vad: "ready", turn: "ready" },
};

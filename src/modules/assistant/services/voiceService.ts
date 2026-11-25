import { apiGet, apiSend } from "../../../shared/api/client";
import { withMock } from "../../../shared/api/mockMode";
import { MOCK_VOICE_CONFIG } from "../mocks/voiceConfig";
import { synthPreviewWav } from "../mocks/wav";
import type { VoiceConfig, VoiceSettings } from "../types";

let mockSaved: VoiceSettings | null = null;

export function getVoiceConfig(signal?: AbortSignal): Promise<VoiceConfig> {
  return withMock(
    () => apiGet<VoiceConfig>("/api/voice/config", { signal }),
    () => ({ ...MOCK_VOICE_CONFIG, defaults: mockSaved ?? MOCK_VOICE_CONFIG.defaults }),
    300,
    signal,
  );
}

export function saveVoiceSettings(s: VoiceSettings, signal?: AbortSignal): Promise<VoiceSettings> {
  return withMock(
    () => apiSend<VoiceSettings>("PUT", "/api/voice/settings", s, { signal }),
    () => {
      mockSaved = { ...s };
      return mockSaved;
    },
    250,
    signal,
  );
}

/** Returns a locally generated audio/wav sample. */
export function previewVoice(voiceId: string, speed: number, signal?: AbortSignal): Promise<Blob> {
  return withMock(
    () => apiSend<Blob>("POST", "/api/voice/preview", { voiceId, speed }, { signal, timeoutMs: 15_000 }),
    () => synthPreviewWav(voiceId, speed),
    350,
    signal,
  );
}

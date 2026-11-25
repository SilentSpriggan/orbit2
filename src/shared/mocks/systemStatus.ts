import type { SystemStatus } from "../types";

const BASE: SystemStatus = {
  network: {
    mode: "https_lan",
    host: "orbit.local",
    lanIp: "192.168.50.1",
    ssid: "ORBIT-HAB",
    certExpiresAt: "2027-11-14T00:00:00Z",
  },
  ollama: { state: "ready", model: "qwen3:8b", loadProgress: null },
  faiss: {
    state: "ready",
    documentCount: 214,
    chunkCount: 12480,
    buildProgress: null,
    updatedAt: "2026-11-14T09:12:00Z",
  },
  serverTime: "2026-11-14T14:05:00Z",
};

function clone(s: SystemStatus): SystemStatus {
  return {
    network: { ...s.network },
    ollama: { ...s.ollama },
    faiss: { ...s.faiss },
    serverTime: s.serverTime,
  };
}

/** Each step changes one subsystem so every chip state can be checked visually. */
const STEPS: Array<(s: SystemStatus) => void> = [
  () => {},
  (s) => { s.network = { ...s.network, mode: "offline_local", ssid: null }; },
  (s) => { s.network = { ...s.network, mode: "cert_untrusted" }; },
  (s) => { s.network = { ...s.network, mode: "unreachable", lanIp: null }; },
  (s) => { s.ollama = { ...s.ollama, state: "loading", loadProgress: 62 }; },
  (s) => { s.ollama = { ...s.ollama, state: "unavailable", loadProgress: null }; },
  (s) => { s.faiss = { ...s.faiss, state: "building", buildProgress: 48 }; },
  (s) => { s.faiss = { ...s.faiss, state: "missing", chunkCount: 0, documentCount: 0, updatedAt: null }; },
];

let step = 0;
// Module 4: the simulated rebuild temporarily disables semantic search.
let indexRebuildUntil = 0;
export function setMockIndexRebuild(durationMs: number): void {
  indexRebuildUntil = durationMs ? Date.now() + durationMs : 0;
}

/** Current mock status (server time is always "now"). */
export function getMockSystemStatus(): SystemStatus {
  const s = clone(BASE);
  STEPS[step]?.(s);
  if (Date.now() < indexRebuildUntil) {
    s.faiss = { ...s.faiss, state: "building", buildProgress: Math.round(100 * (1 - (indexRebuildUntil - Date.now()) / 30_000)) };
  }
  s.serverTime = new Date().toISOString();
  return s;
}

/** Dev helper: advance to the next status variant. Returns the new status. */
export function cycleMockStatus(): SystemStatus {
  step = (step + 1) % STEPS.length;
  return getMockSystemStatus();
}

export const MOCK_SYSTEM_STATUS: SystemStatus = BASE;

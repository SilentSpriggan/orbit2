import { apiGet, apiSend } from "../../../shared/api/client";
import { withMock } from "../../../shared/api/mockMode";
import { MOCK_EVIDENCE, MOCK_SUMMARIES } from "../mocks/data";

export type VitalKind = "heart_rate" | "spo2" | "systolic_bp" | "diastolic_bp" | "temperature" | "respiratory_rate";

export const VITAL_META: Record<VitalKind, { label: string; unit: string; min: number; max: number }> = {
  heart_rate: { label: "heart rate", unit: "bpm", min: 20, max: 250 },
  spo2: { label: "SpO₂", unit: "%", min: 50, max: 100 },
  systolic_bp: { label: "systolic blood pressure", unit: "mmHg", min: 50, max: 260 },
  diastolic_bp: { label: "diastolic blood pressure", unit: "mmHg", min: 20, max: 160 },
  temperature: { label: "temperature", unit: "°C", min: 30, max: 43 },
  respiratory_rate: { label: "respiratory rate", unit: "/min", min: 4, max: 60 },
};

export interface VitalDraft {
  crewId: string;
  kind: VitalKind;
  value: number;
  unit: string;
  recordedAt: string;
}

export interface SavedVital extends VitalDraft {
  id: string;
  source: "assistant";
}

export interface CrewReading {
  kind: string;
  label: string;
  value: number;
  unit: string;
  recordedAt: string;
  source: string;
}

export interface CrewSummary {
  crewId: string;
  readings: CrewReading[];
  wellbeing: { checkInAt: string; mood: string; stress: string; note: string | null } | null;
}

export interface EvidenceChunk {
  documentId: string;
  chunkId: string;
  title: string;
  excerpt: string;
  score: number;
}

export function logVital(draft: VitalDraft, signal?: AbortSignal): Promise<SavedVital> {
  return withMock(
    () => apiSend<SavedVital>("POST", `/api/crew/${encodeURIComponent(draft.crewId)}/vitals`, { ...draft, source: "assistant" }, { signal }),
    () => ({ ...draft, id: `v-${Date.now().toString(36)}`, source: "assistant" as const }),
    300,
    signal,
  );
}

export function getCrewSummary(crewId: string, signal?: AbortSignal): Promise<CrewSummary> {
  return withMock(
    () => apiGet<CrewSummary>(`/api/crew/${encodeURIComponent(crewId)}/summary`, { signal }),
    () => MOCK_SUMMARIES[crewId] ?? { crewId, readings: [], wellbeing: null },
    250,
    signal,
  );
}

export function searchEvidence(query: string, k = 3, signal?: AbortSignal): Promise<EvidenceChunk[]> {
  return withMock(
    async () => (await apiSend<{ chunks: EvidenceChunk[] }>("POST", "/api/evidence/search", { query, k }, { signal })).chunks,
    () => {
      const q = query.toLowerCase();
      const hits = /bone|skelet|osteo|density/.test(q) ? MOCK_EVIDENCE : MOCK_EVIDENCE.filter((c) => c.excerpt.toLowerCase().includes(q));
      return hits.slice(0, k);
    },
    700,
    signal,
  );
}

export interface SharePayload {
  /** The voice session the record is shared with; the server forgets it when that session ends. */
  sessionId: string;
  crewId: string;
  sections: string[];
  content: Record<string, unknown>;
}

/** Adds a reviewed record to the local assistant's context. It never leaves this network. */
export function shareRecordWithAssistant(payload: SharePayload, signal?: AbortSignal): Promise<{ sharedAt: string }> {
  return withMock(
    () => apiSend<{ sharedAt: string }>("POST", "/api/assistant/context", payload, { signal }),
    () => ({ sharedAt: new Date().toISOString() }),
    300,
    signal,
  );
}

/** Removes the records shared with one voice session (crew changed or session ended). */
export function clearAssistantContext(sessionId: string, signal?: AbortSignal): Promise<void> {
  return withMock(
    () => apiSend<void>("DELETE", `/api/assistant/context?sessionId=${encodeURIComponent(sessionId)}`, undefined, { signal }),
    () => undefined,
    100,
    signal,
  );
}

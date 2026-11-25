import { apiGet, apiSend } from "../../../shared/api/client";
import { withMock } from "../../../shared/api/mockMode";
import { alerts, store, summaries, visible } from "../mocks/store";
import type {
  CrewHealthSummary,
  HealthAlert,
  ReviewBand,
  VitalKind,
  VitalReading,
} from "../types";
export interface Range {
  kinds?: VitalKind[];
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
}
const opts = (viewer: string, signal?: AbortSignal) => ({
  signal,
  headers: { "X-Orbit-Viewer": viewer },
});
const path = (id: string) => `/api/crew/${encodeURIComponent(id)}`;
export function listSummaries(viewer: string, signal?: AbortSignal) {
  return withMock(
    () =>
      apiGet<CrewHealthSummary[]>("/api/crew/summaries", opts(viewer, signal)),
    () => summaries(viewer),
    250,
    signal,
  );
}
export function listReadings(
  id: string,
  range: Range,
  viewer: string,
  signal?: AbortSignal,
) {
  const query = new URLSearchParams();
  Object.entries(range).forEach(([k, v]) => {
    if (v !== undefined) query.set(k, String(v));
  });
  return withMock(
    () =>
      apiGet<{ items: VitalReading[]; nextCursor: string | null }>(
        `${path(id)}/vitals?${query}`,
        opts(viewer, signal),
      ),
    () => {
      const rows = store.readings.filter(
        (r) =>
          r.crewId === id &&
          visible(r, viewer) &&
          (!range.kinds || range.kinds.includes(r.kind)) &&
          (!range.from || r.recordedAt >= range.from) &&
          (!range.to || r.recordedAt <= range.to),
      );
      const start = Number(range.cursor ?? 0),
        limit = range.limit ?? rows.length;
      return {
        items: rows.slice(start, start + limit),
        nextCursor: start + limit < rows.length ? String(start + limit) : null,
      };
    },
    250,
    signal,
  );
}
export function createReading(
  id: string,
  input: Omit<VitalReading, "id" | "crewId">,
  viewer: string,
  signal?: AbortSignal,
) {
  return withMock(
    () =>
      apiSend<VitalReading>(
        "POST",
        `${path(id)}/vitals`,
        input,
        opts(viewer, signal),
      ),
    () => {
      const r = { ...input, id: crypto.randomUUID(), crewId: id };
      store.readings.push(r);
      store.readings.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
      return r;
    },
    250,
    signal,
  );
}
export function deleteReading(
  id: string,
  readingId: string,
  viewer: string,
  signal?: AbortSignal,
) {
  return withMock(
    () =>
      apiSend<void>(
        "DELETE",
        `${path(id)}/vitals/${encodeURIComponent(readingId)}`,
        undefined,
        opts(viewer, signal),
      ),
    () => {
      store.readings = store.readings.filter(
        (r) => !(r.id === readingId && r.crewId === id),
      );
    },
    250,
    signal,
  );
}
export function getBands(id: string, viewer: string, signal?: AbortSignal) {
  return withMock(
    () => apiGet<ReviewBand[]>(`${path(id)}/bands`, opts(viewer, signal)),
    () => structuredClone(store.bands[id] ?? []),
    250,
    signal,
  );
}
export function updateBands(
  id: string,
  bands: ReviewBand[],
  viewer: string,
  signal?: AbortSignal,
) {
  return withMock(
    () =>
      apiSend<ReviewBand[]>(
        "PUT",
        `${path(id)}/bands`,
        bands,
        opts(viewer, signal),
      ),
    () => {
      store.bands[id] = structuredClone(bands);
      return bands;
    },
    250,
    signal,
  );
}
export function listAlerts(viewer: string, signal?: AbortSignal) {
  return withMock(
    () => apiGet<HealthAlert[]>("/api/alerts", opts(viewer, signal)),
    () => alerts(),
    250,
    signal,
  );
}
export function acknowledgeAlert(
  id: string,
  viewer: string,
  signal?: AbortSignal,
) {
  return withMock(
    () =>
      apiSend<HealthAlert>(
        "POST",
        `/api/alerts/${encodeURIComponent(id)}/ack`,
        { byCrewId: viewer },
        opts(viewer, signal),
      ),
    () => {
      store.acknowledgements[id] = {
        acknowledgedBy: viewer,
        acknowledgedAt: new Date().toISOString(),
      };
      return alerts().find((a) => a.id === id)!;
    },
    250,
    signal,
  );
}

import { apiGet, apiSend } from "../../../shared/api/client";
import { withMock } from "../../../shared/api/mockMode";
import { mockCreatePin, mockDeletePin, mockListPins, mockUpdatePin } from "../mocks/pinStore";
import { MOCK_REFERENCES } from "../mocks/references";
import regionsJson from "../mocks/regions.json";
import { parseRegions } from "../lib/regionIndex";
import type { AnatomyPin, AnatomyRegion, PinFilter, PinInput, PinPatch, RegionReference } from "../types";

/** Bump when the region catalogue changes; the response is cached forever per version. */
export const REGIONS_VERSION = "2026.11.1";

let regionsCache: Promise<AnatomyRegion[]> | null = null;

/** GET /api/anatomy/regions — cached for the page lifetime (versioned on the server). */
export function getRegions(): Promise<AnatomyRegion[]> {
  if (!regionsCache) {
    regionsCache = withMock(
      async () => parseRegions(await apiGet<unknown>(`/api/anatomy/regions?v=${REGIONS_VERSION}`)),
      () => parseRegions(regionsJson),
      200,
    );
    // A failed load must not stick: let the next caller try again.
    regionsCache.catch(() => { regionsCache = null; });
  }
  return regionsCache;
}

function query(params: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function listPins(filter: PinFilter = {}, signal?: AbortSignal): Promise<AnatomyPin[]> {
  return withMock(
    () => apiGet<AnatomyPin[]>(`/api/anatomy/pins${query({ crew: filter.crewId, region: filter.regionId, status: filter.status })}`, { signal }),
    () => mockListPins(filter),
    250,
    signal,
  );
}

export function createPin(input: PinInput, signal?: AbortSignal): Promise<AnatomyPin> {
  return withMock(() => apiSend<AnatomyPin>("POST", "/api/anatomy/pins", input, { signal }), () => mockCreatePin(input), 300, signal);
}

export function updatePin(id: string, patch: PinPatch, signal?: AbortSignal): Promise<AnatomyPin> {
  return withMock(
    () => apiSend<AnatomyPin>("PATCH", `/api/anatomy/pins/${encodeURIComponent(id)}`, patch, { signal }),
    () => mockUpdatePin(id, patch),
    300,
    signal,
  );
}

export function deletePin(id: string, signal?: AbortSignal): Promise<void> {
  return withMock(
    () => apiSend<void>("DELETE", `/api/anatomy/pins/${encodeURIComponent(id)}`, undefined, { signal }),
    () => mockDeletePin(id),
    300,
    signal,
  );
}

export function getRegionReferences(regionId: string, crewId: string, signal?: AbortSignal): Promise<RegionReference[]> {
  return withMock(
    () => apiGet<RegionReference[]>(`/api/anatomy/regions/${encodeURIComponent(regionId)}/references${query({ crew: crewId })}`, { signal }),
    () => {
      const pins = mockListPins({ crewId, regionId });
      const linkedKinds = new Set(pins.flatMap((p) => p.linkedVitalKinds));
      const notes: RegionReference[] = pins
        .filter((p) => p.note.trim())
        .map((p) => ({
          kind: "pin_note",
          id: `note-${p.id}`,
          title: `${p.title} — ${p.note.length > 90 ? `${p.note.slice(0, 90)}…` : p.note}`,
          at: p.updatedAt,
          href: `/anatomy?crew=${p.crewId}&region=${p.regionId}&pin=${p.id}`,
        }));
      const extra = (MOCK_REFERENCES[regionId] ?? [])
        .filter((r) => r.kind === "evidence" || (r.crewId === crewId && (!r.vitalKind || linkedKinds.has(r.vitalKind))))
        .map(({ kind, id, title, at, href }) => ({ kind, id, title, at, href }));
      return [...notes, ...extra].sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
    },
    250,
    signal,
  );
}

import { BODY_SYSTEMS, type AnatomyRegion, type BodySystem } from "../types";

const SIDES = new Set(["left", "right", "midline"]);

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((s) => typeof s === "string");
}

/** Validate regions.json (or the API response) into typed regions; drops malformed rows. */
export function parseRegions(raw: unknown): AnatomyRegion[] {
  const list: unknown = typeof raw === "object" && raw !== null && "regions" in raw ? (raw as { regions: unknown }).regions : raw;
  if (!Array.isArray(list)) return [];
  const out: AnatomyRegion[] = [];
  for (const item of list) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.name !== "string" || typeof r.description !== "string") continue;
    if (typeof r.system !== "string" || !BODY_SYSTEMS.includes(r.system as BodySystem)) continue;
    const region: AnatomyRegion = {
      id: r.id,
      name: r.name,
      system: r.system as BodySystem,
      parentId: typeof r.parentId === "string" ? r.parentId : null,
      synonyms: isStringArray(r.synonyms) ? r.synonyms : [],
      meshNames: isStringArray(r.meshNames) ? r.meshNames : [r.id],
      description: r.description,
    };
    if (typeof r.svgPathId === "string") region.svgPathId = r.svgPathId;
    if (typeof r.side === "string" && SIDES.has(r.side)) region.side = r.side as AnatomyRegion["side"];
    if (Array.isArray(r.considerations)) {
      region.considerations = r.considerations.flatMap((c: unknown) => {
        if (typeof c !== "object" || c === null) return [];
        const x = c as { text?: unknown; evidenceRef?: { documentId?: unknown; chunkId?: unknown } };
        if (typeof x.text !== "string" || typeof x.evidenceRef?.documentId !== "string" || typeof x.evidenceRef.chunkId !== "string") return [];
        return [{ text: x.text, evidenceRef: { documentId: x.evidenceRef.documentId, chunkId: x.evidenceRef.chunkId } }];
      });
    }
    out.push(region);
  }
  return out;
}

export interface RegionIndex {
  list: AnatomyRegion[];
  byId: Map<string, AnatomyRegion>;
  children: Map<string | null, AnatomyRegion[]>;
  /** GLB node name → region id. */
  byMeshName: Map<string, string>;
}

export function buildRegionIndex(list: AnatomyRegion[]): RegionIndex {
  const byId = new Map(list.map((r) => [r.id, r]));
  const children = new Map<string | null, AnatomyRegion[]>();
  const byMeshName = new Map<string, string>();
  for (const r of list) {
    const parent = r.parentId && byId.has(r.parentId) ? r.parentId : null;
    const bucket = children.get(parent) ?? [];
    bucket.push(r);
    children.set(parent, bucket);
    for (const m of r.meshNames) byMeshName.set(m, r.id);
  }
  return { list, byId, children, byMeshName };
}

/** Region ids of `id` and all of its descendants. */
export function descendantIds(index: RegionIndex, id: string): string[] {
  const out = [id];
  for (let i = 0; i < out.length; i++) {
    for (const c of index.children.get(out[i]) ?? []) out.push(c.id);
  }
  return out;
}

/** Top-level regions of one system (roots of that system's tree). */
export function systemRoots(index: RegionIndex, system: BodySystem): AnatomyRegion[] {
  return (index.children.get(null) ?? []).filter((r) => r.system === system);
}

export interface SearchHit {
  region: AnatomyRegion;
  /** The synonym that matched, when the name did not. */
  matched: string | null;
  score: number;
}

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim();

/** Typeahead over region names and synonyms. */
export function searchRegions(list: AnatomyRegion[], query: string, limit = 8): SearchHit[] {
  const q = norm(query);
  if (!q) return [];
  const words = q.split(" ");
  const hits: SearchHit[] = [];
  for (const region of list) {
    const name = norm(region.name);
    let score = 0;
    let matched: string | null = null;
    if (name === q) score = 100;
    else if (name.startsWith(q)) score = 80;
    else if (words.every((w) => name.includes(w))) score = 60;
    else if (region.id.replace(/_/g, " ").includes(q)) score = 50;
    else {
      for (const syn of region.synonyms) {
        const s = norm(syn);
        const sc = s === q ? 55 : s.startsWith(q) ? 45 : words.every((w) => s.includes(w)) ? 35 : 0;
        if (sc > score) { score = sc; matched = syn; }
      }
    }
    if (score > 0) hits.push({ region, matched, score });
  }
  return hits.sort((a, b) => b.score - a.score || a.region.name.localeCompare(b.region.name)).slice(0, limit);
}

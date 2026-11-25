import type { StatusLevel } from "../../shared/types";

export type EvidenceLabel =
  | "systematic_review"
  | "randomized_trial"
  | "observational"
  | "spaceflight_study"
  | "analog_study"
  | "agency_guidance"
  | "expert_opinion"
  | "product_rule";

export type SourceType =
  "paper" | "agency_report" | "guideline" | "crew_procedure" | "textbook";

export interface EvidenceDocument {
  id: string;
  title: string;
  authors: string[];
  venue: string | null;
  year: number | null;
  doi: string | null;
  url: string | null;
  sourceType: SourceType;
  evidenceLabel: EvidenceLabel;
  topics: string[];
  bodySystems: string[];
  license: string | null;
  addedAt: string;
  chunkCount: number;
  hasOriginalPdf: boolean;
}

export interface EvidenceChunk {
  id: string;
  documentId: string;
  ordinal: number;
  page: number | null;
  section: string | null;
  text: string;
}

export interface SearchHit {
  chunk: EvidenceChunk;
  document: Pick<
    EvidenceDocument,
    "id" | "title" | "authors" | "year" | "venue" | "evidenceLabel"
  >;
  score: number;
  semanticScore: number | null;
  keywordScore: number | null;
  highlights: [number, number][]; // char ranges in chunk.text
}

export interface SearchResponse {
  hits: SearchHit[];
  total: number;
  tookMs: number;
  mode: "hybrid" | "semantic" | "keyword";
  nextCursor: string | null;
}

export type AskEvent =
  | { type: "retrieval"; sources: SearchHit[]; trace: RetrievalTrace }
  | { type: "token"; text: string }
  | { type: "citation"; marker: number; chunkId: string }
  | { type: "unsupported"; start: number; end: number }
  | { type: "done"; answerId: string; noAnswer: boolean }
  | { type: "error"; message: string };

export interface RetrievalTrace {
  embeddingModel: string;
  topK: number;
  candidates: {
    chunkId: string;
    faiss: number | null;
    fts: number | null;
    final: number;
  }[];
  tookMs: number;
}

export interface DiagnosticCheck {
  id: string;
  label: string;
  level: StatusLevel;
  detail: string;
  checkedAt: string | null;
}

export interface NetworkInfo {
  httpsUrl: string;
  lanIp: string | null;
  ssid: string | null;
  connectedDevices: number;
  certFingerprintSha256: string | null;
  certExpiresAt: string | null;
  internetReachable: boolean;
}

export interface IndexJob {
  id: string;
  fileName: string;
  stage:
    | "queued"
    | "extract"
    | "chunk"
    | "embed"
    | "index"
    | "done"
    | "failed"
    | "cancelled";
  progress: number; // 0–1
  chunks: number;
  vectors: number;
  startedAt: string;
  error?: string;
}

export interface SearchParams {
  q: string;
  mode: "hybrid" | "semantic" | "keyword";
  labels: string[];
  systems: string[];
  types: string[];
  topics: string[];
  from: string;
  to: string;
  fullText: boolean;
  sort: "relevance" | "newest";
  cursor?: string;
}
export interface Facets {
  labels: Record<string, number>;
  systems: Record<string, number>;
  types: Record<string, number>;
  topics: Record<string, number>;
}
export interface ImportMetadata {
  title: string;
  authors: string[];
  year: number | null;
  sourceType: SourceType;
  evidenceLabel: EvidenceLabel;
  topics: string[];
  bodySystems: string[];
}
export interface StorageInfo {
  categories: { name: string; bytes: number }[];
  capacityBytes: number;
}
export interface IndexSettings {
  chunkSize: number;
  overlap: number;
  embeddingModel: string;
  estimatedRebuildSeconds: number;
}

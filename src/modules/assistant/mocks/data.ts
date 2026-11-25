import type { Citation } from "../types";
import type { CrewSummary, EvidenceChunk } from "../services/toolServices";

/** Synthetic latest readings per crew member. Synthetic demo data · not real crew records. */
export const MOCK_SUMMARIES: Record<string, CrewSummary> = {
  c01: {
    crewId: "c01",
    readings: [
      { kind: "heart_rate", label: "Heart rate", value: 68, unit: "bpm", recordedAt: "2026-11-14T08:10:00Z", source: "manual" },
      { kind: "spo2", label: "SpO₂", value: 98, unit: "%", recordedAt: "2026-11-14T08:10:00Z", source: "pulse oximeter" },
      { kind: "systolic_bp", label: "Systolic BP", value: 118, unit: "mmHg", recordedAt: "2026-11-14T08:12:00Z", source: "cuff" },
      { kind: "temperature", label: "Temperature", value: 36.7, unit: "°C", recordedAt: "2026-11-14T08:12:00Z", source: "manual" },
    ],
    wellbeing: { checkInAt: "2026-11-13T20:00:00Z", mood: "Steady", stress: "Moderate", note: "Sleep shorter than usual this week." },
  },
  c02: {
    crewId: "c02",
    readings: [
      { kind: "heart_rate", label: "Heart rate", value: 61, unit: "bpm", recordedAt: "2026-11-14T07:40:00Z", source: "manual" },
      { kind: "spo2", label: "SpO₂", value: 99, unit: "%", recordedAt: "2026-11-14T07:40:00Z", source: "pulse oximeter" },
      { kind: "temperature", label: "Temperature", value: 36.5, unit: "°C", recordedAt: "2026-11-14T07:41:00Z", source: "manual" },
    ],
    wellbeing: { checkInAt: "2026-11-13T21:15:00Z", mood: "Good", stress: "Low", note: null },
  },
  c03: {
    crewId: "c03",
    readings: [
      { kind: "heart_rate", label: "Heart rate", value: 74, unit: "bpm", recordedAt: "2026-11-14T09:02:00Z", source: "wearable" },
      { kind: "systolic_bp", label: "Systolic BP", value: 126, unit: "mmHg", recordedAt: "2026-11-14T09:05:00Z", source: "cuff" },
    ],
    wellbeing: { checkInAt: "2026-11-12T19:30:00Z", mood: "Low", stress: "High", note: "Asked for a quieter shift pattern." },
  },
  c04: {
    crewId: "c04",
    readings: [
      { kind: "heart_rate", label: "Heart rate", value: 70, unit: "bpm", recordedAt: "2026-11-14T06:55:00Z", source: "manual" },
      { kind: "spo2", label: "SpO₂", value: 97, unit: "%", recordedAt: "2026-11-14T06:55:00Z", source: "pulse oximeter" },
    ],
    wellbeing: null,
  },
};

/**
 * Passages from the local Evidence library used by the scripted demo.
 * Excerpts are short paraphrases of the cited papers, not quotations.
 */
export const MOCK_EVIDENCE: EvidenceChunk[] = [
  {
    documentId: "doc-leblanc-2000",
    chunkId: "chunk-4812",
    title: "LeBlanc A, et al. Bone mineral and lean tissue loss after long duration space flight. J Musculoskelet Neuronal Interact. 2000;1(2):157–160.",
    excerpt:
      "Crew members on 4–14.4 month missions lost bone mineral density at an average of roughly 1–1.5% per month in the spine and hip, with the largest losses in weight-bearing regions.",
    score: 0.82,
  },
  {
    documentId: "doc-gabel-2022",
    chunkId: "chunk-9310",
    title: "Gabel L, et al. Incomplete recovery of bone strength and trabecular microarchitecture at the distal tibia 1 year after return from long duration spaceflight. Sci Rep. 2022;12:9446.",
    excerpt:
      "High-resolution scans of 17 astronauts found tibial bone strength and density were only partly recovered one year after return, with longer missions associated with less recovery.",
    score: 0.77,
  },
  {
    documentId: "doc-vico-2018",
    chunkId: "chunk-2207",
    title: "Vico L, Hargens A. Skeletal changes during and after spaceflight. Nat Rev Rheumatol. 2018;14:229–245.",
    excerpt:
      "A review of skeletal adaptation to microgravity: bone loss concentrates in the lower limbs and spine, countermeasures such as resistive exercise reduce but do not remove it.",
    score: 0.71,
  },
];

export function chunksToCitations(chunks: EvidenceChunk[]): Citation[] {
  return chunks.map((c, i) => ({ marker: i + 1, documentId: c.documentId, chunkId: c.chunkId, title: c.title, excerpt: c.excerpt }));
}

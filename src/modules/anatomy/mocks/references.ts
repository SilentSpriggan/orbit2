import type { RegionReference } from "../types";

/**
 * Health-log entries and Evidence library sources per region (synthetic).
 * Pin notes are added by the mock service from the live pin store.
 */
interface MockRef extends RegionReference {
  crewId?: string;
  vitalKind?: string;
}

const crewLink = (crewId: string, kind: string) => `/crew?crew=${crewId}&vital=${kind}`;
const evidenceLink = (doc: string, chunk: string) => `/evidence?doc=${doc}&chunk=${chunk}`;

export const MOCK_REFERENCES: Record<string, MockRef[]> = {
  knee_left: [
    { kind: "health_log", id: "hl-c03-0418", crewId: "c03", vitalKind: "heart_rate", title: "Heart rate 112 bpm · during resistance session", at: "2026-11-14T07:38:00Z", href: crewLink("c03", "heart_rate") },
    { kind: "health_log", id: "hl-c03-0421", crewId: "c03", vitalKind: "heart_rate", title: "Heart rate 78 bpm · 20 minutes after stopping", at: "2026-11-14T08:01:00Z", href: crewLink("c03", "heart_rate") },
    { kind: "evidence", id: "doc_bone_loss_microgravity#4812", title: "Bone loss and loading in microgravity", at: "2025-06-02T00:00:00Z", href: evidenceLink("doc_bone_loss_microgravity", "4812") },
    { kind: "evidence", id: "doc_msk_injury_countermeasures#2207", title: "Musculoskeletal injury during exercise countermeasures", at: "2024-09-18T00:00:00Z", href: evidenceLink("doc_msk_injury_countermeasures", "2207") },
  ],
  forearm_right: [
    { kind: "health_log", id: "hl-c03-0397", crewId: "c03", vitalKind: "skin_temp", title: "Skin temperature 33.9 °C · dressing check", at: "2026-11-14T06:48:00Z", href: crewLink("c03", "skin_temp") },
  ],
  thorax: [
    { kind: "health_log", id: "hl-c02-0233", crewId: "c02", vitalKind: "heart_rate", title: "Heart rate 138 bpm · treadmill", at: "2026-11-14T05:12:00Z", href: crewLink("c02", "heart_rate") },
    { kind: "health_log", id: "hl-c02-0236", crewId: "c02", vitalKind: "spo2", title: "SpO2 97 % · after rest", at: "2026-11-14T05:24:00Z", href: crewLink("c02", "spo2") },
    { kind: "evidence", id: "doc_cardiovascular_fluid_shift#2760", title: "Cardiovascular adaptation and fluid shifts", at: "2023-11-30T00:00:00Z", href: evidenceLink("doc_cardiovascular_fluid_shift", "2760") },
  ],
  femur_left: [
    { kind: "evidence", id: "doc_bone_loss_microgravity#4812", title: "Bone loss and loading in microgravity", at: "2025-06-02T00:00:00Z", href: evidenceLink("doc_bone_loss_microgravity", "4812") },
  ],
  femur_right: [
    { kind: "evidence", id: "doc_bone_loss_microgravity#4812", title: "Bone loss and loading in microgravity", at: "2025-06-02T00:00:00Z", href: evidenceLink("doc_bone_loss_microgravity", "4812") },
  ],
  spine_lumbar: [
    { kind: "evidence", id: "doc_spine_microgravity#1190", title: "Spinal elongation and back pain in flight", at: "2024-03-11T00:00:00Z", href: evidenceLink("doc_spine_microgravity", "1190") },
  ],
  eye_left: [
    { kind: "evidence", id: "doc_sans_overview#3301", title: "Spaceflight-associated changes to the eye", at: "2025-01-20T00:00:00Z", href: evidenceLink("doc_sans_overview", "3301") },
  ],
  eye_right: [
    { kind: "evidence", id: "doc_sans_overview#3301", title: "Spaceflight-associated changes to the eye", at: "2025-01-20T00:00:00Z", href: evidenceLink("doc_sans_overview", "3301") },
  ],
  hand_left: [
    { kind: "evidence", id: "doc_skin_closed_habitat#0642", title: "Skin care in closed habitats", at: "2022-08-04T00:00:00Z", href: evidenceLink("doc_skin_closed_habitat", "0642") },
  ],
  kidney_left: [
    { kind: "evidence", id: "doc_renal_stone_risk#1874", title: "Kidney stone risk during long-duration flight", at: "2024-12-09T00:00:00Z", href: evidenceLink("doc_renal_stone_risk", "1874") },
  ],
  kidney_right: [
    { kind: "evidence", id: "doc_renal_stone_risk#1874", title: "Kidney stone risk during long-duration flight", at: "2024-12-09T00:00:00Z", href: evidenceLink("doc_renal_stone_risk", "1874") },
  ],
};

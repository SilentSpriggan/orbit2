import type { StatusLevel } from "../../shared/types";

export type BodySystem =
  | "skeletal" | "muscular" | "nervous" | "cardiovascular" | "respiratory"
  | "digestive" | "urinary" | "lymphatic" | "integumentary";

export interface AnatomyRegion {
  id: string;                    // "femur_left"
  name: string;                  // "Left femur"
  system: BodySystem;
  parentId: string | null;
  synonyms: string[];
  meshNames: string[];           // GLB node names
  svgPathId?: string;            // 2D fallback path id
  side?: "left" | "right" | "midline";
  description: string;
  considerations?: { text: string; evidenceRef: { documentId: string; chunkId: string } }[];
}

export type PinType = "symptom" | "injury" | "observation";
export type PinSeverity = Extract<StatusLevel, "nominal" | "caution" | "critical">;
export type PinStatus = "open" | "monitoring" | "resolved";

export interface AnatomyPin {
  id: string;
  crewId: string;
  regionId: string;
  type: PinType;
  title: string;
  severity: PinSeverity;
  status: PinStatus;
  onsetAt: string;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  note: string;
  linkedVitalKinds: string[];
  position3d?: { x: number; y: number; z: number; nx: number; ny: number; nz: number };
  position2d?: { view: "front" | "back"; x: number; y: number };
}

export interface RegionReference {
  kind: "pin_note" | "health_log" | "evidence";
  id: string;
  title: string;
  at: string | null;
  href: string;                  // in-app route
}

export interface ViewerState {
  mode: "3d" | "2d";
  isFallback: boolean;
  preset: "anterior" | "posterior" | "left" | "right" | "superior";
  layers: Record<BodySystem, { visible: boolean; opacity: number }>;
  isolated: BodySystem | null;
  section: { axis: "off" | "sagittal" | "coronal" | "axial"; position: number };
  selectedRegionId: string | null;
  placingPin: boolean;
}

/* ── Module-local helpers (not part of the FastAPI contract) ─────────────── */

export type ViewPreset = ViewerState["preset"];
export type SectionAxis = ViewerState["section"]["axis"];

/** Fields a person fills in when creating a pin. */
export type PinInput = Omit<AnatomyPin, "id" | "createdAt" | "updatedAt">;
export type PinPatch = Partial<Omit<AnatomyPin, "id" | "createdAt" | "updatedAt" | "authorId">>;

export interface PinFilter {
  crewId?: string;
  regionId?: string;
  status?: PinStatus;
}

/** Where the person tapped while placing a pin. */
export interface PinPlacement {
  regionId: string;
  position3d?: AnatomyPin["position3d"];
  position2d?: AnatomyPin["position2d"];
}

export const BODY_SYSTEMS: BodySystem[] = [
  "skeletal", "muscular", "nervous", "cardiovascular", "respiratory",
  "digestive", "urinary", "lymphatic", "integumentary",
];

export const SYSTEM_LABEL: Record<BodySystem, string> = {
  skeletal: "Skeletal",
  muscular: "Muscular",
  nervous: "Nervous",
  cardiovascular: "Cardiovascular",
  respiratory: "Respiratory",
  digestive: "Digestive",
  urinary: "Urinary",
  lymphatic: "Lymphatic",
  integumentary: "Integumentary (skin)",
};

export const PIN_TYPE_LABEL: Record<PinType, string> = {
  symptom: "Symptom",
  injury: "Injury",
  observation: "Observation",
};

export const SEVERITY_LABEL: Record<PinSeverity, string> = {
  nominal: "Minor",
  caution: "Moderate",
  critical: "Severe",
};

export const PIN_STATUS_LABEL: Record<PinStatus, string> = {
  open: "Open",
  monitoring: "Monitoring",
  resolved: "Resolved",
};

export const VITAL_KINDS = [
  "heart_rate", "respiratory_rate", "spo2", "skin_temp", "blood_pressure", "body_mass",
] as const;

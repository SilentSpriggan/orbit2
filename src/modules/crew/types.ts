import type { StatusLevel } from "../../shared/types";

export type VitalKind =
  | "heart_rate"
  | "spo2"
  | "resp_rate"
  | "bp_systolic"
  | "bp_diastolic"
  | "skin_temp"
  | "sleep_hours"
  | "sleep_quality"
  | "hydration_ml"
  | "stress_self"
  | "fatigue_self";

export const WELLBEING_KINDS: VitalKind[] = [
  "stress_self",
  "fatigue_self",
  "sleep_quality",
];

export interface VitalReading {
  id: string;
  crewId: string;
  kind: VitalKind;
  value: number;
  unit: string; // "bpm", "%", "/min", "mmHg", "°C", "h", "1–5", "mL", "0–10"
  recordedAt: string; // ISO UTC
  source: "manual" | "wearable" | "import";
  enteredBy: string; // crew id
  note?: string;
  pairId?: string; // links systolic/diastolic
}

export interface ReviewBand {
  kind: VitalKind;
  min: number | null;
  max: number | null;
  consecutiveBeforeAlert: number;
  expectedIntervalHours: number | null;
  updatedBy: string;
  updatedAt: string;
}

export interface HealthAlert {
  id: string;
  crewId: string;
  kind: VitalKind | "trend";
  level: Exclude<StatusLevel, "nominal" | "standby">;
  message: string;
  rule: string; // human-readable product rule that fired
  createdAt: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface CrewHealthSummary {
  crewId: string;
  overall: StatusLevel;
  topReason: string | null;
  latest: Partial<Record<VitalKind, VitalReading>>;
  lastReadingAt: string | null;
  activeAlertCount: number;
}

export interface LiveTelemetryFrame {
  crewId: string;
  deviceName: string;
  at: string;
  heartRate?: number;
  spo2?: number;
  respRate?: number;
}

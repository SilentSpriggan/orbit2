import type { VitalKind } from "../types";
export const METRICS: Record<
  VitalKind,
  {
    label: string;
    unit: string;
    min: number;
    max: number;
    band: [number, number];
  }
> = {
  heart_rate: {
    label: "Heart rate",
    unit: "bpm",
    min: 20,
    max: 250,
    band: [50, 100],
  },
  spo2: { label: "SpO₂", unit: "%", min: 50, max: 100, band: [92, 100] },
  resp_rate: {
    label: "Respiratory rate",
    unit: "/min",
    min: 1,
    max: 80,
    band: [10, 22],
  },
  bp_systolic: {
    label: "Systolic pressure",
    unit: "mmHg",
    min: 40,
    max: 300,
    band: [90, 140],
  },
  bp_diastolic: {
    label: "Diastolic pressure",
    unit: "mmHg",
    min: 20,
    max: 200,
    band: [60, 90],
  },
  skin_temp: {
    label: "Skin temperature",
    unit: "°C",
    min: 20,
    max: 45,
    band: [35, 37.5],
  },
  sleep_hours: { label: "Sleep", unit: "h", min: 0, max: 24, band: [4, 10] },
  sleep_quality: {
    label: "Sleep quality",
    unit: "1–5",
    min: 1,
    max: 5,
    band: [1, 5],
  },
  hydration_ml: {
    label: "Hydration",
    unit: "mL",
    min: 0,
    max: 10000,
    band: [1000, 3500],
  },
  stress_self: {
    label: "Stress",
    unit: "0–10",
    min: 0,
    max: 10,
    band: [0, 10],
  },
  fatigue_self: {
    label: "Fatigue",
    unit: "0–10",
    min: 0,
    max: 10,
    band: [0, 10],
  },
};
export const KINDS = Object.keys(METRICS) as VitalKind[];
export const COMPACT: VitalKind[] = [
  "heart_rate",
  "spo2",
  "resp_rate",
  "skin_temp",
  "sleep_hours",
  "hydration_ml",
];
export const stamp = (iso: string) => iso.slice(0, 16).replace("T", " ") + "Z";

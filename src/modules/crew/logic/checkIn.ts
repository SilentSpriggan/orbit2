import { METRICS } from "./metrics";
import { WELLBEING_KINDS, type VitalKind, type VitalReading } from "../types";
export type CheckInValues = Partial<Record<VitalKind, string>>;
export const CHECK_IN_KINDS: VitalKind[] = [
  "heart_rate",
  "spo2",
  "resp_rate",
  "bp_systolic",
  "bp_diastolic",
  "skin_temp",
  "sleep_hours",
  "hydration_ml",
  "stress_self",
  "fatigue_self",
];
export function buildCheckIn(
  values: CheckInValues,
  wellbeing: boolean,
  meta: {
    recordedAt: string;
    enteredBy: string;
    note?: string;
    pairId: string;
  },
): Omit<VitalReading, "id" | "crewId">[] {
  const kinds = CHECK_IN_KINDS.filter(
    (k) =>
      (wellbeing || !WELLBEING_KINDS.includes(k)) &&
      (values[k] ?? "").trim() !== "",
  );
  if (!kinds.length) throw new Error("Enter at least one measurement.");
  if (kinds.includes("bp_systolic") !== kinds.includes("bp_diastolic"))
    throw new Error("Enter both systolic and diastolic blood pressure.");
  if (!Number.isFinite(Date.parse(meta.recordedAt)))
    throw new Error("Choose a valid reading time.");
  return kinds.map((kind) => {
    const value = Number(values[kind]),
      metric = METRICS[kind];
    if (
      !Number.isFinite(value) ||
      value < metric.min ||
      value > metric.max ||
      (!["spo2", "skin_temp", "sleep_hours"].includes(kind) &&
        !Number.isInteger(value))
    )
      throw new Error(
        `Enter a valid ${metric.label.toLowerCase()} between ${metric.min} and ${metric.max} ${metric.unit}.`,
      );
    return {
      kind,
      value,
      unit: metric.unit,
      recordedAt: meta.recordedAt,
      enteredBy: meta.enteredBy,
      note: meta.note,
      source: "manual",
      pairId:
        kind === "bp_systolic" || kind === "bp_diastolic"
          ? meta.pairId
          : undefined,
    };
  });
}

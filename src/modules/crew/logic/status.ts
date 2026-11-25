import type { StatusLevel } from "../../../shared/types";
import {
  WELLBEING_KINDS,
  type CrewHealthSummary,
  type ReviewBand,
  type VitalKind,
  type VitalReading,
} from "../types";
export const PRIORITY: Record<StatusLevel, number> = {
  critical: 0,
  caution: 1,
  nodata: 2,
  nominal: 3,
  standby: 4,
};
export function levelFor(
  reading: VitalReading,
  band?: ReviewBand,
): StatusLevel {
  if (!band || (band.min === null && band.max === null)) return "standby";
  const delta = Math.max(
    band.min === null ? 0 : band.min - reading.value,
    band.max === null ? 0 : reading.value - band.max,
    0,
  );
  if (!delta) return "nominal";
  const span =
    band.min !== null && band.max !== null
      ? band.max - band.min
      : Math.abs(band.min ?? band.max ?? 0);
  return delta <= span * 0.1 + 1e-9 ? "caution" : "critical";
}
export function overallFor(
  summary: Pick<CrewHealthSummary, "latest">,
  bands: ReviewBand[],
  now = Date.now(),
): StatusLevel {
  let worst: StatusLevel = "standby";
  for (const band of bands.filter((b) => !WELLBEING_KINDS.includes(b.kind))) {
    const reading = summary.latest[band.kind];
    const stale =
      band.expectedIntervalHours !== null &&
      (!reading ||
        now - Date.parse(reading.recordedAt) >
          band.expectedIntervalHours * 3600000);
    const level = stale
      ? "nodata"
      : reading
        ? levelFor(reading, band)
        : "nodata";
    if (PRIORITY[level] < PRIORITY[worst]) worst = level;
  }
  return worst;
}
export function rankCrew<T extends CrewHealthSummary & { lastAlert?: string }>(
  summaries: T[],
): T[] {
  return [...summaries].sort(
    (a, b) =>
      PRIORITY[a.overall] - PRIORITY[b.overall] ||
      (b.lastAlert ?? "").localeCompare(a.lastAlert ?? ""),
  );
}
export function trendChange(
  readings: VitalReading[],
  kind: VitalKind,
  now = Date.now(),
) {
  const days = Array.from({ length: 28 }, (_, day) => {
    const values = readings
      .filter(
        (r) =>
          r.kind === kind &&
          now - Date.parse(r.recordedAt) >= day * 86400000 &&
          now - Date.parse(r.recordedAt) < (day + 1) * 86400000,
      )
      .map((r) => r.value);
    return values.length
      ? values.reduce((a, b) => a + b, 0) / values.length
      : null;
  });
  const recent = days.slice(0, 7).filter((v): v is number => v !== null);
  const prior = days.slice(7).filter((v): v is number => v !== null);
  if (!recent.length || !prior.length) return null;
  const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
  const baseline = mean(prior),
    average = mean(recent);
  return {
    percent: baseline ? ((average - baseline) / baseline) * 100 : null,
    sustained:
      recent.filter((v) => (average > baseline ? v > baseline : v < baseline))
        .length >= 5,
  };
}

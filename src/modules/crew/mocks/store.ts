import { MOCK_CREW } from "../../../shared/mocks/crew";
import { canSeeWellbeing } from "../../../shared/types";
import { KINDS, METRICS } from "../logic/metrics";
import { levelFor, overallFor } from "../logic/status";
import {
  WELLBEING_KINDS,
  type ReviewBand,
  type VitalReading,
  type HealthAlert,
  type CrewHealthSummary,
} from "../types";
export const demoNow = new Date().setUTCSeconds(0, 0);
export function defaultBands(): ReviewBand[] {
  return KINDS.map((kind) => ({
    kind,
    min: METRICS[kind].band[0],
    max: METRICS[kind].band[1],
    consecutiveBeforeAlert: 2,
    expectedIntervalHours: 24,
    updatedBy: "mission-default",
    updatedAt: new Date(demoNow).toISOString(),
  }));
}
let seed = 42;
function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}
const base = [72, 98, 16, 118, 76, 36.5, 7.8, 4, 2200, 3, 4];
export const store = {
  readings: [] as VitalReading[],
  bands: Object.fromEntries(MOCK_CREW.map((c) => [c.id, defaultBands()])),
  acknowledgements: {} as Record<
    string,
    { acknowledgedBy: string; acknowledgedAt: string }
  >,
};
// A synthetic mission band preserves the specified HALO caution scenario under the exact 10% rule.
store.bands.c02.find((b) => b.kind === "spo2")!.min = 91.8;
for (const crew of MOCK_CREW)
  for (let day = 29; day >= 0; day--)
    for (let sample = 0; sample < 2; sample++)
      KINDS.forEach((kind, i) => {
        const age =
          day * 86400000 +
          (sample === 0 ? 12 * 3600000 : 40 * 60000) +
          (crew.id === "c04" ? 30 * 3600000 : 0);
        let value =
          base[i] +
          (random() - 0.5) *
            (kind === "hydration_ml" ? 100 : kind === "skin_temp" ? 0.2 : 1);
        if (crew.id === "c03" && kind === "heart_rate")
          value = day < 7 ? 78 : 71;
        if (crew.id === "c03" && day === 0 && kind === "heart_rate")
          value = 128;
        if (crew.id === "c03" && day === 0 && kind === "skin_temp")
          value = 38.4;
        if (crew.id === "c02" && day === 0 && kind === "spo2")
          value = sample === 0 ? 91.5 : 91;
        if (crew.id === "c04" && day < 3 && kind === "sleep_hours") value = 4.5;
        value = Number(
          value.toFixed(
            ["skin_temp", "sleep_hours", "spo2"].includes(kind) ? 1 : 0,
          ),
        );
        store.readings.push({
          id: `${crew.id}-${day}-${sample}-${kind}`,
          crewId: crew.id,
          kind,
          value,
          unit: METRICS[kind].unit,
          recordedAt: new Date(demoNow - age).toISOString(),
          source:
            kind === "heart_rate" || kind === "spo2" ? "wearable" : "manual",
          enteredBy: crew.id,
          note:
            day === 0 && kind === "heart_rate"
              ? "Resting reading after scheduled check-in."
              : undefined,
        });
      });
store.readings.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
export function visible(r: VitalReading, viewer: string) {
  const person = MOCK_CREW.find((c) => c.id === viewer);
  return (
    !WELLBEING_KINDS.includes(r.kind) ||
    (!!person && canSeeWellbeing(person, r.crewId))
  );
}
export function alerts(): HealthAlert[] {
  const result: HealthAlert[] = [];
  for (const crew of MOCK_CREW)
    for (const band of store.bands[crew.id].filter(
      (b) => !WELLBEING_KINDS.includes(b.kind),
    )) {
      const readings = store.readings
        .filter((r) => r.crewId === crew.id && r.kind === band.kind)
        .slice(0, band.consecutiveBeforeAlert);
      const latest = readings[0];
      if (!latest) continue;
      const level = levelFor(latest, band);
      if (demoNow - Date.parse(latest.recordedAt) > 24 * 3600000) continue;
      if (
        (level === "critical" || level === "caution") &&
        readings.length >= band.consecutiveBeforeAlert &&
        readings.every((r) =>
          ["caution", "critical"].includes(levelFor(r, band)),
        )
      ) {
        const id = `${crew.id}-${band.kind}-${latest.id}`;
        result.push({
          id,
          crewId: crew.id,
          kind: band.kind,
          level,
          message: `${METRICS[band.kind].label} ${latest.value} ${latest.unit} outside the ${band.min ?? "—"}–${band.max ?? "—"} review band`,
          rule: `${band.consecutiveBeforeAlert} consecutive readings outside crew review band`,
          createdAt: latest.recordedAt,
          ...store.acknowledgements[id],
        });
      }
    }
  return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function summaries(viewer: string): CrewHealthSummary[] {
  const allAlerts = alerts();
  return MOCK_CREW.map((crew) => {
    const readings = store.readings.filter((r) => r.crewId === crew.id);
    const latest: CrewHealthSummary["latest"] = {};
    for (const r of readings) if (!latest[r.kind]) latest[r.kind] = r;
    const overall = overallFor(
      { latest },
      store.bands[crew.id],
      Math.max(Date.now(), demoNow),
    );
    const ownAlerts = allAlerts.filter(
      (a) => a.crewId === crew.id && !a.acknowledgedAt,
    );
    const topReason =
      overall === "nodata"
        ? "No reading in the expected 24-hour window"
        : (ownAlerts[0]?.message ?? "Latest readings within crew review bands");
    return {
      crewId: crew.id,
      overall,
      topReason,
      latest: Object.fromEntries(
        Object.entries(latest).filter(([, r]) => visible(r, viewer)),
      ),
      lastReadingAt: readings[0]?.recordedAt ?? null,
      activeAlertCount: ownAlerts.length,
      lastAlert: ownAlerts[0]?.createdAt,
    };
  });
}

import { describe, expect, it } from "vitest";
import { levelFor, overallFor, rankCrew, trendChange } from "./status";
import type { ReviewBand, VitalReading, CrewHealthSummary } from "../types";
const now = Date.UTC(2026, 10, 14, 14, 5);
const reading = (value: number, day = 0): VitalReading => ({
  id: String(day),
  crewId: "c01",
  kind: "heart_rate",
  value,
  unit: "bpm",
  recordedAt: new Date(now - day * 86400000).toISOString(),
  source: "manual",
  enteredBy: "c01",
});
const band: ReviewBand = {
  kind: "heart_rate",
  min: 50,
  max: 100,
  consecutiveBeforeAlert: 2,
  expectedIntervalHours: 24,
  updatedBy: "c02",
  updatedAt: new Date(now).toISOString(),
};
describe("crew product rules", () => {
  it("handles inclusive boundaries and 10% distance", () => {
    expect([50, 100, 105, 106].map((v) => levelFor(reading(v), band))).toEqual([
      "nominal",
      "nominal",
      "caution",
      "critical",
    ]);
    expect(levelFor(reading(72))).toBe("standby");
  });
  it("supports one-sided and empty bands", () => {
    expect(levelFor(reading(49), { ...band, max: null })).toBe("caution");
    expect(levelFor(reading(1), { ...band, min: null, max: null })).toBe(
      "standby",
    );
  });
  it("marks stale readings without making wellbeing drive rank", () => {
    expect(
      overallFor({ latest: { heart_rate: reading(128, 2) } }, [band], now),
    ).toBe("nodata");
    expect(
      overallFor(
        {
          latest: {
            heart_rate: reading(72),
            stress_self: { ...reading(10), kind: "stress_self" },
          },
        },
        [band, { ...band, kind: "stress_self", min: 0, max: 1 }],
        now,
      ),
    ).toBe("nominal");
  });
  it("ranks urgency then latest alert without mutating", () => {
    const summaries = ["nominal", "nodata", "caution", "critical"].map(
      (overall, i) => ({
        crewId: String(i),
        overall,
        latest: {},
        topReason: null,
        lastReadingAt: null,
        activeAlertCount: 0,
      }),
    ) as CrewHealthSummary[];
    expect(rankCrew(summaries).map((s) => s.overall)).toEqual([
      "critical",
      "caution",
      "nodata",
      "nominal",
    ]);
    expect(summaries[0].overall).toBe("nominal");
  });
  it("compares daily means and detects sustained changes", () => {
    const readings = Array.from({ length: 28 }, (_, i) =>
      reading(i < 7 ? 77 : 70, i),
    );
    expect(trendChange(readings, "heart_rate", now)?.percent).toBeCloseTo(10);
    expect(trendChange(readings, "heart_rate", now)?.sustained).toBe(true);
    expect(trendChange([], "heart_rate", now)).toBeNull();
  });
});

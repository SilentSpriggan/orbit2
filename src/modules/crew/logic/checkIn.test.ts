import { describe, expect, it } from "vitest";
import { buildCheckIn, type CheckInValues } from "./checkIn";
const meta = {
  recordedAt: "2026-11-14T14:05:00Z",
  enteredBy: "c01",
  pairId: "pair-1",
};
describe("multi-metric check-in", () => {
  it("saves every entered metric with a shared blood pressure pair", () => {
    const values: CheckInValues = {
      heart_rate: "72",
      spo2: "98.5",
      resp_rate: "16",
      bp_systolic: "118",
      bp_diastolic: "76",
      skin_temp: "36.5",
      sleep_hours: "7.5",
      hydration_ml: "2200",
      stress_self: "0",
      fatigue_self: "4",
    };
    const rows = buildCheckIn(values, true, meta);
    expect(rows).toHaveLength(10);
    expect(rows.filter((r) => r.pairId).map((r) => r.pairId)).toEqual([
      "pair-1",
      "pair-1",
    ]);
    expect(rows.find((r) => r.kind === "stress_self")?.value).toBe(0);
  });
  it("skips blanks without turning them into zero", () => {
    expect(
      buildCheckIn(
        { heart_rate: "72", spo2: "", sleep_hours: " " },
        true,
        meta,
      ),
    ).toHaveLength(1);
    expect(() => buildCheckIn({}, true, meta)).toThrow("at least one");
  });
  it("requires both blood pressure values", () => {
    expect(() => buildCheckIn({ bp_systolic: "118" }, true, meta)).toThrow(
      "both",
    );
  });
  it("excludes wellbeing for an unauthorized viewer", () => {
    expect(
      buildCheckIn(
        { heart_rate: "72", stress_self: "8", fatigue_self: "9" },
        false,
        meta,
      ).map((r) => r.kind),
    ).toEqual(["heart_rate"]);
  });
  it("rejects invalid values before any writes", () => {
    for (const value of ["NaN", "251", "19", "72.5"])
      expect(() => buildCheckIn({ heart_rate: value }, true, meta)).toThrow(
        "valid heart rate",
      );
  });
});

import { describe, expect, it } from "vitest";
import { alerts, store, summaries, visible } from "./store";
import { rankCrew } from "../logic/status";
import { WELLBEING_KINDS } from "../types";
describe("synthetic mission scenarios", () => {
  it("ranks TALON, HALO, IRIS, VEGA with three active alerts", () => {
    const ranked = rankCrew(summaries("c01"));
    expect(ranked.map((s) => s.crewId)).toEqual(["c03", "c02", "c04", "c01"]);
    expect(ranked.map((s) => s.overall)).toEqual([
      "critical",
      "caution",
      "nodata",
      "nominal",
    ]);
    expect(alerts()).toHaveLength(3);
  });
  it("removes wellbeing from other crew summaries for TALON", () => {
    for (const summary of summaries("c03"))
      for (const kind of WELLBEING_KINDS)
        expect(Boolean(summary.latest[kind])).toBe(summary.crewId === "c03");
  });
  it("allows leader and medical access but denies unknown viewers", () => {
    const reading = store.readings.find(
      (r) => r.crewId === "c04" && r.kind === "stress_self",
    )!;
    expect(visible(reading, "c01")).toBe(true);
    expect(visible(reading, "c02")).toBe(true);
    expect(visible(reading, "c03")).toBe(false);
    expect(visible(reading, "unknown")).toBe(false);
  });
  it("retains acknowledgement attribution for an active rule", () => {
    const alert = alerts()[0];
    store.acknowledgements[alert.id] = {
      acknowledgedBy: "c02",
      acknowledgedAt: new Date().toISOString(),
    };
    expect(alerts().find((a) => a.id === alert.id)?.acknowledgedBy).toBe("c02");
    delete store.acknowledgements[alert.id];
  });
});

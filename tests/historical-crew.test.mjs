import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

// The ui/ scripts are browser globals, not modules; load them the way the page does.
function load(file, name) {
  const context = { module: { exports: {} } };
  vm.runInNewContext(readFileSync(new URL(`../ui/${file}`, import.meta.url), "utf8"), context);
  return context.module.exports && Object.keys(context.module.exports).length ? context.module.exports : context[name];
}
const HistoricalCrew = load("historical-crew.js", "HistoricalCrew");

// record_id -> { metric -> { value, unit } } from the Evidence library's historical CSV.
function csv() {
  const text = readFileSync(new URL("../ui/assets/ALL_NUMERIC_METRICS_LONG.csv", import.meta.url), "utf8").replace(/^﻿/, "");
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const cols = header.split(",");
  const out = {};
  for (const line of lines) {
    const cells = line.split(",");
    const row = Object.fromEntries(cols.map((c, i) => [c, cells[i]]));
    if (!row.record_id.startsWith("NASA-VITAL-")) continue;
    const key = row.metric === "body_temperature" ? `body_temperature_${row.unit}` : row.metric;
    (out[row.record_id] ??= {})[key] = Number(row.value);
  }
  return out;
}

test("historical crew readings match the Evidence library's historical records", () => {
  const source = csv();
  let checked = 0;
  for (const { profile, records } of HistoricalCrew.PROFILES) {
    for (const r of records) {
      const s = source[r.record];
      assert.ok(s, `${r.record} is in the CSV`);
      const same = (actual, metric) => { assert.equal(actual, s[metric], `${profile.name} ${r.record} ${metric}`); checked++; };
      if (r.hr) { same(r.hr.value, "heart_rate"); if (r.hr.range) { same(r.hr.range[0], "heart_rate_min"); same(r.hr.range[1], "heart_rate_max"); } if (r.hr.n) same(r.hr.n, "heart_rate_sample_count"); }
      if (r.rr) { same(r.rr.value, "respiratory_rate"); if (r.rr.range) { same(r.rr.range[0], "respiratory_rate_min"); same(r.rr.range[1], "respiratory_rate_max"); } if (r.rr.n) same(r.rr.n, "respiratory_rate_sample_count"); }
      if (r.tempF) { same(r.tempF.value, "body_temperature_degF"); same(r.tempF.c, "body_temperature_degC"); if (r.tempF.range) { same(r.tempF.range[0], "body_temperature_min"); same(r.tempF.range[1], "body_temperature_max"); } if (r.tempF.n) same(r.tempF.n, "body_temperature_sample_count"); }
      if (Number.isFinite(r.sys)) { same(r.sys, "systolic_bp"); same(r.dia, "diastolic_bp"); }
      // Nothing in the CSV for this record is left out.
      const used = new Set(["heart_rate", "heart_rate_min", "heart_rate_max", "heart_rate_sample_count", "respiratory_rate", "respiratory_rate_min", "respiratory_rate_max", "respiratory_rate_sample_count", "body_temperature_degF", "body_temperature_degC", "body_temperature_min", "body_temperature_max", "body_temperature_sample_count", "systolic_bp", "diastolic_bp"]
        .filter((m) => (m.startsWith("heart") && r.hr) || (m.startsWith("respiratory") && r.rr) || (m.startsWith("body") && r.tempF) || (m.endsWith("_bp") && Number.isFinite(r.sys))));
      for (const metric of Object.keys(s)) assert.ok(used.has(metric) || metric.endsWith("_sample_count") && !s[metric], `${r.record} ${metric} is shown`);
    }
  }
  const all = Object.keys(source).sort();
  const shown = [...HistoricalCrew.PROFILES.flatMap((p) => p.records.map((r) => r.record))].sort();
  assert.deepEqual(shown, all, "every Mercury record appears once");
  assert.ok(checked > 60);
});

test("historical profiles are added once to the demo workspace, with readings in website units", () => {
  const w = { crew: [{ id: "crew-01" }], entries: [] };
  HistoricalCrew.addTo(w);
  HistoricalCrew.addTo(w);
  assert.deepEqual([...w.crew.map((p) => p.id)], ["crew-01", "hist-ma7", "hist-ma9"]);
  assert.ok(w.crew.slice(1).every((p) => p.historical));
  assert.equal(w.entries.length, 13);
  const orbit = w.entries.find((e) => e.id === "hist-ma9-NASA-VITAL-002");
  assert.deepEqual([orbit.hr, orbit.sys, orbit.dia, orbit.rr], [89, 119, 81, 15]);
  assert.equal(w.entries.find((e) => e.id === "hist-ma9-NASA-VITAL-007").temp, 37.44, "temperature in °C");
  assert.match(orbit.notes, /not verified/);
  // A person who deletes a historical profile does not get it back.
  w.crew = w.crew.filter((p) => p.id !== "hist-ma7");
  HistoricalCrew.addTo(w);
  assert.equal(w.crew.some((p) => p.id === "hist-ma7"), false);
});

test("a historical profile is never overdue or flagged on Crew status", () => {
  const MissionLogic = load("mission-logic.js", "MissionLogic");
  const records = [{ at: "1963-05-16T06:00:00Z", hr: 123 }];
  const status = MissionLogic.crewStatus({ records, historical: "Mercury-Atlas 9" });
  assert.equal(status.level, "historical");
  assert.equal(status.overdue, false);
  assert.ok(status.rank > MissionLogic.STATUS.clear.rank, "listed after current crew");
  assert.equal(MissionLogic.crewStatus({ records }).overdue, true, "the same records for a current crew member are overdue");
});

test("Mercury evidence cards link to their historical profile's health log; other missions stay untracked", () => {
  const ResearchLibrary = load("research-library.js", "ResearchLibrary");
  const profiles = Object.fromEntries(HistoricalCrew.PROFILES.map(({ profile }) => [profile.mission, profile]));
  const cards = ResearchLibrary.TOPICS.historical.items;
  let linked = 0;
  for (const card of cards) {
    const profile = profiles[card.title.match(/: (.+?) —/)[1]];
    if (!profile) { assert.equal(card.track, null, `${card.title} has no profile, so no link`); continue; }
    assert.equal(card.track[0], `log?crew=${profile.id}`, card.title);
    assert.match(card.track[1], new RegExp(profile.name));
    // The card's record is one of that profile's readings.
    assert.ok(profile && HistoricalCrew.PROFILES.find((p) => p.profile.id === profile.id).records.some((r) => card.title.startsWith(r.record + ":")), card.title);
    linked++;
  }
  assert.equal(linked, 13);
});

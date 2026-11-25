import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { chunkId, exportResearch, OUTPUT } from "../scripts/export-research.mjs";

test("the voice assistant's evidence matches the website's Evidence library", async () => {
  // Fails when ui/research-library.js changes without re-running the export (npm run build).
  assert.equal(await readFile(OUTPUT, "utf8"), exportResearch());
});

test("every exported passage has a unique, linkable id", () => {
  const { passages } = JSON.parse(exportResearch());
  assert.ok(passages.length > 0);
  const ids = passages.map((p) => `${p.documentId}/${p.chunkId}`);
  assert.equal(new Set(ids).size, ids.length);
  for (const p of passages) {
    assert.match(p.chunkId, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.equal(chunkId(p.title.replace(/ \([^)]*\)$/, "")), p.chunkId);
    assert.ok(p.sources.length > 0 && p.excerpt.length > 0);
  }
});

test("historical measurements retain core context and supplied provenance", () => {
  const { passages } = JSON.parse(exportResearch());
  const historical = passages.filter(p => p.documentId === 'historical');
  assert.equal(historical.length, 40);
  const first = historical.find(p => p.title.startsWith('NASA-VITAL-001:'));
  for (const detail of ['Mercury-Atlas 9', 'Gordon Cooper', 'Prelaunch', '72 bpm', '113 mmHg', '19770026836.pdf', 'page 420', 'Table 40-III', 'not been independently verified']) assert.ok(first.excerpt.includes(detail), detail);
  assert.ok(historical.every(p => p.excerpt.includes('Quality notes:') && p.tracking.includes('not clinical thresholds')));
  assert.equal(historical[0].sources[0].url, './assets/ALL_NUMERIC_METRICS_LONG.csv');
});

test("the online assistant finds Evidence library entries for spoken questions", async () => {
  const { runInNewContext } = await import("node:vm");
  const sandbox = { module: { exports: {} } };
  runInNewContext(await readFile(new URL("../ui/research-library.js", import.meta.url), "utf8"), sandbox);
  const top = (q) => sandbox.module.exports.rank(q, 1)[0]?.title;
  assert.equal(top("How hot is Venus?"), "Planet Venus");
  assert.equal(top("How cold does Mercury get?"), "Planet Mercury");
  assert.match(top("Tell me about the Mercury mission crew"), /^NASA-VITAL-\d+: Mercury-Atlas/);
  assert.equal(top("How much radiation did the Apollo 10 crew get?"), "Radiation dose (Apollo 10)");
  assert.equal(top("Why does morale drop in the third quarter?"), "Morale in the third quarter");
});

import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import vm from "node:vm";

const root = fileURLToPath(new URL("../ui/", import.meta.url));

test("retained health screens render and removed routes and commands are unavailable", async () => {
  const events = { addEventListener() {}, dispatchEvent() {}, removeEventListener() {} };
  const storage = new Map();
  const context = vm.createContext({
    ...events, console, Date, URLSearchParams, URL, FormData, crypto, structuredClone,
    setTimeout() {}, clearTimeout() {}, setInterval() {}, clearInterval() {},
    Event: class {}, CustomEvent: class {},
    location: { hash: "#status" }, navigator: {},
    document: {
      ...events, getElementById: (id) => id === "modal" ? events : null,
      querySelector: (selector) => ["#modal", ".mobile-scrim"].includes(selector) ? events : null,
      querySelectorAll: () => [], hidden: false,
    },
    localStorage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
  });
  vm.runInContext("window = globalThis;", context);
  const html = await readFile(resolve(root, "index.html"), "utf8");
  for (const [, name] of html.matchAll(/<script src="([^"]+)" defer>/g)) {
    let source = await readFile(resolve(root, name), "utf8");
    if (name === "app.js") source = source.slice(0, source.indexOf("hydrateIcons();persist();render();"));
    vm.runInContext(source, context, { filename: name });
    if (name === "app.js") break;
  }
  // The demo workspace holds the four fictional sample crew and the two historical profiles.
  assert.deepEqual(Array.from(vm.runInContext("state.data.demo.crew.map(p=>p.name).sort()", context)), ['Crew 01','Crew 02','Crew 03','Crew 04','Gordon Cooper','Scott Carpenter']);
  assert.equal(vm.runInContext("state.data.demo.entries.filter(e=>e.crewId?.startsWith('crew-')).length", context), 112);
  assert.equal(vm.runInContext("state.data.demo.entries.filter(e=>e.crewId?.startsWith('hist-')).length", context), 13);
  // The voice assistant's crew (server/data/seed.json, from scripts/seed-voice-crew.cjs) match the website's.
  const seed = JSON.parse(await readFile(new URL("../server/data/seed.json", import.meta.url), "utf8"));
  const website = JSON.parse(vm.runInContext("JSON.stringify(state.data.demo)", context));
  assert.deepEqual(seed.crew.map((c) => c.id).sort(), website.crew.map((c) => c.id).sort(), "same crew ids");
  const fields = { heart_rate: "hr", spo2: "spo2", systolic_bp: "sys", diastolic_bp: "dia", temperature: "temp", respiratory_rate: "rr" };
  for (const c of seed.crew) {
    const records = website.entries.filter((e) => e.crewId === c.id).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    assert.equal(c.fullName, website.crew.find((p) => p.id === c.id).name);
    for (const r of seed.summaries[c.id].readings) {
      assert.equal(r.value, records.filter((e) => Number.isFinite(e[fields[r.kind]])).at(-1)[fields[r.kind]], `${c.id} ${r.kind}; rerun node scripts/seed-voice-crew.cjs`);
    }
  }
  const personalBefore = vm.runInContext("JSON.stringify(state.data.personal)", context);
  // A workspace saved while the sample crew were left out gets them back, once, without duplicates.
  vm.runInContext("state.data.demo.crew = state.data.demo.crew.filter(p=>p.id.startsWith('hist-')); state.data.demo.entries=state.data.demo.entries.filter(e=>e.crewId.startsWith('hist-')); initCrewData(); initCrewData();", context);
  assert.equal(vm.runInContext("state.data.demo.crew.length", context), 6);
  assert.equal(vm.runInContext("state.data.demo.entries.length", context), 125);
  assert.equal(vm.runInContext("state.data.demo.crew.find(p=>p.id==='crew-03').access", context), 'medical');
  assert.equal(vm.runInContext("JSON.stringify(state.data.personal)", context), personalBefore);
  assert.ok(vm.runInContext("demoNotice()", context).includes('Show sample crew'));
  // Clustered historical readings get evenly spaced axis ticks, not one date per point.
  for (const width of [360, 920]) {
    const chart = vm.runInContext(`chartSVG(true, ${width})`, context);
    assert.ok(chart.includes(`viewBox="0 0 ${width} 280"`));
    assert.ok(chart.includes('preserveAspectRatio="xMidYMid meet"'));
    const ticks = [...chart.matchAll(/class="chart-axis-tick" x="([\d.]+)"/g)].map(m=>Number(m[1]));
    assert.ok(ticks.length >= 2 && ticks.length <= 5);
    for(let i=1;i<ticks.length;i++) assert.ok(ticks[i]-ticks[i-1]>=100);
    assert.equal((chart.match(/class="point-hit"/g)||[]).length, vm.runInContext('chartData().length',context));
  }
  for (const page of ["missionStatusPage", "crewDashboardPage", "logPage", "trendsPage", "routinePage", "carePage", "missionWellbeingPage", "missionExercisePage", "skinPage", "missionRisksPage", "anatomyLabPage", "missionResearchPage", "voicePage"]) {
    assert.ok(vm.runInContext(`${page}()`, context).includes("<"), page);
  }
  assert.ok(vm.runInContext("MissionLogic.reportSections(missionReportData()).length", context) > 0);
  // Health log and Health trends are one page; #trends is kept as an alias.
  const logHtml = vm.runInContext("logPage()", context);
  assert.ok(logHtml.includes('id="health-trends"') && logHtml.includes('id="health-records"'));
  assert.ok(logHtml.includes('id="trend-metric"') && logHtml.includes('id="log-search"'));
  context.location.hash = "#trends";
  assert.equal(vm.runInContext("currentPage()", context), "log");
  assert.ok(!html.includes('data-nav="trends"'));
  // Sleep & wellbeing, Exercise and Skin & wounds are Health assessment tabs now.
  for (const tab of ["wellbeing", "exercise", "skin"]) {
    assert.ok(!html.includes(`data-nav="${tab}"`), tab);
    context.location.hash = `#${tab}`;
    assert.equal(vm.runInContext("currentPage()", context), "care", tab);
    vm.runInContext(`careTab = "${tab}"`, context);
    const careHtml = vm.runInContext("carePage()", context);
    assert.ok(careHtml.includes(`data-care-tab="${tab}"`) && careHtml.includes('class="care-section-head"'), tab);
  }
  vm.runInContext('careTab = "assessment"', context);
  vm.runInContext(await readFile(resolve(root, "condition-anatomy.js"), "utf8"), context);
  vm.runInContext(await readFile(resolve(root, "assistant-features.js"), "utf8"), context);
  vm.runInContext(await readFile(resolve(root, "assistant-actions.js"), "utf8"), context);
  for (const page of ["solar-system", "supplies", "earthlink", "brief", "systems", "model", "overview"]) {
    context.location.hash = `#${page}`;
    assert.equal(vm.runInContext("currentPage()", context), "status");
    assert.throws(() => vm.runInContext(`OrbitSiteActions.validate({kind:'navigate',page:'${page}'})`, context));
    assert.ok(!html.includes(`data-nav="${page}"`));
  }
});

test("every local stylesheet, script, font, and offline shell asset exists", async () => {
  const html = await readFile(resolve(root, "index.html"), "utf8");
  for (const [, url] of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    if (/^(?:https?:|data:|mailto:|tel:|#|\/voice\/)/.test(url)) continue;
    assert.ok((await stat(resolve(root, url.split(/[?#]/)[0]))).isFile(), url);
  }
  const fonts = await readFile(resolve(root, "assets/fonts.css"), "utf8");
  for (const [, url] of fonts.matchAll(/url\(([^)]+)\)/g)) {
    assert.ok((await stat(resolve(root, "assets", url.replace(/["']/g, "")))).isFile(), url);
  }
  const worker = await readFile(resolve(root, "sw.js"), "utf8");
  const shell = worker.slice(worker.indexOf("const SHELL"), worker.indexOf("const ANATOMY"));
  for (const [, url] of shell.matchAll(/'\.\/([^']+)'/g)) {
    assert.ok((await stat(resolve(root, url))).isFile(), url);
  }
});

test("all imported application scripts have valid JavaScript syntax", async () => {
  for (const name of await readdir(root)) {
    if (!/\.m?js$/.test(name)) continue;
    // Some .js files are ES modules loaded dynamically by the classic scripts.
    const result = spawnSync(process.execPath, ["--check", "--input-type=module"], {
      input: await readFile(resolve(root, name)), encoding: "utf8",
    });
    assert.equal(result.status, 0, `${name}: ${result.stderr}`);
  }
});

test("all anatomy geometry chunks referenced by the atlases are included", async () => {
  for (const [atlasName, prefix] of [["atlas.json", "body"], ["expanded-atlas.json", "expanded"]]) {
    const atlas = JSON.parse(await readFile(resolve(root, "models", atlasName), "utf8"));
    const chunks = new Map();
    for (const part of atlas.parts) {
      if (!chunks.has(part.chunk)) {
        const chunk = prefix === "body" ? `body-${part.chunk}` : part.chunk;
        const file = resolve(root, "models", `${chunk}.bin`);
        chunks.set(part.chunk, (await stat(file)).size);
      }
      for (const [offset, bytes, count] of [
        [part.positions, 4, part.vertexCount * 3],
        [part.normals, 2, part.vertexCount * 3],
        [part.indices, 4, part.indexCount],
      ]) {
        assert.ok(Number.isInteger(offset) && offset >= 0, part.id);
        assert.ok(offset + bytes * count <= chunks.get(part.chunk), `${part.id}: truncated geometry`);
      }
    }
  }
});

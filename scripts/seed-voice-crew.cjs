// The voice assistant's crew: rebuilds server/data/seed.json crew and summaries from the
// website's demo workspace, so the assistant and the website share one crew:
//   - Crew 01 to 04, the fictional sample crew (ui/crew.js, ui/app.js seedDemo, ui/mission.js)
//   - Gordon Cooper and Scott Carpenter, the historical profiles (ui/historical-crew.js)
// The website's scripts are run here as the page runs them, and the latest readings are read
// from the result. Sample readings roll forward on the website, so they are stored with
// "dailyAt" (local time of day) and the server dates them today (server/orbit_server/store.py).
// Run: node scripts/seed-voice-crew.cjs
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const ui = path.join(root, "ui");

/** The website's demo workspace, built by its own scripts without a browser. */
function websiteDemo() {
  const events = { addEventListener() {}, dispatchEvent() {}, removeEventListener() {} };
  const storage = new Map();
  const context = vm.createContext({
    ...events, console, Date, URLSearchParams, URL, crypto, structuredClone,
    setTimeout() {}, clearTimeout() {}, setInterval() {}, clearInterval() {},
    Event: class {}, CustomEvent: class {}, FormData: class {},
    location: { hash: "#status" }, navigator: {},
    document: { ...events, getElementById: (id) => (id === "modal" ? events : null), querySelector: (selector) => (["#modal", ".mobile-scrim"].includes(selector) ? events : null), querySelectorAll: () => [], hidden: false },
    localStorage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
  });
  vm.runInContext("window = globalThis;", context);
  const html = fs.readFileSync(path.join(ui, "index.html"), "utf8");
  for (const [, name] of html.matchAll(/<script src="([^"]+)" defer>/g)) {
    let source = fs.readFileSync(path.join(ui, name), "utf8");
    if (name === "app.js") source = source.slice(0, source.indexOf("hydrateIcons();persist();render();"));
    vm.runInContext(source, context, { filename: name });
    if (name === "app.js") break;
  }
  return JSON.parse(vm.runInContext("JSON.stringify({ demo: state.data.demo, moods: moodNames })", context));
}

const ROLE = { "Mission commander": "commander", Pilot: "pilot", "Mission specialist": "mission_specialist", "Flight engineer": "flight_engineer" };
const STRESS = { 1: "Very low", 2: "Low", 3: "Moderate", 4: "High", 5: "Very high" };
const KINDS = [
  ["heart_rate", "Heart rate", "bpm", "hr"],
  ["spo2", "SpO₂", "%", "spo2"],
  ["systolic_bp", "Systolic BP", "mmHg", "sys"],
  ["diastolic_bp", "Diastolic BP", "mmHg", "dia"],
  ["temperature", "Temperature", "°C", "temp"],
  ["respiratory_rate", "Respiratory rate", "/min", "rr"],
];
const localTime = (iso) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

const { demo, moods } = websiteDemo();
const historical = { "hist-ma9": "COOPER", "hist-ma7": "CARPENTER" };
const order = ["crew-01", "crew-02", "crew-03", "crew-04", "hist-ma9", "hist-ma7"];
const crew = [], summaries = {};
for (const id of order) {
  const p = demo.crew.find((c) => c.id === id);
  if (!p) throw new Error(`The website's demo workspace has no ${id}.`);
  const isHistorical = id in historical;
  const words = p.name.split(" ");
  crew.push({
    id,
    callsign: isHistorical ? historical[id] : p.name.replace(" ", "").toUpperCase(), // CREW01
    fullName: p.name,
    role: isHistorical ? "pilot" : ROLE[p.role],
    initials: isHistorical ? words[0][0] + words[1][0] : words[1],
    isCrewLeader: p.access === "leader",
    isMedicalOfficer: p.access === "medical",
  });
  const records = demo.entries.filter((e) => e.crewId === id).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const readings = [];
  for (const [kind, label, unit, field] of KINDS) {
    const latest = records.filter((e) => Number.isFinite(e[field])).at(-1);
    if (!latest) continue;
    const reading = { kind, label, value: latest[field], unit };
    if (isHistorical) Object.assign(reading, { recordedAt: latest.at, source: `historical record ${latest.id.replace(`${id}-`, "")} (${p.mission})` });
    else Object.assign(reading, { dailyAt: localTime(latest.at), source: "sample crew record (fictional)" });
    readings.push(reading);
  }
  const checkIn = records.filter((e) => e.wellbeing && Number.isFinite(e.mood)).at(-1);
  const wellbeing = checkIn && !isHistorical
    ? { dailyAt: localTime(checkIn.at), mood: moods[checkIn.mood], stress: STRESS[checkIn.wellbeing.stress], note: checkIn.notes || null }
    : null;
  summaries[id] = { crewId: id, readings, wellbeing };
}

const seedPath = path.join(root, "server", "data", "seed.json");
const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
seed._note = "The voice assistant's crew, the same as the website's demo workspace: Crew 01 to 04 (fictional sample crew; readings dated today by the server) and Gordon Cooper and Scott Carpenter (historical NASA records, user-supplied transcription, not independently verified). Regenerate with node scripts/seed-voice-crew.cjs.";
seed.crew = crew;
seed.summaries = summaries;
fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2) + "\n");
console.log(`Wrote ${crew.length} crew to ${seedPath}.`);

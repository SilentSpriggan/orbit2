import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

let server;
let LocalMediaManager;
let PipecatVoiceSession;
let transcript;
let parseVitalDraft;
let buildSharePreview;
let MockVoiceSession;
let useVoiceSession;
let CrewProvider;
let ToastProvider;

before(async () => {
  // Use the app's existing TypeScript and import configuration; no extra test framework.
  server = await createServer({
    server: { middlewareMode: true, hmr: false, watch: null },
    ssr: { noExternal: ["@pipecat-ai/small-webrtc-transport"] },
    define: { "import.meta.env.VITE_USE_MOCKS": '"true"' },
  });
  ({ LocalMediaManager } = await server.ssrLoadModule("/src/modules/assistant/pipecat/localMediaManager.ts"));
  ({ PipecatVoiceSession } = await server.ssrLoadModule("/src/modules/assistant/pipecat/adapter.ts"));
  ({ transcript } = await server.ssrLoadModule("/src/modules/assistant/hooks/transcriptStore.ts"));
  ({ parseVitalDraft, buildSharePreview } = await server.ssrLoadModule("/src/modules/assistant/tools/inputs.ts"));
  ({ MockVoiceSession } = await server.ssrLoadModule("/src/modules/assistant/mocks/MockVoiceSession.ts"));
  ({ useVoiceSession } = await server.ssrLoadModule("/src/modules/assistant/hooks/useVoiceSession.ts"));
  ({ CrewProvider } = await server.ssrLoadModule("/src/shared/context/CrewContext.tsx"));
  ({ ToastProvider } = await server.ssrLoadModule("/src/shared/ui/Toast.tsx"));
});

after(async () => { await server?.close(); });

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function microphone() {
  const track = { enabled: true, stopped: false, stop() { this.stopped = true; }, getSettings: () => ({}) };
  return { track, getTracks: () => [track], getAudioTracks: () => [track] };
}

function mockDevices(context, getUserMedia) {
  const previous = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia, enumerateDevices: async () => [] },
  });
  context.after(() => {
    if (previous) Object.defineProperty(navigator, "mediaDevices", previous);
    else delete navigator.mediaDevices;
  });
}

test("a microphone granted after disconnect is stopped and never published", async (context) => {
  const permission = deferred();
  mockDevices(context, () => permission.promise);
  const manager = new LocalMediaManager();
  const started = context.mock.fn();
  manager.setClientOptions({ callbacks: { onTrackStarted: started } });
  const initializing = manager.initialize();
  await manager.disconnect();
  const stream = microphone();
  permission.resolve(stream);
  await initializing;
  assert.equal(stream.track.stopped, true);
  assert.equal(manager.tracks().local.audio, undefined);
  assert.equal(started.mock.callCount(), 0);
});

test("muting while microphone permission is pending keeps the arriving track muted", async (context) => {
  const permission = deferred();
  mockDevices(context, () => permission.promise);
  const manager = new LocalMediaManager();
  manager.enableMic(false);
  await manager.initialize();
  const started = deferred();
  manager.onLocalTrackReplaced = () => started.resolve();
  manager.enableMic(true);
  manager.enableMic(false);
  const stream = microphone();
  permission.resolve(stream);
  await started.promise;
  assert.equal(stream.track.enabled, false);
  await manager.disconnect();
});

test("the latest device choice wins even when an older request finishes last", async (context) => {
  const first = deferred();
  const second = deferred();
  mockDevices(context, ({ audio }) => audio.deviceId.exact === "first" ? first.promise : second.promise);
  const manager = new LocalMediaManager();
  manager.enableMic(false);
  await manager.initialize();
  const firstChange = manager.updateMic("first");
  const secondChange = manager.updateMic("second");
  const latest = microphone();
  second.resolve(latest);
  await secondChange;
  const obsolete = microphone();
  first.resolve(obsolete);
  await firstChange;
  assert.equal(manager.tracks().local.audio, latest.track);
  assert.equal(obsolete.track.stopped, true);
  await manager.disconnect();
});

test("a failed track replacement stops both microphone streams", async (context) => {
  const first = microphone();
  const second = microphone();
  let current = first;
  mockDevices(context, async () => current);
  const manager = new LocalMediaManager();
  await manager.initialize();
  current = second;
  manager.onLocalTrackReplaced = async () => { throw new Error("Transport closed"); };
  await assert.rejects(manager.updateMic("second"), /Transport closed/);
  assert.equal(first.track.stopped, true);
  assert.equal(second.track.stopped, true);
  assert.equal(manager.tracks().local.audio, undefined);
});

test("tool calls from separate sessions keep separate transcript rows", async () => {
  transcript.clear();
  for (let index = 0; index < 2; index++) {
    const session = new PipecatVoiceSession({
      settings: null,
      clientTools: ["get_current_context"],
      handleTool: async () => ({ status: "succeeded", result: { index } }),
    });
    session.on("toolCall", (call) => transcript.call(call));
    // Exercise the adapter's tool entry point without a live WebRTC server.
    await session.runClientTool("get_current_context", {});
  }
  const state = transcript.get();
  assert.equal(state.items.length, 2);
  assert.equal(Object.keys(state.calls).length, 2);
  assert.ok(Object.values(state.calls).every((call) => call.status === "succeeded"));
});

test("ending a session closes pending confirmations without altering completed calls", () => {
  transcript.clear();
  transcript.call({ id: "pending", name: "log_vital", status: "awaiting_confirmation" });
  transcript.call({ id: "done", name: "log_vital", status: "succeeded" });
  transcript.closeAll();
  assert.equal(transcript.get().calls.pending.status, "declined");
  assert.ok(transcript.get().calls.pending.finishedAt);
  assert.equal(transcript.get().calls.done.status, "succeeded");
});

test("session shutdown blocks restart until disconnect and context cleanup finish", async (context) => {
  const disconnecting = deferred();
  const clearing = deferred();
  const connect = context.mock.method(MockVoiceSession.prototype, "connect", async () => {});
  const disconnect = context.mock.method(MockVoiceSession.prototype, "disconnect", () => disconnecting.promise);
  const registry = {
    sharedContext: [],
    handleTool: async () => ({ status: "succeeded" }),
    declineAll: context.mock.fn(),
    consumeNavigation: context.mock.fn(),
    clearShared: context.mock.fn(() => clearing.promise),
  };
  let session;
  function Probe() {
    session = useVoiceSession(registry, null);
    return null;
  }
  // Render just to initialize the hook. Drive its public methods directly;
  // this test does not simulate effects or browser rendering.
  renderToString(createElement(CrewProvider, null,
    createElement(ToastProvider, null, createElement(Probe))));

  await session.connect();
  const ending = session.disconnect();
  assert.equal(session.disconnect(), ending);
  await session.connect();
  assert.equal(connect.mock.callCount(), 1);
  assert.equal(disconnect.mock.callCount(), 1);

  disconnecting.resolve();
  await Promise.resolve();
  assert.equal(registry.clearShared.mock.callCount(), 1);
  await session.connect();
  assert.equal(connect.mock.callCount(), 1);

  clearing.resolve();
  await ending;
  await session.connect();
  assert.equal(connect.mock.callCount(), 2);
  await session.disconnect();
});

test("vital validation accepts aliases and rejects invalid values, units, and inherited keys", () => {
  assert.equal(parseVitalDraft({ kind: "pulse", value: "72" }, "crew-1").draft.kind, "heart_rate");
  for (const args of [
    { kind: "heart_rate", value: Infinity },
    { kind: "heart_rate", value: 999 },
    { kind: "heart_rate", value: 72, unit: "C" },
    { kind: "constructor", value: 72 },
  ]) {
    assert.equal(parseVitalDraft(args, "crew-1").draft, null);
  }
});

test("share previews exclude private wellbeing and unknown sections", () => {
  const subject = { id: "crew-1", callsign: "VEGA" };
  const viewer = { id: "crew-2", isCrewLeader: false, isMedicalOfficer: false };
  const summary = { readings: [], wellbeing: { mood: "Good", stress: "Low", note: "Private" } };
  const preview = buildSharePreview(["wellbeing", "constructor"], subject, viewer, summary);
  assert.deepEqual(preview.sections, []);
  assert.equal(preview.content.wellbeing, undefined);
  assert.equal(preview.rows.length, 0);
  assert.equal(preview.withheld.length, 2);
  const ownPreview = buildSharePreview(["wellbeing"], subject, subject, summary);
  assert.equal(ownPreview.content.wellbeing.note, "Private");
});

test("the first reply starts its own bubble instead of continuing the spoken greeting", () => {
  const session = new PipecatVoiceSession({ settings: null, clientTools: [], handleTool: async () => ({ status: "succeeded" }) });
  const events = [];
  session.on("botTranscript", (t) => events.push(t));
  const cb = session.callbacks();
  // The greeting is spoken directly (no LLM), so no onBotLlmStopped follows it.
  cb.onBotOutput({ text: "Hi, I'm the ORBIT crew assistant.", output_type: "sentence" });
  cb.onBotLlmStarted();
  cb.onBotOutput({ text: "The Anatomy lab is open.", output_type: "sentence" });
  cb.onBotLlmStopped();
  assert.deepEqual(
    events.map((e) => [e.text, e.final]),
    [["Hi, I'm the ORBIT crew assistant.", false], ["", true], ["The Anatomy lab is open.", false], ["", true]],
  );
});

test("sentences spoken after the LLM finishes stay in the same reply bubble", (context) => {
  if (typeof window === "undefined") {
    globalThis.window = globalThis;
    context.after(() => { delete globalThis.window; });
  }
  const session = new PipecatVoiceSession({ settings: null, clientTools: [], handleTool: async () => ({ status: "succeeded" }) });
  const events = [];
  session.on("botTranscript", (t) => events.push(t));
  const cb = session.callbacks();
  cb.onBotLlmStarted();
  cb.onBotStartedSpeaking();
  cb.onBotOutput({ text: "The Anatomy lab is open.", output_type: "sentence" });
  // The LLM is done, but the second sentence is still being spoken.
  cb.onBotLlmStopped();
  cb.onBotOutput({ text: "Which region would you like?", output_type: "sentence" });
  cb.onBotStoppedSpeaking();
  assert.deepEqual(
    events.map((e) => [e.text, e.final]),
    [["The Anatomy lab is open.", false], [" Which region would you like?", false], ["", true]],
  );
});

test("the first reply keeps its ending when spoken sentences take over from the word stream", () => {
  const session = new PipecatVoiceSession({ settings: null, clientTools: [], handleTool: async () => ({ status: "succeeded" }) });
  let text = "";
  session.on("botTranscript", (t) => { text += t.text; });
  const cb = session.callbacks();
  cb.onBotLlmStarted();
  // Before any bot-output, the transcript follows the LLM's words.
  for (const w of ["The lab is open.", " Which", " region", " would"]) cb.onBotLlmText({ text: w });
  cb.onBotOutput({ text: "The lab is open.", output_type: "sentence" });
  cb.onBotLlmText({ text: " you" }); // ignored once spoken sentences arrive
  cb.onBotOutput({ text: "Which region would you like?", output_type: "sentence" });
  assert.equal(text, "The lab is open. Which region would you like?");
});

test("only the exact spoken phrases approve a save or a share", async () => {
  const { isVoiceSaveApproval, isVoiceShareApproval } = await server.ssrLoadModule("/src/modules/assistant/tools/definitions.ts");
  for (const said of ["Confirm save", "confirm save.", "Confirm, save!", "  CONFIRM SAVE  "]) assert.ok(isVoiceSaveApproval(said), said);
  for (const said of ["save", "confirm", "please confirm save", "confirm save the reading", "don't confirm save", "Confirm share"]) {
    assert.ok(!isVoiceSaveApproval(said), said);
  }
  assert.ok(isVoiceShareApproval("Confirm, share."));
  assert.ok(!isVoiceShareApproval("Confirm save"));
});

test("assistant links pass the crew id or name to the website, which matches it", async () => {
  const { websiteHref } = await server.ssrLoadModule("/src/shared/embed.ts");
  assert.equal(websiteHref("/crew?crew=Gordon Cooper"), "/#crew?crew=Gordon Cooper");
  assert.equal(websiteHref("/log?crew=hist-ma7"), "/#log?crew=hist-ma7");
  assert.equal(websiteHref("/log?crew=COOPER"), "/#log?crew=COOPER");
  assert.equal(websiteHref("/evidence"), "/#research");
});

test("crew summaries date readings from other days, such as historical records", async () => {
  const { summarizeCrew } = await server.ssrLoadModule("/src/modules/assistant/tools/inputs.ts");
  const cooper = { id: "hist-ma9", callsign: "COOPER", fullName: "Gordon Cooper", role: "pilot", initials: "GC", isCrewLeader: false, isMedicalOfficer: false };
  const now = new Date().toISOString();
  const { text } = summarizeCrew(cooper, { crewId: "hist-ma9", wellbeing: null, readings: [
    { kind: "heart_rate", label: "Heart rate", value: 80, unit: "bpm", recordedAt: "1963-05-17T17:29:00Z" },
    { kind: "heart_rate", label: "Heart rate", value: 75, unit: "bpm", recordedAt: now },
  ] }, cooper);
  assert.match(text, /Heart rate 80 bpm at 1963-05-17 17:29Z/);
  assert.match(text, new RegExp(`Heart rate 75 bpm at ${now.slice(11, 16)}Z`), "today's reading keeps the time only");
});

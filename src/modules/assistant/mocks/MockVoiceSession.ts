import { formatUtcTime } from "../../../shared/format";
import { SessionEmitter } from "../session/emitter";
import { TurnTracker } from "../session/turnTracker";
import type { SessionEvents, VoiceSession, VoiceSessionOptions } from "../session/VoiceSession";
import { toolPermission } from "../tools/definitions";
import type { Citation, ConnectionState, PipelineMetrics, ToolCallEvent, ToolOutcome, TurnState, VoiceSettings } from "../types";
import { MockAudio } from "./mockAudio";

/** Controls exposed to the mock-mode dev panel. */
export interface MockControls {
  forceTurnState(s: TurnState | null): void;
  triggerError(fatal: boolean): void;
  playNextTurn(): void;
  setAutoPlay(on: boolean): void;
  /** Simulate the user saying the exact approval phrase. */
  sayConfirmShare(): void;
  readonly autoPlay: boolean;
  readonly scriptIndex: number;
  readonly scriptLength: number;
}

class Cancelled extends Error {
  constructor() {
    super("cancelled");
  }
}

const nowIso = () => new Date().toISOString();
const rand = (min: number, max: number) => Math.round(min + Math.random() * (max - min));

type Step = () => Promise<void>;

/**
 * A VoiceSession without WebRTC for mock mode. Plays a scripted conversation
 * through the same tool gate as the real session, so confirmations are real.
 */
export class MockVoiceSession implements VoiceSession, MockControls {
  private readonly em = new SessionEmitter();
  private readonly tracker = new TurnTracker((s) => this.em.emit("turnState", s));
  private readonly opts: VoiceSessionOptions;

  private audio: MockAudio | null = null;
  private connection: ConnectionState = "idle";
  private mic = true;
  private settings: VoiceSettings | null;
  private run: AbortController | null = null;
  private speech: AbortController | null = null;
  private busy = false;
  private turnSeq = 0;
  /** Stands in for the server's WebRTC pc_id so shared records are scoped the same way. */
  private readonly sessionId = `mock-${crypto.randomUUID()}`;
  private metrics: PipelineMetrics | null = null;
  private errorTimer: number | undefined;
  private autoTimer: number | undefined;

  autoPlay = true;
  scriptIndex = 0;
  private readonly script: Step[];

  constructor(opts: VoiceSessionOptions) {
    this.opts = opts;
    this.settings = opts.settings;
    this.script = [
      () => this.turnLogHeartRate(),
      () => this.turnBoneLoss(true),
      () => this.turnLeftKnee(true),
    ];
  }

  get scriptLength(): number {
    return this.script.length;
  }

  get micEnabled(): boolean {
    return this.mic;
  }

  on<E extends keyof SessionEvents>(event: E, cb: SessionEvents[E]): () => void {
    return this.em.on(event, cb);
  }

  /* ------------------------------------------------------------ */
  /* VoiceSession                                                  */
  /* ------------------------------------------------------------ */

  async connect(): Promise<void> {
    if (this.run) return;
    this.run = new AbortController();
    const run = this.run;
    this.tracker.update({ error: false });
    this.setConnection("connecting");
    this.audio = new MockAudio();
    const audio = this.audio;
    await audio.resume();
    if (run.signal.aborted) return;
    const hasMic = await audio.attachMic(null);
    if (run.signal.aborted) return;
    this.em.emit("micPermission", hasMic ? "granted" : "denied");
    this.mic = hasMic && this.mic;
    this.em.emit("micEnabled", this.mic);
    this.tracker.update({ micEnabled: this.mic });
    this.em.emit("tracksChanged");
    this.em.emit("pipelineHealth", { stt: "ready", llm: "ready", tts: "ready", vad: "ready", turn: "ready" });
    try {
      await this.sleep(700);
    } catch {
      return;
    }
    this.setConnection("connected");
    this.emitMetrics({ rttMs: rand(3, 9) });
    this.scheduleNext(1500);
  }

  async disconnect(): Promise<void> {
    window.clearTimeout(this.autoTimer);
    window.clearTimeout(this.errorTimer);
    this.run?.abort();
    this.run = null;
    this.speech?.abort();
    this.speech = null;
    this.busy = false;
    await this.audio?.close();
    this.audio = null;
    this.em.emit("tracksChanged");
    this.setConnection("disconnected");
    this.tracker.reset();
    this.setConnection("idle");
  }

  setMicEnabled(on: boolean): void {
    this.mic = on;
    this.audio?.setMicEnabled(on);
    this.tracker.update({ micEnabled: on });
    this.em.emit("micEnabled", on);
  }

  sendText(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (this.connection !== "connected") {
      this.em.emit("error", { code: "not_connected", message: "Start a session to send a message.", fatal: false });
      return;
    }
    window.clearTimeout(this.autoTimer);
    this.userText(trimmed);
    void this.exec(() => this.respondTo(trimmed));
  }

  interrupt(): void {
    if (!this.speech) return;
    this.speech.abort();
  }

  async setVoiceSettings(s: VoiceSettings): Promise<void> {
    this.settings = s;
  }

  async setInputDevice(deviceId: string): Promise<void> {
    if (!this.audio) return;
    const ok = await this.audio.attachMic(deviceId);
    this.em.emit("micPermission", ok ? "granted" : "denied");
    this.em.emit("tracksChanged");
  }

  getLocalAudioTrack(): MediaStreamTrack | null {
    return this.audio?.userTrack ?? null;
  }

  getBotAudioTrack(): MediaStreamTrack | null {
    return this.audio?.botTrack ?? null;
  }

  /* ------------------------------------------------------------ */
  /* Dev panel                                                     */
  /* ------------------------------------------------------------ */

  forceTurnState(s: TurnState | null): void {
    this.tracker.force(s);
  }

  triggerError(fatal: boolean): void {
    this.em.emit("error", {
      code: "mock_error",
      message: fatal ? "Simulated: the voice pipeline stopped responding." : "Simulated: TTS took too long; the reply was dropped.",
      fatal,
    });
    this.tracker.update({ error: true });
    window.clearTimeout(this.errorTimer);
    if (fatal) {
      this.run?.abort();
      this.setConnection("error");
      return;
    }
    this.errorTimer = window.setTimeout(() => this.tracker.update({ error: false }), 4000);
  }

  playNextTurn(): void {
    if (this.connection !== "connected" || this.busy) return;
    window.clearTimeout(this.autoTimer);
    const step = this.script[this.scriptIndex];
    if (!step) return;
    this.scriptIndex += 1;
    void this.exec(step);
  }

  setAutoPlay(on: boolean): void {
    this.autoPlay = on;
    if (on) this.scheduleNext(800);
    else window.clearTimeout(this.autoTimer);
  }

  sayConfirmShare(): void {
    if (this.connection !== "connected") return;
    void this.userVoice("Confirm share").catch(() => {});
  }

  /* ------------------------------------------------------------ */
  /* Script                                                        */
  /* ------------------------------------------------------------ */

  private async turnLogHeartRate(): Promise<void> {
    await this.userVoice("Log heart rate seventy-two for Vega.");
    await this.think();
    const outcome = await this.tool("log_vital", { crew_id: "c01", callsign: "VEGA", kind: "heart_rate", value: 72, unit: "bpm" });
    await this.sleep(rand(200, 350));
    if (outcome.status === "succeeded") {
      const at = typeof outcome.result.recordedAt === "string" ? outcome.result.recordedAt : nowIso();
      await this.botSay(`Saved heart rate 72 bpm for VEGA at ${formatUtcTime(at)}.`);
    } else if (outcome.status === "declined") {
      await this.botSay("Okay, I discarded that reading. Nothing was saved.");
    } else {
      await this.botSay(`I couldn't save that reading. ${outcome.error ?? ""}`.trim());
    }
  }

  private async turnBoneLoss(typed: boolean): Promise<void> {
    if (typed) this.userText("What does the evidence say about bone loss on long missions?");
    await this.think();
    const outcome = await this.tool("search_evidence", { query: "bone loss long-duration missions", k: 2 });
    await this.sleep(rand(250, 400));
    if (outcome.status !== "succeeded") {
      await this.botSay("I couldn't search the Evidence library just now.");
      return;
    }
    await this.botSay(
      "On long missions, bone mineral density in the spine and hip dropped by roughly 1 to 1.5 percent per month in early studies [1]. " +
        "Recovery after return can be incomplete: a year after landing, tibia bone strength was only partly regained [2]. " +
        "I can't say what this means for any one person. The full sources are in the Evidence library.",
      outcome.citations,
    );
  }

  private async turnLeftKnee(voice: boolean): Promise<void> {
    if (voice) await this.userVoice("Show me the left knee.");
    await this.think();
    const a = await this.tool("control_anatomy", { action: "focus_region", region: "knee_left" });
    const b = await this.tool("navigate", { path: "/anatomy?region=knee_left" });
    await this.sleep(200);
    if (a.status === "succeeded" && b.status === "succeeded") {
      await this.botSay("Opening the Anatomy lab with the left knee selected. Leaving this screen ends the voice session.");
    } else {
      await this.botSay("I couldn't open the Anatomy lab.");
    }
  }

  /** Replies for typed input outside the script. */
  private async respondTo(text: string): Promise<void> {
    const t = text.toLowerCase();
    if (/bone|evidence|skelet/.test(t)) return this.turnBoneLoss(false);
    if (/knee|anatomy/.test(t)) return this.turnLeftKnee(false);
    if (/explain|this screen/.test(t)) {
      await this.think();
      const ctx = await this.tool("get_current_context", {});
      const route = typeof ctx.result.route === "string" ? ctx.result.route : "/assistant";
      await this.botSay(
        `You're on the Crew assistant at ${route}. The top card shows what I'm doing and both voices as waveforms. ` +
          "The transcript is below it; tool calls appear inline. On the right are session health, latency and the tools I may use. " +
          "Anything that writes or shares data waits for a person to confirm.",
      );
      return;
    }
    if (/share/.test(t)) {
      await this.think();
      const out = await this.tool("share_record_with_assistant", { crew_id: "c01", sections: ["latest_vitals"] });
      await this.botSay(
        out.status === "succeeded" ? "Thanks. I can now use VEGA's latest vitals in this session only." : "Okay, nothing was shared.",
      );
      return;
    }
    if (/summary|readings|how is|latest/.test(t)) {
      await this.think();
      const out = await this.tool("get_crew_summary", { crew_id: "c01" });
      await this.botSay(out.resultSummary ? `${out.resultSummary}.` : "I couldn't load that summary.");
      return;
    }
    const num = /(\d+(?:\.\d+)?)/.exec(t);
    if (/log|heart|reading/.test(t) && num) {
      await this.think();
      const value = Number(num[1]);
      const out = await this.tool("log_vital", { crew_id: "c01", callsign: "VEGA", kind: "heart_rate", value, unit: "bpm" });
      await this.botSay(out.status === "succeeded" ? `Saved heart rate ${value} bpm for VEGA.` : "Okay, nothing was saved.");
      return;
    }
    if (/log|reading/.test(t)) {
      await this.think();
      await this.botSay("Which reading would you like to log, and for whom? For example: heart rate 72 for VEGA.");
      return;
    }
    await this.think();
    await this.botSay(
      "In this demo I follow a short script. Try asking me to log a reading, explain this screen, or what the evidence says about bone loss.",
    );
  }

  /* ------------------------------------------------------------ */
  /* Primitives                                                    */
  /* ------------------------------------------------------------ */

  private async exec(step: Step): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      await step();
    } catch (e) {
      if (!(e instanceof Cancelled)) console.error("[mock session]", e);
    } finally {
      this.busy = false;
      this.tracker.update({ awaitingReply: false, userSpeaking: false, botSpeaking: false, activeTool: null });
      if (this.connection === "connected") this.scheduleNext(3000);
    }
  }

  private scheduleNext(ms: number): void {
    window.clearTimeout(this.autoTimer);
    if (!this.autoPlay || this.scriptIndex >= this.script.length) return;
    this.autoTimer = window.setTimeout(() => this.playNextTurn(), ms);
  }

  private sleep(ms: number, signal: AbortSignal | undefined = this.run?.signal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!signal || signal.aborted) return reject(new Cancelled());
      const t = window.setTimeout(resolve, ms);
      signal.addEventListener(
        "abort",
        () => {
          window.clearTimeout(t);
          reject(new Cancelled());
        },
        { once: true },
      );
    });
  }

  private setConnection(c: ConnectionState): void {
    if (c === this.connection) return;
    this.connection = c;
    this.tracker.update({ connection: c });
    this.em.emit("connectionState", c);
  }

  private newTurn(): void {
    this.turnSeq += 1;
    this.metrics = { turnId: `t${this.turnSeq}`, sttMs: null, llmTtftMs: null, ttsTtfbMs: null, voiceToVoiceMs: null, rttMs: rand(3, 9) };
  }

  private emitMetrics(patch: Partial<PipelineMetrics>): void {
    const base = this.metrics ?? { turnId: "t0", sttMs: null, llmTtftMs: null, ttsTtfbMs: null, voiceToVoiceMs: null, rttMs: null };
    this.metrics = { ...base, ...patch };
    this.em.emit("metrics", this.metrics);
  }

  private userText(text: string): void {
    this.newTurn();
    this.em.emit("userTranscript", { text, final: true, at: nowIso(), method: "text" });
    this.tracker.update({ awaitingReply: true });
  }

  private async userVoice(text: string): Promise<void> {
    // Wait for the microphone to be on before simulating speech.
    while (!this.mic) await this.sleep(400);
    this.newTurn();
    const at = nowIso();
    this.tracker.update({ userSpeaking: true });
    this.em.emit("userSpeaking", true);
    this.audio?.speakUser(true);
    const words = text.split(" ");
    for (let i = 1; i <= words.length; i++) {
      await this.sleep(rand(230, 330));
      this.em.emit("userTranscript", { text: words.slice(0, i).join(" "), final: false, at, method: "voice" });
      if (i > words.length - 2) this.em.emit("endOfTurn", 0.3 + Math.random() * 0.2);
    }
    this.audio?.speakUser(false);
    await this.sleep(240);
    this.em.emit("endOfTurn", 0.87);
    this.tracker.update({ userSpeaking: false, awaitingReply: true });
    this.em.emit("userSpeaking", false);
    const stt = rand(180, 260);
    await this.sleep(stt);
    this.em.emit("userTranscript", { text, final: true, at, method: "voice" });
    this.emitMetrics({ sttMs: stt });
  }

  private async think(): Promise<void> {
    this.tracker.update({ awaitingReply: true });
    const ttft = rand(350, 700);
    await this.sleep(ttft);
    this.emitMetrics({ llmTtftMs: ttft });
  }

  private async tool(name: string, args: Record<string, unknown>): Promise<ToolOutcome> {
    const signal = this.run?.signal;
    if (!signal) throw new Cancelled();
    let call: ToolCallEvent = { id: crypto.randomUUID(), name, permission: toolPermission(name), args, status: "requested", startedAt: nowIso() };
    const emit = () => {
      this.em.emit("toolCall", { ...call });
      const active = call.status === "requested" || call.status === "running" || call.status === "awaiting_confirmation";
      this.tracker.update({ activeTool: active ? name : null });
    };
    emit();
    await this.sleep(rand(120, 220));
    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort();
    signal.addEventListener("abort", onAbort, { once: true });
    try {
      if (!this.opts.clientTools.includes(name)) throw new Error(`Unknown tool ${name}`);
      const outcome = await this.opts.handleTool(
        call,
        (patch) => {
          call = { ...call, ...patch };
          emit();
        },
        ctrl.signal,
        { sessionId: this.sessionId },
      );
      call = { ...call, status: outcome.status, resultSummary: outcome.resultSummary, error: outcome.error, finishedAt: nowIso() };
      emit();
      if (outcome.citations?.length) this.em.emit("citations", outcome.citations);
      if (signal.aborted) throw new Cancelled();
      return outcome;
    } catch (e) {
      if (e instanceof Cancelled || signal.aborted) throw new Cancelled();
      call = { ...call, status: "failed", error: e instanceof Error ? e.message : "Tool failed", finishedAt: nowIso() };
      emit();
      return { status: "failed", error: call.error, result: {} };
    } finally {
      signal.removeEventListener("abort", onAbort);
    }
  }

  private async botSay(text: string, citations?: Citation[]): Promise<void> {
    if (citations?.length) this.em.emit("citations", citations);
    const tts = rand(120, 200);
    await this.sleep(tts);
    const m = this.metrics;
    const v2v = (m?.sttMs ?? 0) + (m?.llmTtftMs ?? 0) + tts + rand(60, 140);
    this.emitMetrics({ ttsTtfbMs: tts, voiceToVoiceMs: v2v });

    this.speech = new AbortController();
    const speech = this.speech.signal;
    const runSignal = this.run?.signal;
    const onRunAbort = () => this.speech?.abort();
    runSignal?.addEventListener("abort", onRunAbort, { once: true });

    this.tracker.update({ awaitingReply: false, botSpeaking: true });
    this.em.emit("botSpeaking", true);
    this.audio?.speakBot(true);
    const speed = this.settings?.speed ?? 1;
    const words = text.split(" ");
    try {
      for (let i = 0; i < words.length; i++) {
        this.em.emit("botTranscript", { text: i === 0 ? words[i] : ` ${words[i]}`, final: false, at: nowIso() });
        await this.sleep(rand(190, 260) / speed, speech);
      }
    } catch {
      /* interrupted */
    } finally {
      runSignal?.removeEventListener("abort", onRunAbort);
      this.audio?.speakBot(false);
      this.speech = null;
      this.em.emit("botTranscript", { text: "", final: true, at: nowIso() });
      this.tracker.update({ botSpeaking: false });
      this.em.emit("botSpeaking", false);
    }
    if (runSignal?.aborted) throw new Cancelled();
  }
}

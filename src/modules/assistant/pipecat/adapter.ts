import {
  DeviceError,
  type BotOutputData,
  type ErrorData,
  type LLMFunctionCallInProgressData,
  type LLMFunctionCallStoppedData,
  type Participant,
  type PipecatMetricsData,
  type RTVIEventCallbacks,
  type RTVIMessage,
  type TranscriptData,
  type TransportState,
  type UserInputData,
} from "@pipecat-ai/client-js";
import { SessionEmitter } from "../session/emitter";
import { TurnTracker } from "../session/turnTracker";
import type { SessionEvents, VoiceSession, VoiceSessionOptions } from "../session/VoiceSession";
import { toolPermission } from "../tools/definitions";
import type { ConnectionState, PipelineMetrics, ToolCallEvent, VoiceSettings } from "../types";
import { createClient, type CreatedClient } from "./createClient";
import { botOutputKind, CLIENT_MESSAGE, parseMetrics, parseServerMessage, readRttMs, toConnectionState } from "./events";

export type { VoiceSession, SessionEvents, VoiceSessionOptions } from "../session/VoiceSession";

const ACTIVE_STATUSES: ReadonlyArray<ToolCallEvent["status"]> = ["requested", "running", "awaiting_confirmation"];
const RTT_POLL_MS = 2000;

const nowIso = () => new Date().toISOString();

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Unknown error";
}

function emptyMetrics(turnId: string, rttMs: number | null): PipelineMetrics {
  return { turnId, sttMs: null, llmTtftMs: null, ttsTtfbMs: null, voiceToVoiceMs: null, rttMs };
}

interface TrackedCall {
  call: ToolCallEvent;
  ctrl: AbortController | null; // null for server-side tools
}

/**
 * VoiceSession over Pipecat: SmallWebRTC transport → Silero VAD → Smart Turn v3
 * → local STT → Ollama → Kokoro, all on the local server. Everything
 * Pipecat-specific stays in this folder.
 */
export class PipecatVoiceSession implements VoiceSession {
  private readonly em = new SessionEmitter();
  private readonly tracker = new TurnTracker((s) => this.em.emit("turnState", s));
  private readonly opts: VoiceSessionOptions;

  private created: CreatedClient | null = null;
  private stopped = false;
  private connection: ConnectionState = "idle";
  private mic = true;
  private settings: VoiceSettings | null;

  private botAudio: HTMLAudioElement | null = null;
  private botTrack: MediaStreamTrack | null = null;
  private interruptTimer: number | undefined;

  // transcript bookkeeping
  private sawUserInput = false;
  private sawBotOutput = false;
  private botKind: "sentence" | "token" | null = null;
  private botEmitted = false;
  /** Text shown in the open reply bubble so far. */
  private botText = "";
  /** The open bubble was started by the LLM's word stream before spoken sentences arrived. */
  private botFromTokens = false;
  /** A reply ends when the LLM has finished and the voice has stopped, whichever is later. */
  private llmActive = false;
  private botVoiceActive = false;
  private seenSegments = new Set<number>();

  // metrics
  private turnSeq = 0;
  private turnStartedAt = 0;
  private metrics: PipelineMetrics = emptyMetrics("t0", null);
  private rtt: number | null = null;
  private rttTimer: number | undefined;

  // tools
  private calls = new Map<string, TrackedCall>();
  private pendingByName = new Map<string, string[]>();
  private toolCallIds = new Map<string, string>();

  constructor(opts: VoiceSessionOptions) {
    this.opts = opts;
    this.settings = opts.settings;
  }

  on<E extends keyof SessionEvents>(event: E, cb: SessionEvents[E]): () => void {
    return this.em.on(event, cb);
  }

  get micEnabled(): boolean {
    return this.mic;
  }

  /* ---------------------------------------------------------------- */
  /* Connection                                                        */
  /* ---------------------------------------------------------------- */

  async connect(): Promise<void> {
    if (this.created || this.stopped) return;
    this.tracker.update({ error: false });
    this.setConnection("connecting");
    try {
      await this.start(true);
    } catch (e) {
      if (this.stopped) return;
      if (e instanceof DeviceError) {
        // Microphone unavailable: keep text mode usable with a mic-less session.
        this.em.emit("micPermission", e.type === "permissions" ? "denied" : "unavailable");
        await this.teardown();
        if (this.stopped) return;
        this.setConnection("connecting");
        this.mic = false;
        this.em.emit("micEnabled", false);
        try {
          await this.start(false);
          return;
        } catch (e2) {
          if (this.stopped) return;
          this.fail(e2);
          throw e2;
        }
      }
      this.fail(e);
      throw e;
    }
  }

  private async start(withMic: boolean): Promise<void> {
    const created = createClient(this.callbacks());
    this.created = created;
    if (!withMic) created.media.enableMic(false);
    for (const name of this.opts.clientTools) {
      created.client.registerFunctionCallHandler(name, (fn) => this.runClientTool(fn.functionName, fn.arguments));
    }
    this.botAudio = new Audio();
    this.botAudio.autoplay = true;
    this.botAudio.volume = this.settings?.volume ?? 1;
    await created.client.connect();
    if (this.created !== created) {
      // The user ended the session while connection setup was still pending.
      await created.media.disconnect();
      await created.client.disconnect();
      return;
    }
    this.mic = withMic && created.client.isMicEnabled;
    this.em.emit("micEnabled", this.mic);
    this.tracker.update({ micEnabled: this.mic });
    if (this.settings) this.pushSettings(this.settings);
    this.startRttPolling();
  }

  async disconnect(): Promise<void> {
    this.stopped = true;
    await this.teardown();
    this.setConnection("disconnected");
    this.tracker.reset();
    this.setConnection("idle");
  }

  private async teardown(): Promise<void> {
    window.clearInterval(this.rttTimer);
    window.clearTimeout(this.interruptTimer);
    for (const { call, ctrl } of this.calls.values()) {
      if (ctrl && ACTIVE_STATUSES.includes(call.status)) ctrl.abort();
    }
    const created = this.created;
    this.created = null;
    if (created) {
      // Invalidate pending getUserMedia requests before waiting for the transport.
      await created.media.disconnect();
      created.client.unregisterAllFunctionCallHandlers();
      try {
        await created.client.disconnect();
      } catch {
        /* already closed */
      }
    }
    if (this.botAudio) {
      this.botAudio.pause();
      this.botAudio.srcObject = null;
      this.botAudio = null;
    }
    this.botTrack = null;
    this.em.emit("tracksChanged");
    this.pendingByName.clear();
    this.toolCallIds.clear();
    this.botKind = null;
    this.botEmitted = false;
    this.seenSegments.clear();
  }

  private fail(e: unknown): void {
    this.em.emit("error", { code: "connect_failed", message: errorMessage(e), fatal: true });
    this.tracker.update({ error: true });
    this.setConnection("error");
  }

  private setConnection(c: ConnectionState): void {
    if (c === this.connection) return;
    this.connection = c;
    this.tracker.update({ connection: c });
    this.em.emit("connectionState", c);
  }

  private startRttPolling(): void {
    window.clearInterval(this.rttTimer);
    this.rttTimer = window.setInterval(() => {
      const pc = this.created?.peerConnection();
      if (!pc) return;
      const ice = pc.iceConnectionState;
      if (ice === "disconnected" && this.connection === "connected") this.setConnection("reconnecting");
      else if ((ice === "connected" || ice === "completed") && this.connection === "reconnecting") this.setConnection("connected");
      readRttMs(pc)
        .then((ms) => {
          if (ms === null) return;
          this.rtt = ms;
          this.metrics = { ...this.metrics, rttMs: ms };
          this.em.emit("metrics", this.metrics);
        })
        .catch(() => {});
    }, RTT_POLL_MS);
  }

  /* ---------------------------------------------------------------- */
  /* Controls                                                          */
  /* ---------------------------------------------------------------- */

  setMicEnabled(on: boolean): void {
    this.mic = on;
    this.created?.client.enableMic(on);
    this.tracker.update({ micEnabled: on, userSpeaking: on ? this.tracker.snapshot.userSpeaking : false });
    this.em.emit("micEnabled", on);
  }

  sendText(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    this.newTurn();
    this.em.emit("userTranscript", { text: trimmed, final: true, at: nowIso(), method: "text" });
    this.tracker.update({ awaitingReply: true });
    const client = this.created?.client;
    if (!client) {
      this.em.emit("error", { code: "not_connected", message: "Start a session to send a message.", fatal: false });
      this.tracker.update({ awaitingReply: false });
      return;
    }
    client.sendText(trimmed).catch((e: unknown) => {
      this.tracker.update({ awaitingReply: false });
      this.em.emit("error", { code: "send_failed", message: errorMessage(e), fatal: false });
    });
  }

  interrupt(): void {
    const client = this.created?.client;
    if (!client) return;
    client.sendClientMessage(CLIENT_MESSAGE.interrupt, {});
    // Silence playback immediately; the server stops TTS and sends bot-stopped-speaking.
    if (this.botAudio) this.botAudio.muted = true;
    window.clearTimeout(this.interruptTimer);
    this.interruptTimer = window.setTimeout(() => {
      if (this.botAudio) this.botAudio.muted = false;
    }, 1500);
    this.closeBotTurn();
    this.botVoiceActive = false;
    this.tracker.update({ botSpeaking: false });
    this.em.emit("botSpeaking", false);
  }

  async setVoiceSettings(s: VoiceSettings): Promise<void> {
    this.settings = s;
    if (this.botAudio) this.botAudio.volume = s.volume;
    this.pushSettings(s);
  }

  private pushSettings(s: VoiceSettings): void {
    const client = this.created?.client;
    if (!client || this.connection !== "connected") return;
    // Volume is applied client-side only.
    const { volume: _volume, ...server } = s;
    void _volume;
    client.sendClientMessage(CLIENT_MESSAGE.voiceSettings, server);
  }

  async setInputDevice(deviceId: string): Promise<void> {
    await this.created?.client.updateMic(deviceId);
  }

  getLocalAudioTrack(): MediaStreamTrack | null {
    return this.created?.client.tracks().local.audio ?? null;
  }

  getBotAudioTrack(): MediaStreamTrack | null {
    return this.botTrack;
  }

  /* ---------------------------------------------------------------- */
  /* Turns & metrics                                                   */
  /* ---------------------------------------------------------------- */

  private newTurn(): void {
    this.turnSeq += 1;
    this.turnStartedAt = performance.now();
    this.metrics = emptyMetrics(`t${this.turnSeq}`, this.rtt);
  }

  private closeBotTurn(): void {
    if (this.botEmitted) this.em.emit("botTranscript", { text: "", final: true, at: nowIso() });
    this.botKind = null;
    this.botEmitted = false;
    this.botText = "";
    this.botFromTokens = false;
    this.seenSegments.clear();
  }

  private appendBot(text: string, kind: "sentence" | "token"): void {
    if (!text) return;
    if (this.botKind === null) this.botKind = kind;
    let chunk: string;
    if (kind === "sentence" && (this.botKind === "token" || this.botFromTokens)) {
      // The first spoken sentence of a session arrives after the LLM's word stream has
      // started this bubble, and the word stream stops then. Switch to sentences and, for
      // the rest of this bubble, add only what the words have not already shown.
      this.botKind = "sentence";
      this.botFromTokens = true;
      const sentence = text.trim();
      if (this.botText.includes(sentence)) return;
      let overlap = Math.min(sentence.length, this.botText.length);
      while (overlap > 0 && !this.botText.endsWith(sentence.slice(0, overlap))) overlap -= 1;
      chunk = overlap > 0 ? sentence.slice(overlap) : ` ${sentence}`;
    } else if (kind !== this.botKind) {
      return;
    } else {
      chunk = kind === "sentence" && this.botEmitted ? ` ${text.trim()}` : kind === "sentence" ? text.trim() : text;
    }
    if (!chunk || (this.botKind === "sentence" && !chunk.trim())) return;
    this.botText += chunk;
    this.botEmitted = true;
    this.em.emit("botTranscript", { text: chunk, final: false, at: nowIso() });
  }

  private onUserText(text: string, final: boolean, at: string | undefined): void {
    this.em.emit("userTranscript", { text, final, at: at || nowIso(), method: "voice" });
    if (final) this.tracker.update({ awaitingReply: true });
  }

  /* ---------------------------------------------------------------- */
  /* Tools                                                             */
  /* ---------------------------------------------------------------- */

  private emitCall(id: string): void {
    const tracked = this.calls.get(id);
    if (!tracked) return;
    this.em.emit("toolCall", { ...tracked.call });
    const active = Array.from(this.calls.values()).find((c) => ACTIVE_STATUSES.includes(c.call.status));
    this.tracker.update({ activeTool: active ? active.call.name : null });
  }

  private patchCall(id: string, patch: Partial<ToolCallEvent>): void {
    const tracked = this.calls.get(id);
    if (!tracked) return;
    tracked.call = { ...tracked.call, ...patch };
    if (!ACTIVE_STATUSES.includes(tracked.call.status) && !tracked.call.finishedAt) tracked.call.finishedAt = nowIso();
    this.emitCall(id);
  }

  private async runClientTool(name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Runs synchronously up to the first await, before client-js emits
    // llmFunctionCallInProgress, so the queued id can be matched to tool_call_id.
    const id = crypto.randomUUID();
    const queue = this.pendingByName.get(name) ?? [];
    queue.push(id);
    this.pendingByName.set(name, queue);
    const ctrl = new AbortController();
    const call: ToolCallEvent = { id, name, permission: toolPermission(name), args, status: "requested", startedAt: nowIso() };
    this.calls.set(id, { call, ctrl });
    this.emitCall(id);
    try {
      const outcome = await this.opts.handleTool(call, (patch) => this.patchCall(id, patch), ctrl.signal, {
        sessionId: this.created?.sessionId() ?? null,
      });
      this.patchCall(id, { status: outcome.status, resultSummary: outcome.resultSummary, error: outcome.error });
      if (outcome.citations?.length) this.em.emit("citations", outcome.citations);
      return { status: outcome.status, ...(outcome.error ? { error: outcome.error } : {}), ...outcome.result };
    } catch (e) {
      const message = ctrl.signal.aborted ? "Cancelled" : errorMessage(e);
      this.patchCall(id, { status: ctrl.signal.aborted ? "declined" : "failed", error: message });
      return { status: "failed", error: message };
    }
  }

  private onToolInProgress(d: LLMFunctionCallInProgressData): void {
    const name = d.function_name ?? "unknown_tool";
    const queue = this.pendingByName.get(name);
    if (this.opts.clientTools.includes(name) && queue?.length) {
      const internal = queue.shift();
      if (internal) this.toolCallIds.set(d.tool_call_id, internal);
      return;
    }
    // A server-side tool: show it as a running row.
    if (this.calls.has(d.tool_call_id)) return;
    this.toolCallIds.set(d.tool_call_id, d.tool_call_id);
    this.calls.set(d.tool_call_id, {
      ctrl: null,
      call: { id: d.tool_call_id, name, permission: toolPermission(name), args: d.arguments ?? {}, status: "running", startedAt: nowIso() },
    });
    this.emitCall(d.tool_call_id);
  }

  private onToolStopped(d: LLMFunctionCallStoppedData): void {
    const id = this.toolCallIds.get(d.tool_call_id) ?? d.tool_call_id;
    const tracked = this.calls.get(id);
    if (!tracked) return;
    if (tracked.ctrl) {
      // Client tool: the handler reports its own outcome; only react to cancellation.
      if (d.cancelled && ACTIVE_STATUSES.includes(tracked.call.status)) tracked.ctrl.abort();
      return;
    }
    const summary =
      typeof d.result === "string" ? d.result.slice(0, 160) : d.result !== undefined ? "Result returned to the model" : undefined;
    this.patchCall(id, { status: d.cancelled ? "declined" : "succeeded", resultSummary: summary, error: d.cancelled ? "Cancelled" : undefined });
  }

  /* ---------------------------------------------------------------- */
  /* Pipecat callbacks                                                 */
  /* ---------------------------------------------------------------- */

  private callbacks(): RTVIEventCallbacks {
    return {
      onTransportStateChanged: (s: TransportState) => {
        if (!this.created) return;
        this.setConnection(toConnectionState(s));
      },
      onBotReady: () => this.setConnection("connected"),
      onDisconnected: () => {
        if (this.connection !== "idle") this.setConnection("disconnected");
      },
      onError: (msg: RTVIMessage) => {
        const data = msg.data as Partial<ErrorData> | undefined;
        const fatal = Boolean(data?.fatal);
        const message = data?.error ?? data?.message ?? "Pipeline error";
        // Kokoro reports a text fragment that makes no sound (only punctuation, say) as a non-fatal
        // error. The rest of the reply still plays, so it is not worth a toast.
        if (!fatal && /completed with no audio/i.test(message)) {
          console.debug("ORBIT voice:", message);
          return;
        }
        this.em.emit("error", { code: "pipeline_error", message, fatal });
        if (fatal) this.tracker.update({ error: true });
      },
      onMessageError: (msg: RTVIMessage) => {
        const data = msg.data as Partial<ErrorData> | undefined;
        this.em.emit("error", { code: "message_error", message: data?.error ?? "A message to the server failed", fatal: false });
      },
      onDeviceError: (err: DeviceError) => {
        this.em.emit("micPermission", err.type === "permissions" ? "denied" : "unavailable");
      },
      onMicUpdated: () => this.em.emit("micPermission", "granted"),
      onUserStartedSpeaking: () => {
        this.tracker.update({ userSpeaking: true });
        this.em.emit("userSpeaking", true);
      },
      onUserStoppedSpeaking: () => {
        this.newTurn();
        this.tracker.update({ userSpeaking: false, awaitingReply: true });
        this.em.emit("userSpeaking", false);
      },
      onBotStartedSpeaking: () => {
        if (this.turnStartedAt && this.metrics.voiceToVoiceMs === null) {
          this.metrics = { ...this.metrics, voiceToVoiceMs: Math.round(performance.now() - this.turnStartedAt) };
          this.em.emit("metrics", this.metrics);
        }
        this.botVoiceActive = true;
        this.tracker.update({ botSpeaking: true, awaitingReply: false });
        this.em.emit("botSpeaking", true);
      },
      onBotStoppedSpeaking: () => {
        window.clearTimeout(this.interruptTimer);
        if (this.botAudio) this.botAudio.muted = false;
        this.botVoiceActive = false;
        if (!this.llmActive) this.closeBotTurn();
        this.tracker.update({ botSpeaking: false });
        this.em.emit("botSpeaking", false);
      },
      onBotInterrupted: () => this.closeBotTurn(),
      onUserInput: (d: UserInputData) => {
        this.sawUserInput = true;
        if (d.input_type !== "transcription") return; // chat is echoed locally; backchannels are not turns
        this.onUserText(d.text, d.final, d.timestamp);
      },
      onUserTranscript: (d: TranscriptData) => {
        if (this.sawUserInput) return;
        this.onUserText(d.text, d.final, d.timestamp);
      },
      // Close any open bot turn first. The greeting is spoken without the LLM, so no
      // onBotLlmStopped ends it, and the first reply would otherwise be appended to it.
      onBotLlmStarted: () => {
        this.closeBotTurn();
        this.llmActive = true;
      },
      // The spoken text (bot-output) arrives sentence by sentence as the audio plays, after
      // the LLM has finished. Closing here would split the reply into two bubbles.
      onBotLlmStopped: () => {
        this.llmActive = false;
        if (!this.botVoiceActive) this.closeBotTurn();
      },
      onBotOutput: (d: BotOutputData) => {
        this.sawBotOutput = true;
        if (d.spoken_status && d.spoken_status !== "new") return;
        if (typeof d.segment_id === "number") {
          if (this.seenSegments.has(d.segment_id)) return;
          this.seenSegments.add(d.segment_id);
        }
        const kind = botOutputKind(d);
        if (kind !== "ignore") this.appendBot(d.text, kind);
      },
      onBotLlmText: (d) => {
        if (!this.sawBotOutput) this.appendBot(d.text, "token");
      },
      onMetrics: (d: PipecatMetricsData) => {
        const m = parseMetrics(d);
        this.metrics = {
          ...this.metrics,
          sttMs: this.metrics.sttMs ?? m.stt ?? null,
          llmTtftMs: this.metrics.llmTtftMs ?? m.llm ?? null,
          ttsTtfbMs: this.metrics.ttsTtfbMs ?? m.tts ?? null,
        };
        this.em.emit("metrics", this.metrics);
      },
      onServerMessage: (data: unknown) => {
        const ev = parseServerMessage(data);
        if (!ev) return;
        if (ev.kind === "smart-turn") this.em.emit("endOfTurn", ev.probability);
        else if (ev.kind === "pipeline-health") this.em.emit("pipelineHealth", ev.health);
        else if (ev.kind === "citations") this.em.emit("citations", ev.citations);
        else {
          this.metrics = {
            ...this.metrics,
            sttMs: ev.sttMs ?? this.metrics.sttMs,
            llmTtftMs: ev.llmTtftMs ?? this.metrics.llmTtftMs,
            ttsTtfbMs: ev.ttsTtfbMs ?? this.metrics.ttsTtfbMs,
            voiceToVoiceMs: ev.voiceToVoiceMs ?? this.metrics.voiceToVoiceMs,
          };
          this.em.emit("metrics", this.metrics);
        }
      },
      onTrackStarted: (track: MediaStreamTrack, participant?: Participant) => {
        if (track.kind !== "audio") return;
        if (!participant?.local) {
          this.botTrack = track;
          if (this.botAudio) {
            this.botAudio.srcObject = new MediaStream([track]);
            this.botAudio.play().catch(() => {});
          }
        }
        this.em.emit("tracksChanged");
      },
      onTrackStopped: (track: MediaStreamTrack) => {
        if (track === this.botTrack) this.botTrack = null;
        this.em.emit("tracksChanged");
      },
      onLLMFunctionCallInProgress: (d) => this.onToolInProgress(d),
      onLLMFunctionCallStopped: (d) => this.onToolStopped(d),
    };
  }
}

export function createPipecatSession(opts: VoiceSessionOptions): VoiceSession {
  return new PipecatVoiceSession(opts);
}

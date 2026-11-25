import type {
  Citation,
  ConnectionState,
  MicPermission,
  PipelineMetrics,
  PipelineStage,
  StageHealth,
  ToolCallEvent,
  ToolHandler,
  TurnState,
  VoiceSettings,
} from "../types";

/**
 * The adapter's stable interface. The rest of the module talks only to this;
 * all Pipecat API usage lives in `../pipecat/`.
 */
export interface VoiceSession {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  setMicEnabled(on: boolean): void;
  sendText(text: string): void;                       // text turn through the same LLM pipeline
  interrupt(): void;                                  // stop bot speech
  setVoiceSettings(s: VoiceSettings): Promise<void>;  // via a server message / RTVI client message
  getLocalAudioTrack(): MediaStreamTrack | null;
  getBotAudioTrack(): MediaStreamTrack | null;
  on<E extends keyof SessionEvents>(event: E, cb: SessionEvents[E]): () => void;

  /* Module-local additions */
  /** Switch the microphone input device. */
  setInputDevice(deviceId: string): Promise<void>;
  readonly micEnabled: boolean;
}

/**
 * Transcript semantics:
 * - `userTranscript.text` is the full text of the current user turn so far;
 *   interim text is replaced by later events, `final` closes the turn.
 * - `botTranscript.text` is a chunk to append to the current assistant turn;
 *   `final: true` closes the turn (its text may be empty).
 */
export interface SessionEvents {
  connectionState: (s: ConnectionState) => void;
  userSpeaking: (speaking: boolean) => void;          // VAD
  botSpeaking: (speaking: boolean) => void;
  userTranscript: (t: { text: string; final: boolean; at: string; method: "voice" | "text" }) => void;
  botTranscript: (t: { text: string; final: boolean; at: string }) => void;
  turnState: (s: TurnState) => void;
  toolCall: (c: ToolCallEvent) => void;
  metrics: (m: PipelineMetrics) => void;
  error: (e: { code: string; message: string; fatal: boolean }) => void;

  /* Module-local additions */
  /** Smart Turn end-of-turn probability, when the server provides it. */
  endOfTurn: (p: number) => void;
  pipelineHealth: (h: Partial<Record<PipelineStage, StageHealth>>) => void;
  citations: (c: Citation[]) => void;
  micPermission: (p: MicPermission) => void;
  micEnabled: (on: boolean) => void;
  /** The bot audio track became available or changed. */
  tracksChanged: () => void;
}

export interface VoiceSessionOptions {
  /** Dispatches every client-side tool call (permission checks + confirmation gate live here). */
  handleTool: ToolHandler;
  /** Names of tools the browser handles. */
  clientTools: readonly string[];
  /** Initial voice settings (volume is applied client-side). */
  settings: VoiceSettings | null;
}

export type SessionEventName = keyof SessionEvents;

export type ConnectionState = "idle" | "connecting" | "connected" | "reconnecting" | "disconnected" | "error";

export type TurnState =
  | "idle" | "connecting" | "listening" | "user_speaking" | "thinking"
  | "tool_running" | "bot_speaking" | "muted" | "error";

export interface TranscriptTurn {
  id: string;
  speaker: "user" | "assistant";
  method: "voice" | "text";
  text: string;
  final: boolean;
  startedAt: string;
  citations: Citation[];
}

export interface Citation { marker: number; documentId: string; chunkId: string; title: string; excerpt: string }

export type ToolPermission = "read" | "write" | "share";

export interface ToolCallEvent {
  id: string;
  name: string;
  permission: ToolPermission;
  args: Record<string, unknown>;
  status: "requested" | "awaiting_confirmation" | "running" | "succeeded" | "failed" | "declined";
  startedAt: string;
  finishedAt?: string;
  resultSummary?: string;
  error?: string;
}

export interface PipelineMetrics {
  turnId: string;
  sttMs: number | null;
  llmTtftMs: number | null;
  ttsTtfbMs: number | null;
  voiceToVoiceMs: number | null;
  rttMs: number | null;
}

export interface VoiceOption { id: string; label: string; language: string; gender?: string }

export interface VoiceSettings {
  voiceId: string;
  speed: number;
  blend: { voiceId: string; ratio: number } | null;
  volume: number;
  vadSensitivity: "low" | "medium" | "high";
  endOfTurnThreshold: number;
  allowInterruptions: boolean;
  responseLength: "concise" | "standard";
}

export interface VoiceConfig {
  voices: VoiceOption[];
  defaults: VoiceSettings;
  capabilities: {
    supportsBlend: boolean; speedRange: [number, number]; sttModel: string; llmModel: string; ttsModel: string;
    /** Module-local addition: how end of turn is detected, e.g. "Smart Turn v3" or "Silence timer · 1 s". */
    turnDetection?: string;
  };
  pipelineHealth: Record<"stt" | "llm" | "tts" | "vad" | "turn", "ready" | "loading" | "unavailable">;
}

/* ------------------------------------------------------------------ */
/* Module-local additions (not part of the cross-module contract).     */
/* ------------------------------------------------------------------ */

export type PipelineStage = keyof VoiceConfig["pipelineHealth"];
export type StageHealth = VoiceConfig["pipelineHealth"][PipelineStage];

export type MicPermission = "unknown" | "granted" | "denied" | "unavailable";

/** A stretch of detected speech, used by the VAD lane. `end` is null while ongoing. */
export interface SpeechSegment {
  who: "user" | "bot";
  start: number;
  end: number | null;
}

/** What a tool handler returns to the adapter (and on to the LLM). */
export interface ToolOutcome {
  status: "succeeded" | "failed" | "declined";
  resultSummary?: string;
  error?: string;
  /** Sent back to the model as the function result. */
  result: Record<string, unknown>;
  /** Evidence citations to attach to the assistant's next turn. */
  citations?: Citation[];
}

/**
 * Client-side tool dispatcher. It receives the call, an `update` function to
 * report intermediate status (e.g. awaiting_confirmation → running), and a
 * signal that aborts when the pipeline cancels the call or the session ends.
 */
export type ToolHandler = (
  call: ToolCallEvent,
  update: (patch: Partial<Pick<ToolCallEvent, "status" | "resultSummary" | "error">>) => void,
  signal: AbortSignal,
  context: ToolContext,
) => Promise<ToolOutcome>;

/** Which live voice session a tool call belongs to (shared records are scoped to it). */
export interface ToolContext {
  sessionId: string | null;
}

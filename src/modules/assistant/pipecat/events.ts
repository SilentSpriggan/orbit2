import { BotOutputType, type BotOutputData, type PipecatMetricsData, type TransportState } from "@pipecat-ai/client-js";
import type { Citation, ConnectionState, PipelineStage, StageHealth } from "../types";

/** RTVI transport state → the module's ConnectionState. */
export function toConnectionState(s: TransportState): ConnectionState {
  switch (s) {
    case "initializing":
    case "initialized":
    case "authenticating":
    case "authenticated":
    case "connecting":
    case "connected": // transport up, waiting for bot-ready
      return "connecting";
    case "ready":
      return "connected";
    case "disconnecting":
    case "disconnected":
      return "disconnected";
    case "error":
      return "error";
  }
}

export type MetricStage = "stt" | "llm" | "tts";

function stageOf(processor: string): MetricStage | null {
  const p = processor.toLowerCase();
  if (/stt|whisper|transcri|speech.?to.?text|parakeet|moonshine/.test(p)) return "stt";
  if (/tts|kokoro|piper|text.?to.?speech/.test(p)) return "tts";
  if (/llm|ollama|openai|qwen/.test(p)) return "llm";
  return null;
}

/**
 * Pipecat reports TTFB / processing times in seconds per processor
 * (e.g. "OllamaLLMService#0"). Returns milliseconds per stage.
 */
export function parseMetrics(data: PipecatMetricsData): Partial<Record<MetricStage, number>> {
  const out: Partial<Record<MetricStage, number>> = {};
  for (const m of data.ttfb ?? []) {
    const stage = stageOf(m.processor);
    if (stage && out[stage] === undefined) out[stage] = Math.round(m.value * 1000);
  }
  // STT services often report processing time rather than TTFB.
  for (const m of data.processing ?? []) {
    const stage = stageOf(m.processor);
    if (stage === "stt" && out.stt === undefined) out.stt = Math.round(m.value * 1000);
  }
  return out;
}

/**
 * Bot output arrives in several granularities. Per assistant turn we lock onto
 * the first of `sentence` / `token` and ignore the rest (words duplicate the
 * sentence; backchannels and expressions are not transcript text).
 */
export function botOutputKind(d: BotOutputData): "sentence" | "token" | "ignore" {
  const t = d.output_type ?? d.aggregated_by ?? d.text_type ?? BotOutputType.SENTENCE;
  if (t === BotOutputType.SENTENCE) return "sentence";
  if (t === BotOutputType.TOKEN) return "token";
  return "ignore";
}

/**
 * Custom server messages sent by the ORBIT Pipecat server (RTVI server-message):
 *   { type: "smart-turn", probability: 0.87 }
 *   { type: "pipeline-health", health: { stt: "ready", llm: "loading", ... } }
 *   { type: "citations", citations: Citation[] }
 *   { type: "turn-metrics", stt_ms, llm_ttft_ms, tts_ttfb_ms, voice_to_voice_ms }
 */
export type ServerEvent =
  | { kind: "smart-turn"; probability: number }
  | { kind: "pipeline-health"; health: Partial<Record<PipelineStage, StageHealth>> }
  | { kind: "citations"; citations: Citation[] }
  | { kind: "turn-metrics"; sttMs: number | null; llmTtftMs: number | null; ttsTtfbMs: number | null; voiceToVoiceMs: number | null };

const STAGES: PipelineStage[] = ["stt", "llm", "tts", "vad", "turn"];
const HEALTH: StageHealth[] = ["ready", "loading", "unavailable"];

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseCitation(v: unknown): Citation | null {
  if (!isRecord(v)) return null;
  const marker = num(v.marker);
  const documentId = v.documentId ?? v.document_id;
  const chunkId = v.chunkId ?? v.chunk_id;
  if (marker === null || typeof documentId !== "string" || typeof chunkId !== "string") return null;
  return {
    marker,
    documentId,
    chunkId,
    title: typeof v.title === "string" ? v.title : documentId,
    excerpt: typeof v.excerpt === "string" ? v.excerpt : "",
  };
}

export function parseServerMessage(data: unknown): ServerEvent | null {
  if (!isRecord(data) || typeof data.type !== "string") return null;
  switch (data.type) {
    case "smart-turn": {
      const p = num(data.probability);
      return p === null ? null : { kind: "smart-turn", probability: p };
    }
    case "pipeline-health": {
      if (!isRecord(data.health)) return null;
      const health: Partial<Record<PipelineStage, StageHealth>> = {};
      for (const s of STAGES) {
        const v = data.health[s];
        if (typeof v === "string" && (HEALTH as string[]).includes(v)) health[s] = v as StageHealth;
      }
      return { kind: "pipeline-health", health };
    }
    case "citations": {
      if (!Array.isArray(data.citations)) return null;
      return { kind: "citations", citations: data.citations.map(parseCitation).filter((c): c is Citation => c !== null) };
    }
    case "turn-metrics":
      return {
        kind: "turn-metrics",
        sttMs: num(data.stt_ms),
        llmTtftMs: num(data.llm_ttft_ms),
        ttsTtfbMs: num(data.tts_ttfb_ms),
        voiceToVoiceMs: num(data.voice_to_voice_ms),
      };
    default:
      return null;
  }
}

/** Current round-trip time from the selected ICE candidate pair, in ms. */
export async function readRttMs(pc: RTCPeerConnection): Promise<number | null> {
  const stats = await pc.getStats();
  let rtt: number | null = null;
  stats.forEach((report: RTCStats) => {
    const r = report as RTCStats & { state?: string; nominated?: boolean; currentRoundTripTime?: number };
    if (r.type === "candidate-pair" && r.state === "succeeded" && r.nominated && typeof r.currentRoundTripTime === "number") {
      rtt = Math.round(r.currentRoundTripTime * 1000);
    }
  });
  return rtt;
}

/** Client → server message types handled by the ORBIT Pipecat server. */
export const CLIENT_MESSAGE = {
  voiceSettings: "orbit.voice-settings",
  interrupt: "orbit.interrupt",
} as const;

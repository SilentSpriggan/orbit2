import { useSyncExternalStore } from "react";
import type { Citation, ToolCallEvent, TranscriptTurn } from "../types";

/** Transcript items in display order: turns and inline tool-call rows. */
export type TranscriptItem = { kind: "turn"; id: string } | { kind: "tool"; id: string };

export interface TranscriptState {
  items: TranscriptItem[];
  turns: Record<string, TranscriptTurn>;
  calls: Record<string, ToolCallEvent>;
}

const EMPTY: TranscriptState = { items: [], turns: {}, calls: {} };

/**
 * Lives outside React so the transcript survives leaving and returning to the
 * assistant within this tab. It is never persisted or sent anywhere.
 */
let state: TranscriptState = EMPTY;
let seq = 0;
let pendingCitations: Citation[] = [];
const listeners = new Set<() => void>();

function set(next: TranscriptState) {
  state = next;
  listeners.forEach((l) => l());
}

function openTurn(speaker: TranscriptTurn["speaker"], method?: TranscriptTurn["method"]): TranscriptTurn | null {
  for (let i = state.items.length - 1; i >= 0; i--) {
    const item = state.items[i];
    if (item.kind !== "turn") continue;
    const t = state.turns[item.id];
    if (t.speaker === speaker && !t.final && (!method || t.method === method)) return t;
    if (t.speaker === speaker) return null;
  }
  return null;
}

function addTurn(turn: TranscriptTurn) {
  set({ ...state, items: [...state.items, { kind: "turn", id: turn.id }], turns: { ...state.turns, [turn.id]: turn } });
}

function putTurn(turn: TranscriptTurn) {
  set({ ...state, turns: { ...state.turns, [turn.id]: turn } });
}

export const transcript = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: () => state,

  /** Interim text replaces the open turn; `final` closes it. */
  user(text: string, final: boolean, at: string, method: TranscriptTurn["method"]) {
    const open = openTurn("user", method);
    if (open) {
      putTurn({ ...open, text, final });
      return;
    }
    addTurn({ id: `turn-${++seq}`, speaker: "user", method, text, final, startedAt: at, citations: [] });
  },

  /** Append a chunk to the open assistant turn (or start one). */
  assistant(chunk: string, final: boolean, at: string) {
    const open = openTurn("assistant");
    if (open) {
      putTurn({ ...open, text: open.text + chunk, final: final || open.final, citations: mergeCitations(open.citations, pendingCitations) });
      pendingCitations = [];
      return;
    }
    if (final && !chunk) return;
    addTurn({
      id: `turn-${++seq}`,
      speaker: "assistant",
      method: "voice",
      text: chunk.trimStart(),
      final,
      startedAt: at,
      citations: pendingCitations,
    });
    pendingCitations = [];
  },

  /** Citations attach to the open assistant turn, or the next one. */
  citations(list: Citation[]) {
    const open = openTurn("assistant");
    if (open) putTurn({ ...open, citations: mergeCitations(open.citations, list) });
    else pendingCitations = mergeCitations(pendingCitations, list);
  },

  call(c: ToolCallEvent) {
    if (state.calls[c.id]) {
      set({ ...state, calls: { ...state.calls, [c.id]: c } });
      return;
    }
    set({ ...state, items: [...state.items, { kind: "tool", id: c.id }], calls: { ...state.calls, [c.id]: c } });
  },

  /** Close unfinished transcript entries when the session ends. */
  closeAll() {
    const turns = { ...state.turns };
    const calls = { ...state.calls };
    let changed = false;
    for (const id of Object.keys(turns)) {
      if (!turns[id].final) {
        turns[id] = { ...turns[id], final: true };
        changed = true;
      }
    }
    for (const [id, call] of Object.entries(calls)) {
      if (["requested", "running", "awaiting_confirmation"].includes(call.status)) {
        calls[id] = { ...call, status: "declined", error: "Session ended", finishedAt: new Date().toISOString() };
        changed = true;
      }
    }
    if (changed) set({ ...state, turns, calls });
    pendingCitations = [];
  },

  clear() {
    pendingCitations = [];
    set(EMPTY);
  },
};

function mergeCitations(a: Citation[], b: Citation[]): Citation[] {
  if (!b.length) return a;
  const out = [...a];
  for (const c of b) if (!out.some((x) => x.marker === c.marker)) out.push(c);
  return out.sort((x, y) => x.marker - y.marker);
}

export function useTranscript(): TranscriptState {
  return useSyncExternalStore(transcript.subscribe, transcript.get, transcript.get);
}

/** Plain-text export of the transcript. */
export function transcriptToText(s: TranscriptState, labels: { user: string; assistant: string }): string {
  const lines: string[] = [
    "ORBIT | Crew Health — Crew assistant transcript",
    "Local assistant · not a medical professional · nothing is sent off this network",
    `Exported ${new Date().toISOString()}`,
    "",
  ];
  for (const item of s.items) {
    if (item.kind === "turn") {
      const t = s.turns[item.id];
      const who = t.speaker === "user" ? labels.user : labels.assistant;
      lines.push(`[${t.startedAt}] ${who} (${t.method}): ${t.text}`);
      for (const c of t.citations) lines.push(`    [${c.marker}] ${c.title} — ${c.documentId}#${c.chunkId}`);
    } else {
      const c = s.calls[item.id];
      lines.push(`[${c.startedAt}] tool ${c.name} · ${c.status}${c.resultSummary ? ` · ${c.resultSummary}` : ""}${c.error ? ` · ${c.error}` : ""}`);
    }
  }
  return lines.join("\n");
}

import { Keyboard, Mic } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { formatUtcTime } from "../../../shared/format";
import { cn, ICON_STROKE } from "../../../shared/ui/cn";
import { useReducedMotion } from "../hooks/usePreferences";
import type { Citation, TranscriptTurn } from "../types";
import { CitationMarker } from "./CitationMarker";

const WORD_MS = 45;

/** Reveal streamed assistant text word by word (instant under reduced motion or once final). */
function useRevealed(text: string, animate: boolean): string {
  const words = text.split(/(\s+)/);
  const [shown, setShown] = useState(animate ? 0 : words.length);
  const total = words.length;
  useEffect(() => {
    if (!animate) {
      setShown(total);
      return;
    }
    if (shown >= total) return;
    const t = window.setTimeout(() => setShown((n) => Math.min(total, n + 2)), WORD_MS);
    return () => window.clearTimeout(t);
  }, [animate, shown, total]);
  return animate ? words.slice(0, shown).join("") : text;
}

function withCitations(text: string, citations: Citation[]): ReactNode[] {
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const m = /^\[(\d+)\]$/.exec(part);
    if (!m) return part;
    const c = citations.find((x) => x.marker === Number(m[1]));
    return c ? (
      <CitationMarker key={i} citation={c} />
    ) : (
      <span key={i} className="font-mono text-2xs font-semibold text-ink-3">
        {part}
      </span>
    );
  });
}

export interface TranscriptTurnViewProps {
  turn: TranscriptTurn;
  userLabel: string;
}

export function TranscriptTurnView({ turn, userLabel }: TranscriptTurnViewProps) {
  const reducedMotion = useReducedMotion();
  const isUser = turn.speaker === "user";
  const revealed = useRevealed(turn.text, !isUser && !turn.final && !reducedMotion);
  const MethodIcon = turn.method === "voice" ? Mic : Keyboard;
  const interim = isUser && !turn.final;

  return (
    <li className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <article
        aria-label={`${isUser ? userLabel : "ORBIT"} at ${formatUtcTime(turn.startedAt)}`}
        className={cn(
          "flex max-w-[min(80%,72ch)] flex-col gap-1.5 rounded-lg border border-line px-4 py-3",
          isUser ? "bg-raised" : "bg-panel",
        )}
      >
        <header className="flex items-center gap-2 text-xs">
          <span className="font-medium text-ink-2">{isUser ? userLabel : "ORBIT"}</span>
          <span className="font-mono text-ink-3">{formatUtcTime(turn.startedAt, true)}</span>
          <MethodIcon size={12} strokeWidth={ICON_STROKE} aria-hidden="true" className="text-ink-3" />
          <span className="sr-only">{turn.method === "voice" ? "spoken" : "typed"}</span>
          {interim && <span className="text-ink-3">· hearing…</span>}
        </header>
        <p className={cn("text-base whitespace-pre-wrap break-words", interim ? "text-ink-3 italic" : "text-ink")}>
          {isUser ? turn.text : withCitations(revealed, turn.citations)}
          {!isUser && !turn.final && <span aria-hidden="true" className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 bg-ink-3 animate-pulse" />}
        </p>
      </article>
    </li>
  );
}

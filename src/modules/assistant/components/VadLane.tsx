import { useEffect, useState } from "react";
import { cn } from "../../../shared/ui/cn";
import type { SpeechSegment } from "../types";

const WINDOW_MS = 10_000;

export interface VadLaneProps {
  segments: SpeechSegment[];
  endOfTurn: number | null;
  paused: boolean;
  reducedMotion: boolean;
}

/** 10-second rolling timeline of detected user and bot speech. */
export function VadLane({ segments, endOfTurn, paused, reducedMotion }: VadLaneProps) {
  const [now, setNow] = useState(() => performance.now());

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setNow(performance.now()), reducedMotion ? 1000 : 100);
    return () => window.clearInterval(id);
  }, [paused, reducedMotion]);

  const from = now - WINDOW_MS;
  const visible = segments.filter((s) => (s.end ?? now) > from);
  const userTalking = segments.some((s) => s.who === "user" && s.end === null);
  const botTalking = segments.some((s) => s.who === "bot" && s.end === null);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-2xs font-medium uppercase tracking-[0.08em] text-ink-3">VAD · last 10 s</span>
        <span className="flex items-center gap-3 text-2xs text-ink-3">
          <span className="flex items-center gap-1">
            <span aria-hidden="true" className="inline-block size-2.5 rounded-sm border border-nominal-line bg-nominal-tint" />
            You
          </span>
          <span className="flex items-center gap-1">
            <span aria-hidden="true" className="inline-block size-2.5 rounded-sm border border-accent bg-accent-tint" />
            ORBIT
          </span>
          <span className="font-mono text-ink-2 tabular-nums">
            {endOfTurn !== null ? `end-of-turn p=${endOfTurn.toFixed(2)}` : "end-of-turn p=—"}
          </span>
        </span>
      </div>
      <div
        role="img"
        aria-label={`Voice activity: ${userTalking ? "you are speaking" : botTalking ? "ORBIT is speaking" : "no one is speaking"}`}
        className="relative h-3 overflow-hidden rounded-sm border border-line bg-sunken"
      >
        {visible.map((s) => {
          const start = Math.max(s.start, from);
          const end = s.end ?? now;
          const left = ((start - from) / WINDOW_MS) * 100;
          const width = Math.max(0.5, ((end - start) / WINDOW_MS) * 100);
          return (
            <span
              key={`${s.who}-${s.start}`}
              className={cn(
                "absolute inset-y-0 border-x",
                s.who === "user" ? "bg-nominal-tint border-nominal-line" : "bg-accent-tint border-accent",
              )}
              style={{ left: `${left}%`, width: `${width}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}

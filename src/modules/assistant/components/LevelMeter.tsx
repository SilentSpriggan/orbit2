import { useEffect, useState } from "react";
import { cn } from "../../../shared/ui/cn";
import type { AudioAnalyser } from "../hooks/useAudioAnalyser";

const SEGMENTS = 12;

export interface LevelMeterProps {
  analyser: AudioAnalyser;
  /** Tailwind background class for lit segments (a data-series token). */
  fillClass: string;
  label: string;
  paused: boolean;
}

/** Static 12-segment level meter used instead of the waveform under reduced motion. */
export function LevelMeter({ analyser, fillClass, label, paused }: LevelMeterProps) {
  const [lit, setLit] = useState(0);

  useEffect(() => {
    if (paused || !analyser.active) {
      setLit(0);
      return;
    }
    const id = window.setInterval(() => setLit(Math.round(analyser.readLevel() * SEGMENTS)), 150);
    return () => window.clearInterval(id);
  }, [analyser, analyser.active, paused]);

  return (
    <div role="img" aria-label={`${label}: level ${lit} of ${SEGMENTS}`} className="flex h-full items-center gap-1 px-2">
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <span key={i} className={cn("h-6 flex-1 rounded-sm border border-line", i < lit ? fillClass : "bg-raised")} />
      ))}
    </div>
  );
}

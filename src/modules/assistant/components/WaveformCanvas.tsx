import { useEffect, useRef } from "react";
import { FFT_SIZE, type AudioAnalyser } from "../hooks/useAudioAnalyser";
import { LevelMeter } from "./LevelMeter";

export interface WaveformCanvasProps {
  analyser: AudioAnalyser;
  /** CSS custom property holding the stroke color, e.g. "--color-series-2". */
  colorVar: string;
  /** Tailwind fill class for the reduced-motion level meter. */
  fillClass: string;
  label: string;
  ariaLabel: string;
  reducedMotion: boolean;
  paused: boolean;
}

const FRAME_MS = 1000 / 60;

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Time-domain waveform from an AnalyserNode, at most 60 fps, paused when hidden. */
export function WaveformCanvas({ analyser, colorVar, fillClass, label, ariaLabel, reducedMotion, paused }: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const stroke = cssVar(colorVar);
    const baseline = cssVar("--color-line");
    const data = new Float32Array(FFT_SIZE);

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (withWave: boolean) => {
      const { width, height } = canvas.getBoundingClientRect();
      const mid = height / 2;
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 1;
      ctx.strokeStyle = baseline;
      ctx.beginPath();
      ctx.moveTo(0, Math.round(mid) + 0.5);
      ctx.lineTo(width, Math.round(mid) + 0.5);
      ctx.stroke();
      if (!withWave || !analyser.readWaveform(data)) return;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = "round";
      ctx.strokeStyle = stroke;
      ctx.beginPath();
      const step = data.length / width;
      for (let x = 0; x < width; x++) {
        const v = data[Math.floor(x * step)] ?? 0;
        const y = mid - v * (height / 2 - 2);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < FRAME_MS - 1) return;
      last = t;
      draw(true);
    };
    if (!paused && analyser.active) raf = requestAnimationFrame(loop);
    else draw(false);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [analyser, analyser.active, colorVar, paused, reducedMotion]);

  return (
    <div className="relative h-16 rounded-md border border-line bg-sunken">
      <span className="pointer-events-none absolute left-2 top-1 z-10 font-mono text-2xs font-medium uppercase tracking-[0.08em] text-ink-3">
        {label}
      </span>
      {reducedMotion ? (
        <LevelMeter analyser={analyser} fillClass={fillClass} label={ariaLabel} paused={paused} />
      ) : (
        <canvas ref={canvasRef} role="img" aria-label={ariaLabel} className="block h-full w-full" />
      )}
    </div>
  );
}

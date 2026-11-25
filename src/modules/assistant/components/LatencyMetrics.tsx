import type { PipelineMetrics } from "../types";
import { THIN_SPACE } from "../../../shared/format";

const ROWS: Array<{ key: keyof Omit<PipelineMetrics, "turnId" | "rttMs">; label: string; bar: string }> = [
  { key: "sttMs", label: "STT", bar: "bg-series-2" },
  { key: "llmTtftMs", label: "LLM time to first token", bar: "bg-series-3" },
  { key: "ttsTtfbMs", label: "TTS time to first byte", bar: "bg-series-4" },
  { key: "voiceToVoiceMs", label: "Voice to voice", bar: "bg-series-1" },
];

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return <p className="text-xs text-ink-3">The trend appears after two turns.</p>;
  }
  const w = 320;
  const h = 40;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * (w - 4) + 2},${h - 3 - ((v - min) / span) * (h - 6)}`);
  const last = pts[pts.length - 1].split(",");
  return (
    <svg
      role="img"
      aria-label={`Voice-to-voice over the last ${values.length} turns: ${min} to ${max} ms, latest ${values[values.length - 1]} ms`}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="h-10 w-full rounded-sm border border-line bg-sunken"
    >
      <polyline points={pts.join(" ")} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" className="text-series-1" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill="currentColor" className="text-series-1" />
    </svg>
  );
}

export interface LatencyMetricsProps {
  metrics: PipelineMetrics | null;
  history: PipelineMetrics[];
}

/** Latency of the last turn as mono values with tiny bars, plus a 20-turn sparkline. */
export function LatencyMetrics({ metrics, history }: LatencyMetricsProps) {
  const scale = Math.max(1000, metrics?.voiceToVoiceMs ?? 0);
  const totals = history.map((m) => m.voiceToVoiceMs).filter((v): v is number => v !== null).slice(-20);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-2xs font-medium uppercase tracking-[0.08em] text-ink-3">Last turn latency</span>
        <span className="font-mono text-xs text-ink-3">{metrics ? metrics.turnId : "—"}</span>
      </div>
      <dl className="flex flex-col gap-2">
        {ROWS.map((r) => {
          const v = metrics?.[r.key] ?? null;
          return (
            <div key={r.key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
              <dt className="text-xs text-ink-2">{r.label}</dt>
              <dd className="text-right">
                <span className="font-mono text-base font-medium tabular-nums text-ink">{v ?? "—"}</span>
                {v !== null && <span className="font-mono text-xs text-ink-3">{THIN_SPACE}ms</span>}
              </dd>
              <div aria-hidden="true" className="col-span-2 h-1 overflow-hidden rounded-sm bg-raised">
                <div className={`h-full ${r.bar}`} style={{ width: `${v === null ? 0 : Math.min(100, (v / scale) * 100)}%` }} />
              </div>
            </div>
          );
        })}
      </dl>
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-2xs font-medium uppercase tracking-[0.08em] text-ink-3">Voice to voice · last 20 turns</span>
        <Sparkline values={totals} />
      </div>
    </div>
  );
}

import type { KeyboardEvent } from "react";
import { cn, ICON_STROKE } from "../../../shared/ui/cn";
import { STATUS_ICON } from "../../../shared/ui/StatusBadge";
import type { PinCluster } from "./pinCluster";

const FILL = { nominal: "fill-nominal-tint stroke-nominal", caution: "fill-caution-tint stroke-caution", critical: "fill-critical-tint stroke-critical" } as const;
const TEXT = { nominal: "text-nominal", caution: "text-caution", critical: "text-critical" } as const;

export interface PinMarker2DProps {
  cluster: PinCluster<{ x: number; y: number }>;
  /** Counter-scale so the marker keeps its screen size while zooming. */
  scale: number;
  active: boolean;
  label: string;
  onActivate: () => void;
}

/** Severity disc with the status icon (never color alone); clusters show a mono count. */
export function PinMarker2D({ cluster, scale, active, label, onActivate }: PinMarker2DProps) {
  const Icon = STATUS_ICON[cluster.severity];
  const count = cluster.pins.length;
  const onKeyDown = (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onActivate();
    }
  };
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      transform={`translate(${cluster.point.x} ${cluster.point.y}) scale(${scale})`}
      onClick={(e) => {
        e.stopPropagation();
        onActivate();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={onKeyDown}
      className="cursor-pointer outline-none [&:focus-visible>.focus-ring]:visible"
    >
      {/* 44px hit area */}
      <circle r={22} className="fill-transparent" />
      <circle r={14} className="focus-ring invisible fill-none stroke-focus" strokeWidth={2} />
      {active && <circle r={13} className="fill-none stroke-accent" strokeWidth={2} />}
      <circle r={10} className={FILL[cluster.severity]} strokeWidth={1.5} />
      <Icon x={-6} y={-6} width={12} height={12} strokeWidth={ICON_STROKE + 0.5} className={TEXT[cluster.severity]} aria-hidden="true" />
      {count > 1 && (
        <g transform="translate(10 -10)">
          <rect x={-7} y={-6} width={14} height={12} rx={3} className="fill-overlay stroke-line-strong" strokeWidth={1} />
          <text textAnchor="middle" dominantBaseline="central" className={cn("fill-ink font-mono font-semibold")} style={{ fontSize: 9 }}>
            {count}
          </text>
        </g>
      )}
    </g>
  );
}

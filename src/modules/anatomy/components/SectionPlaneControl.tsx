import { Info, Scissors } from "lucide-react";
import type { Dispatch } from "react";
import { cn, ICON_STROKE } from "../../../shared/ui/cn";
import { SegmentedControl } from "../../../shared/ui/Field";
import { Popover } from "../../../shared/ui/Popover";
import type { ViewerAction, ViewerStore } from "../hooks/useViewerState";
import type { SectionAxis } from "../types";

const AXIS_LABEL: Record<SectionAxis, string> = { off: "Off", sagittal: "Sagittal", coronal: "Coronal", axial: "Axial" };

/** Clipping plane control (3D only). */
export function SectionPlaneControl({ state, dispatch, compact = false }: { state: ViewerStore; dispatch: Dispatch<ViewerAction>; compact?: boolean }) {
  const { axis, position } = state.section;
  const on = axis !== "off";
  return (
    <Popover
      label="Section plane"
      align="end"
      className="w-[300px]"
      trigger={(t) => (
        <button
          {...t}
          type="button"
          aria-label={compact ? `Section plane: ${AXIS_LABEL[axis]}` : undefined}
          className={cn(
            "flex h-11 items-center gap-2 rounded-md border px-3 text-sm font-medium",
            on ? "bg-accent-tint border-accent text-ink" : "bg-raised border-line-strong text-ink hover:border-control",
          )}
        >
          <Scissors size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
          {!compact && <span>Section</span>}
          {!compact && <span className="font-mono text-xs text-ink-2">{on ? `${AXIS_LABEL[axis]} · ${position} %` : "Off"}</span>}
        </button>
      )}
    >
      {() => (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium text-ink-2">Section plane</p>
          <SegmentedControl<SectionAxis>
            label="Section plane axis"
            value={axis}
            onChange={(v) => dispatch({ type: "setSection", payload: { axis: v } })}
            options={(Object.keys(AXIS_LABEL) as SectionAxis[]).map((v) => ({ value: v, label: AXIS_LABEL[v] }))}
            className="w-full [&>button]:flex-1 [&>button]:px-1"
          />
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={position}
              disabled={!on}
              aria-label="Section plane position"
              aria-valuetext={`${position} %`}
              onChange={(e) => dispatch({ type: "setSection", payload: { position: Number(e.target.value) } })}
              className="h-11 min-w-0 flex-1 cursor-pointer accent-accent disabled:cursor-not-allowed disabled:opacity-50"
            />
            <output className="w-12 text-right font-mono text-xs tabular-nums text-ink">{position} %</output>
          </div>
          <p className="flex items-start gap-1.5 text-xs text-ink-3">
            <Info size={12} strokeWidth={ICON_STROKE} aria-hidden="true" className="mt-0.5 shrink-0" />
            Clips surfaces — no internal tissue is synthesized
          </p>
        </div>
      )}
    </Popover>
  );
}

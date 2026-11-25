import { Focus, RotateCcw } from "lucide-react";
import type { Dispatch } from "react";
import { IconButton } from "../../../shared/ui/Button";
import { SegmentedControl } from "../../../shared/ui/Field";
import { StatusBadge } from "../../../shared/ui/StatusBadge";
import type { ViewerAction, ViewerStore } from "../hooks/useViewerState";
import type { ViewPreset } from "../types";
import { SectionPlaneControl } from "./SectionPlaneControl";

const PRESETS: { value: ViewPreset; label: string }[] = [
  { value: "anterior", label: "Anterior" },
  { value: "posterior", label: "Posterior" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "superior", label: "Superior" },
];

export interface ViewerOverlayControlsProps {
  state: ViewerStore;
  dispatch: Dispatch<ViewerAction>;
  /** Narrow viewer: collapse labels. */
  compact: boolean;
}

/** Top overlay: 2D/3D mode, view presets (top-left) and the section plane (top-right). */
export function ViewerOverlayControls({ state, dispatch, compact }: ViewerOverlayControlsProps) {
  const is3d = state.mode === "3d";
  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-wrap items-start justify-between gap-2">
      <div className="pointer-events-auto flex flex-wrap items-center gap-2">
        {state.isFallback ? (
          <StatusBadge level="standby">2D fallback — 3D not available on this device</StatusBadge>
        ) : (
          <SegmentedControl<"3d" | "2d">
            label="Viewer mode"
            value={state.mode}
            onChange={(mode) => dispatch({ type: "setMode", payload: { mode } })}
            options={[{ value: "3d", label: "3D" }, { value: "2d", label: "2D" }]}
          />
        )}
        {is3d && (
          <SegmentedControl<ViewPreset>
            label="View preset"
            value={state.preset}
            onChange={(p) => dispatch({ type: "setPreset", payload: p })}
            options={PRESETS.map((p) => ({ value: p.value, label: compact ? p.label.slice(0, 3) : p.label }))}
          />
        )}
      </div>
      <div className="pointer-events-auto flex items-center gap-1">
        <IconButton
          icon={Focus}
          label="Frame selection (F)"
          variant="secondary"
          disabled={!state.selectedRegionId}
          onClick={() => dispatch({ type: "frameSelection" })}
        />
        <IconButton icon={RotateCcw} label="Reset view (0)" variant="secondary" onClick={() => dispatch({ type: "resetView" })} />
        {is3d && <SectionPlaneControl state={state} dispatch={dispatch} compact={compact} />}
      </div>
    </div>
  );
}

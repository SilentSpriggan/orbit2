import { Eye, EyeOff } from "lucide-react";
import type { Dispatch } from "react";
import { IconButton } from "../../../shared/ui/Button";
import { cn, TYPE } from "../../../shared/ui/cn";
import type { ViewerAction, ViewerStore } from "../hooks/useViewerState";
import { layerVar } from "../lib/cssColor";
import { BODY_SYSTEMS, SYSTEM_LABEL } from "../types";

export interface LayerListProps {
  state: ViewerStore;
  dispatch: Dispatch<ViewerAction>;
}

/** System layers: visibility, opacity and isolate. */
export function LayerList({ state, dispatch }: LayerListProps) {
  return (
    <section aria-labelledby="anatomy-layers-title" className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <h3 id="anatomy-layers-title" className={TYPE.overline}>System layers</h3>
        {state.isolated && (
          <button
            type="button"
            onClick={() => dispatch({ type: "isolate", payload: null })}
            className="h-11 rounded-md px-2 text-xs font-medium text-accent hover:text-accent-hover"
          >
            Show all systems
          </button>
        )}
      </div>
      {state.hiddenRegions.length > 0 && (
        <button
          type="button"
          onClick={() => dispatch({ type: "showAllRegions" })}
          className="h-11 self-start rounded-md px-2 text-xs font-medium text-accent hover:text-accent-hover"
        >
          Show {state.hiddenRegions.length} hidden {state.hiddenRegions.length === 1 ? "structure" : "structures"}
        </button>
      )}
      <ul className="flex flex-col divide-y divide-line">
        {BODY_SYSTEMS.map((system) => {
          const layer = state.layers[system];
          const isolated = state.isolated === system;
          const dimmed = state.isolated !== null && !isolated;
          const label = SYSTEM_LABEL[system];
          return (
            <li key={system} className="py-1.5">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: layerVar(system) }} />
                <span className={cn("min-w-0 flex-1 truncate text-sm", layer.visible && !dimmed ? "text-ink" : "text-ink-3")}>{label}</span>
                <button
                  type="button"
                  aria-pressed={isolated}
                  aria-label={isolated ? `Stop isolating ${label}` : `Isolate ${label}`}
                  onClick={() => dispatch({ type: "isolate", payload: isolated ? null : system })}
                  className={cn(
                    "h-11 rounded-md px-2.5 text-xs font-medium",
                    isolated ? "bg-accent-tint text-ink" : "text-ink-2 hover:bg-raised hover:text-ink",
                  )}
                >
                  Isolate
                </button>
                <IconButton
                  icon={layer.visible ? Eye : EyeOff}
                  label={layer.visible ? `Hide ${label}` : `Show ${label}`}
                  aria-pressed={layer.visible}
                  onClick={() => dispatch({ type: "toggleLayer", payload: system })}
                  tooltipSide="left"
                />
              </div>
              <div className="flex items-center gap-3 pl-5">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={layer.opacity}
                  disabled={!layer.visible}
                  aria-label={`${label} opacity`}
                  aria-valuetext={`${layer.opacity} %`}
                  onChange={(e) => dispatch({ type: "setLayerOpacity", payload: { system, opacity: Number(e.target.value) } })}
                  className="h-8 min-w-0 flex-1 cursor-pointer accent-accent disabled:cursor-not-allowed disabled:opacity-50"
                />
                <output className="w-11 text-right font-mono text-xs tabular-nums text-ink-2">{layer.opacity} %</output>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

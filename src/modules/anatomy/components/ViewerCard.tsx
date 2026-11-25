import { Component, lazy, Suspense, useCallback, useEffect, useId, useRef, useState, type Dispatch, type ReactNode } from "react";
import { Card } from "../../../shared/ui/Card";
import { cn } from "../../../shared/ui/cn";
import { Skeleton } from "../../../shared/ui/Skeleton";
import { useToast } from "../../../shared/ui/Toast";
import type { ViewerAction, ViewerStore } from "../hooks/useViewerState";
import { loadAttribution, type ModelAttribution } from "../lib/attribution";
import type { RegionIndex } from "../lib/regionIndex";
import type { AnatomyPin, PinPlacement } from "../types";
import { PinPlacementBanner } from "./PinPlacementBanner";
import { Viewer2D } from "./Viewer2D";
import { ViewerOverlayControls } from "./ViewerOverlayControls";

// three.js only downloads when the 3D view is actually used.
const Viewer3D = lazy(() => import("./Viewer3D"));

class ViewerErrorBoundary extends Component<{ onError: (reason: string) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    this.props.onError(error instanceof Error ? error.message : "The 3D viewer stopped.");
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export interface ViewerCardProps {
  index: RegionIndex;
  state: ViewerStore;
  dispatch: Dispatch<ViewerAction>;
  webgl: boolean;
  pins: AnatomyPin[];
  pinnedRegionIds: Set<string>;
  hoveredRegionId: string | null;
  activePinId: string | null;
  onHoverRegion: (regionId: string | null) => void;
  onSelectRegion: (regionId: string) => void;
  onPlace: (placement: PinPlacement) => void;
  onPinActivate: (pin: AnatomyPin) => void;
  compact: boolean;
}

/** Center column: the 3D viewer, or the 2D map (by choice or as the fallback). */
export function ViewerCard(props: ViewerCardProps) {
  const { state, dispatch, webgl, compact } = props;
  const instructionsId = useId();
  const { toast } = useToast();
  const [zoom, setZoom] = useState(100);
  const [source, setSource] = useState<"glb" | "placeholder" | null>(null);
  const [attribution, setAttribution] = useState<ModelAttribution | null>(null);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const toasted = useRef(false);

  const fallback = useCallback((reason: string) => {
    dispatch({ type: "setMode", payload: { mode: "2d", isFallback: true } });
    dispatch({ type: "setSection", payload: { axis: "off" } });
    setFallbackReason(reason);
    // A missing model is expected (the badge says so). Only a crash gets a toast.
    if (reason !== "model-missing" && !toasted.current) {
      toasted.current = true;
      toast({ level: "standby", title: "Showing the 2D map", description: "The 3D viewer stopped on this device. Pins still work in 2D." });
    }
  }, [dispatch, toast]);

  useEffect(() => {
    if (!webgl) dispatch({ type: "setMode", payload: { mode: "2d", isFallback: true } });
  }, [webgl, dispatch]);

  useEffect(() => {
    if (source !== "glb") return;
    const ctrl = new AbortController();
    loadAttribution(ctrl.signal).then(setAttribution);
    return () => ctrl.abort();
  }, [source]);

  // Esc cancels pin placement.
  useEffect(() => {
    if (!state.placingPin) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch({ type: "setPlacingPin", payload: false });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.placingPin, dispatch]);

  const viewerProps = { ...props, instructionsId, onZoomChange: setZoom };
  const show3d = state.mode === "3d" && !state.isFallback && webgl;

  const modelNote =
    !show3d
      ? state.isFallback
        ? !webgl ? "Procedural 2D map · WebGL 2 not available" : fallbackReason === "model-missing" ? "Procedural 2D map · body.glb not installed" : "Procedural 2D map"
        : "Procedural 2D reference map"
      : source === "glb" ? (attribution?.text ?? "Model attribution unavailable")
        : source === "placeholder" ? "Procedural placeholder body · no third-party model"
          : "Loading model…";

  return (
    <Card aria-label="Anatomy viewer" className="relative flex min-h-[420px] min-w-0 flex-col overflow-hidden">
      <p id={instructionsId} className="sr-only">
        Arrow keys rotate the 3D view or pan the 2D map. Plus and minus zoom, 0 resets the view and F frames the selected region.
        Use the region tree to select structures with the keyboard.
      </p>
      <div className={cn("relative min-h-0 flex-1 bg-sunken", state.placingPin && "cursor-crosshair")}>
        {show3d ? (
          <ViewerErrorBoundary onError={fallback}>
            <Suspense
              fallback={
                <div role="status" aria-label="Loading 3D viewer" className="absolute inset-0 grid place-items-center">
                  <Skeleton className="h-64 w-24 rounded-xl" />
                </div>
              }
            >
              <Viewer3D {...viewerProps} onLoadError={fallback} onModelSource={setSource} />
            </Suspense>
          </ViewerErrorBoundary>
        ) : (
          <Viewer2D {...viewerProps} />
        )}
        <ViewerOverlayControls state={state} dispatch={dispatch} compact={compact} />
        {state.placingPin && (
          <div className="pointer-events-none absolute inset-x-3 top-16 z-20 flex justify-center">
            <PinPlacementBanner onCancel={() => dispatch({ type: "setPlacingPin", payload: false })} />
          </div>
        )}
      </div>
      <div className="flex min-h-9 flex-wrap items-center gap-x-4 gap-y-1 border-t border-line bg-sunken px-3 py-1.5">
        <span className="font-mono text-xs text-ink-2">
          <span className="sr-only">Selected region: </span>
          {state.selectedRegionId ?? "no selection"}
        </span>
        <span className="font-mono text-xs tabular-nums text-ink-3" aria-label={`Zoom ${zoom} percent`}>
          {zoom} %
        </span>
        <span className="text-xs text-ink-3">Reference anatomy · not patient imaging</span>
        <span className="ml-auto min-w-0 truncate text-2xs text-ink-3" title={modelNote}>
          {modelNote}
        </span>
      </div>
    </Card>
  );
}

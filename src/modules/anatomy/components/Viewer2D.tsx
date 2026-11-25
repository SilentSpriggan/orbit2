import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { cn } from "../../../shared/ui/cn";
import { isSystemShown, type ViewerAction, type ViewerStore } from "../hooks/useViewerState";
import { pinPoint2d, shapeBounds, SILHOUETTE, VIEW_H, VIEW_SHAPES, VIEW_W, type BodyView, type Shape2D } from "../lib/bodyMap2d";
import { layerVar } from "../lib/cssColor";
import type { RegionIndex } from "../lib/regionIndex";
import { SEVERITY_LABEL, type AnatomyPin, type PinPlacement } from "../types";
import { PinMarker2D } from "./PinMarker2D";
import { clusterPins, pinAriaLabel } from "./pinCluster";

const GAP = 24;
const LABEL_H = 22;
const TOTAL_W = VIEW_W * 2 + GAP;
const TOTAL_H = VIEW_H + LABEL_H;
const OFFSET: Record<BodyView, number> = { front: 0, back: VIEW_W + GAP };
const MIN_W = TOTAL_W / 8;

interface Box { x: number; y: number; w: number; h: number }
const HOME: Box = { x: 0, y: 0, w: TOTAL_W, h: TOTAL_H };

export interface Viewer2DProps {
  index: RegionIndex;
  state: ViewerStore;
  dispatch: Dispatch<ViewerAction>;
  pins: AnatomyPin[];
  pinnedRegionIds: Set<string>;
  hoveredRegionId: string | null;
  activePinId: string | null;
  onHoverRegion: (regionId: string | null) => void;
  onSelectRegion: (regionId: string) => void;
  onPlace: (placement: PinPlacement) => void;
  onPinActivate: (pin: AnatomyPin) => void;
  onZoomChange: (pct: number) => void;
  instructionsId: string;
}

/** Front and back SVG outlines with clickable region shapes (2D mode and fallback). */
export function Viewer2D({
  index, state, dispatch, pins, pinnedRegionIds, hoveredRegionId, activePinId,
  onHoverRegion, onSelectRegion, onPlace, onPinActivate, onZoomChange, instructionsId,
}: Viewer2DProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [box, setBox] = useState<Box>(HOME);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ moved: boolean; startX: number; startY: number; pinch: number | null }>({ moved: false, startX: 0, startY: 0, pinch: null });

  const scale = box.w / TOTAL_W;
  useEffect(() => onZoomChange(Math.round(100 / scale)), [scale, onZoomChange]);

  const zoomAt = useCallback((factor: number, cx?: number, cy?: number) => {
    setBox((b) => {
      const w = Math.min(TOTAL_W, Math.max(MIN_W, b.w / factor));
      const h = (w / TOTAL_W) * TOTAL_H;
      const px = cx ?? b.x + b.w / 2;
      const py = cy ?? b.y + b.h / 2;
      return { x: px - ((px - b.x) * w) / b.w, y: py - ((py - b.y) * h) / b.h, w, h };
    });
  }, []);

  const frame = useCallback(() => {
    const id = state.selectedRegionId;
    if (!id) return;
    const views: BodyView[] = ["front", "back"];
    for (const view of views) {
      const shapes = VIEW_SHAPES[view].filter((s) => s.regionId === id);
      if (!shapes.length) continue;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const s of shapes) {
        const b = shapeBounds(s);
        x0 = Math.min(x0, b.x0); y0 = Math.min(y0, b.y0); x1 = Math.max(x1, b.x1); y1 = Math.max(y1, b.y1);
      }
      const cx = (x0 + x1) / 2 + OFFSET[view];
      const cy = (y0 + y1) / 2 + LABEL_H;
      const w = Math.min(TOTAL_W, Math.max(TOTAL_W / 3, (x1 - x0) * 8, ((y1 - y0) * 8 * TOTAL_W) / TOTAL_H));
      const h = (w / TOTAL_W) * TOTAL_H;
      setBox({ x: cx - w / 2, y: cy - h / 2, w, h });
      return;
    }
  }, [state.selectedRegionId]);

  // Commands from the reducer (keyboard, inspector buttons, other modules).
  useEffect(() => { if (state.frameRequest) frame(); }, [state.frameRequest]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (state.resetRequest) setBox(HOME); }, [state.resetRequest]);
  useEffect(() => { if (state.zoomRequest.n) zoomAt(state.zoomRequest.dir > 0 ? 1.25 : 0.8); }, [state.zoomRequest, zoomAt]);

  const toSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }, []);

  // Wheel zoom needs a non-passive listener.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = toSvg(e.clientX, e.clientY);
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, p?.x, p?.y);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [toSvg, zoomAt]);

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) drag.current = { moved: false, startX: e.clientX, startY: e.clientY, pinch: null };
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      drag.current.pinch = Math.hypot(a.x - b.x, a.y - b.y);
      drag.current.moved = true;
    }
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const unit = box.w / Math.max(1, Math.min(rect.width, (rect.height * TOTAL_W) / TOTAL_H));
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && drag.current.pinch) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = toSvg((a.x + b.x) / 2, (a.y + b.y) / 2);
      zoomAt(d / drag.current.pinch, mid?.x, mid?.y);
      drag.current.pinch = d;
      return;
    }
    if (!drag.current.moved && Math.hypot(e.clientX - drag.current.startX, e.clientY - drag.current.startY) < 5) return;
    if (!drag.current.moved) svg.setPointerCapture(e.pointerId);
    drag.current.moved = true;
    const dx = (e.clientX - prev.x) * unit;
    const dy = (e.clientY - prev.y) * unit;
    setBox((b) => ({ ...b, x: b.x - dx, y: b.y - dy }));
  };

  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) drag.current.pinch = null;
  };

  const onShapeClick = (view: BodyView, regionId: string, clientX: number, clientY: number) => {
    if (drag.current.moved) return;
    if (state.placingPin) {
      const p = toSvg(clientX, clientY);
      if (!p) return;
      onPlace({ regionId, position2d: { view, x: Math.round((p.x - OFFSET[view]) * 10) / 10, y: Math.round((p.y - LABEL_H) * 10) / 10 } });
      return;
    }
    onSelectRegion(regionId);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const step = box.w * 0.08;
    const k = e.key;
    if (k === "+" || k === "=") dispatch({ type: "zoom", payload: 1 });
    else if (k === "-" || k === "_") dispatch({ type: "zoom", payload: -1 });
    else if (k === "0") dispatch({ type: "resetView" });
    else if (k === "f" || k === "F") dispatch({ type: "frameSelection" });
    else if (k === "ArrowLeft") setBox((b) => ({ ...b, x: b.x - step }));
    else if (k === "ArrowRight") setBox((b) => ({ ...b, x: b.x + step }));
    else if (k === "ArrowUp") setBox((b) => ({ ...b, y: b.y - step }));
    else if (k === "ArrowDown") setBox((b) => ({ ...b, y: b.y + step }));
    else return;
    e.preventDefault();
  };

  const hidden = useMemo(() => new Set(state.hiddenRegions), [state.hiddenRegions]);
  const skinShown = isSystemShown(state, "integumentary");
  const regionName = useCallback((id: string) => index.byId.get(id)?.name ?? id, [index]);

  const renderShape = (view: BodyView, s: Shape2D, i: number) => {
    const region = index.byId.get(s.regionId);
    const system = region?.system ?? (s.regionId === "skin" ? "integumentary" : null);
    if (!system || !isSystemShown(state, system) || hidden.has(s.regionId)) return null;
    const selected = state.selectedRegionId === s.regionId;
    const hovered = hoveredRegionId === s.regionId;
    const faded = state.selectedRegionId !== null && !selected && !pinnedRegionIds.has(s.regionId);
    const opacity = (state.layers[system].opacity / 100) * (faded ? 0.25 : 1);
    const color = layerVar(system);
    const outline = selected ? "stroke-accent" : hovered ? "stroke-ink" : undefined;
    const common = {
      "data-region": s.regionId,
      onClick: (e: React.MouseEvent) => onShapeClick(view, s.regionId, e.clientX, e.clientY),
      onPointerEnter: () => onHoverRegion(s.regionId),
      onPointerLeave: () => onHoverRegion(null),
      className: cn("cursor-pointer", state.placingPin && "cursor-crosshair"),
    };
    const id = region?.svgPathId ? `${region.svgPathId}-${view}-${i}` : undefined;
    const title = <title>{region?.name ?? s.regionId}</title>;
    if (s.kind === "line") {
      return (
        <g key={i} id={id} {...common}>
          {title}
          {outline && <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} strokeWidth={s.width + 3 * scale} strokeLinecap="round" className={outline} />}
          <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} strokeWidth={s.width} strokeLinecap="round" style={{ stroke: color, strokeOpacity: opacity }} />
        </g>
      );
    }
    if (s.kind === "ring") {
      return (
        <g key={i} id={id} {...common}>
          {title}
          {outline && <ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill="none" strokeWidth={s.width + 3 * scale} className={outline} />}
          <ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill="none" strokeWidth={s.width} style={{ stroke: color, strokeOpacity: opacity }} />
        </g>
      );
    }
    return (
      <g key={i} id={id} {...common}>
        {title}
        <ellipse
          cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry}
          style={{ fill: color, fillOpacity: opacity }}
          strokeWidth={outline ? 1.5 * scale : 0}
          className={outline}
        />
      </g>
    );
  };

  const clusters = (view: BodyView) =>
    clusterPins(
      pins.flatMap((pin) => {
        const p = pinPoint2d(pin, view);
        return p ? [{ pin, point: p }] : [];
      }),
      (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
      14 * scale,
    );

  return (
    <div
      tabIndex={0}
      role="application"
      aria-roledescription="2D anatomy map"
      aria-label="2D anatomy map, front and back"
      aria-describedby={instructionsId}
      onKeyDown={onKeyDown}
      className={cn("absolute inset-0 touch-none", state.placingPin && "cursor-crosshair")}
    >
      <svg
        ref={svgRef}
        viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {(["front", "back"] as BodyView[]).map((view) => (
          <g key={view} transform={`translate(${OFFSET[view]} 0)`}>
            <text x={VIEW_W / 2} y={14} textAnchor="middle" className="fill-ink-3 font-mono uppercase" style={{ fontSize: 10, letterSpacing: "0.08em" }}>
              {view === "front" ? "Anterior" : "Posterior"}
            </text>
            <g transform={`translate(0 ${LABEL_H})`}>
              {!skinShown &&
                SILHOUETTE[view].map((s, i) =>
                  s.kind === "line" ? (
                    <line key={`sil-${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} strokeWidth={s.width} strokeLinecap="round" className="pointer-events-none stroke-raised" />
                  ) : s.kind === "ellipse" ? (
                    <ellipse key={`sil-${i}`} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} className="pointer-events-none fill-raised" />
                  ) : null,
                )}
              {VIEW_SHAPES[view].map((s, i) => renderShape(view, s, i))}
              {clusters(view).map((c) => (
                <PinMarker2D
                  key={c.key}
                  cluster={c}
                  scale={scale}
                  active={c.pins.some((p) => p.id === activePinId)}
                  label={pinAriaLabel(c.pins, regionName, SEVERITY_LABEL)}
                  onActivate={() => onPinActivate(c.pins[0])}
                />
              ))}
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}

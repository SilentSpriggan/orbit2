import { OrbitControls } from "@react-three/drei/core/OrbitControls.js";
import { Outlines } from "@react-three/drei/core/Outlines.js";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type KeyboardEvent, type MutableRefObject } from "react";
import { DoubleSide, Plane, Spherical, Vector3, type PerspectiveCamera } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { cn } from "../../../shared/ui/cn";
import { Skeleton } from "../../../shared/ui/Skeleton";
import { isSystemShown, type ViewerAction, type ViewerStore } from "../hooks/useViewerState";
import { buildPlaceholderParts, loadGlbParts, MODEL_URL, partsBounds, PLACEHOLDER_ENABLED, regionBounds, type BodyPart } from "../lib/bodyModel";
import { getViewerPalette, type ViewerPalette } from "../lib/cssColor";
import type { RegionIndex } from "../lib/regionIndex";
import { SEVERITY_LABEL, type AnatomyPin, type PinPlacement, type ViewPreset } from "../types";
import { clusterPins, pinAriaLabel } from "./pinCluster";
import { PinMarker3D } from "./PinMarker3D";

const TARGET = new Vector3(0, 0.95, 0);
const HOME_DISTANCE = 3.2;
const MIN_DISTANCE = 0.25;
const MAX_DISTANCE = 8;

const PRESET_DIR: Record<ViewPreset, Vector3> = {
  anterior: new Vector3(0, 0, 1),
  posterior: new Vector3(0, 0, -1),
  left: new Vector3(1, 0, 0), // the subject's left is +x
  right: new Vector3(-1, 0, 0),
  superior: new Vector3(0, 1, 0.001).normalize(),
};

const prefersReducedMotion = () => {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
};

export interface Viewer3DProps {
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
  /** GLB missing or failed: the card switches to the 2D fallback. */
  onLoadError: (reason: string) => void;
  onModelSource: (source: "glb" | "placeholder") => void;
  instructionsId: string;
}

interface RigApi {
  rotate: (dTheta: number, dPhi: number) => void;
}

/** Interactive 3D reference body (three + @react-three/fiber + drei). */
export default function Viewer3D(props: Viewer3DProps) {
  const { index, state, dispatch, onLoadError, onModelSource, instructionsId } = props;
  const [parts, setParts] = useState<BodyPart[] | null>(() => (PLACEHOLDER_ENABLED ? buildPlaceholderParts() : null));
  const [tip, setTip] = useState<{ x: number; y: number; regionId: string } | null>(null);
  const rig = useRef<RigApi | null>(null);
  const palette = useMemo(() => getViewerPalette(), []);

  useEffect(() => {
    if (PLACEHOLDER_ENABLED) {
      onModelSource("placeholder");
      return;
    }
    const ctrl = new AbortController();
    loadGlbParts(MODEL_URL, index.byMeshName, ctrl.signal)
      .then((p) => {
        setParts(p);
        onModelSource("glb");
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        // A missing file comes back as the SPA's HTML page, which fails to parse.
        const msg = e instanceof Error ? e.message : "";
        onLoadError(/doctype|<|404|JSON/i.test(msg) || !msg ? "model-missing" : msg);
      });
    return () => ctrl.abort();
  }, [index, onLoadError, onModelSource]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const step = Math.PI / 18;
    switch (e.key) {
      case "ArrowLeft": rig.current?.rotate(-step, 0); break;
      case "ArrowRight": rig.current?.rotate(step, 0); break;
      case "ArrowUp": rig.current?.rotate(0, -step); break;
      case "ArrowDown": rig.current?.rotate(0, step); break;
      case "+": case "=": dispatch({ type: "zoom", payload: 1 }); break;
      case "-": case "_": dispatch({ type: "zoom", payload: -1 }); break;
      case "0": dispatch({ type: "resetView" }); break;
      case "f": case "F": dispatch({ type: "frameSelection" }); break;
      default: return;
    }
    e.preventDefault();
  };

  const tipRegion = tip ? index.byId.get(tip.regionId) : null;

  return (
    <div
      tabIndex={0}
      role="application"
      aria-roledescription="3D anatomy viewer"
      aria-label="3D anatomy viewer"
      aria-describedby={instructionsId}
      onKeyDown={onKeyDown}
      onPointerLeave={() => setTip(null)}
      className={cn("absolute inset-0 touch-none", state.placingPin && "cursor-crosshair")}
    >
      {!parts ? (
        <div role="status" aria-label="Loading reference model" className="absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center gap-3">
            <Skeleton className="h-64 w-24 rounded-xl" />
            <span className="text-sm text-ink-2">Loading reference model…</span>
          </div>
        </div>
      ) : (
        <Canvas
          frameloop="demand"
          dpr={[1, 2]}
          camera={{ fov: 35, near: 0.02, far: 50, position: [0, TARGET.y, HOME_DISTANCE] }}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          onCreated={({ gl }) => { gl.localClippingEnabled = true; }}
          onPointerMissed={() => setTip(null)}
        >
          <Scene {...props} parts={parts} palette={palette} rig={rig} onTip={setTip} />
        </Canvas>
      )}
      {tip && tipRegion && (
        <div
          role="tooltip"
          style={{ left: tip.x + 14, top: tip.y + 14 }}
          className="pointer-events-none absolute z-10 max-w-[240px] bg-overlay border border-line-strong rounded-md px-2 py-1 text-xs text-ink shadow-overlay"
        >
          {tipRegion.name}
        </div>
      )}
    </div>
  );
}

interface SceneProps extends Viewer3DProps {
  parts: BodyPart[];
  palette: ViewerPalette;
  rig: MutableRefObject<RigApi | null>;
  onTip: (tip: { x: number; y: number; regionId: string } | null) => void;
}

function Scene({
  index, state, pins, pinnedRegionIds, hoveredRegionId, activePinId, parts, palette, rig,
  onHoverRegion, onSelectRegion, onPlace, onPinActivate, onZoomChange, onTip,
}: SceneProps) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const invalidate = useThree((s) => s.invalidate);
  const controls = useRef<OrbitControlsImpl | null>(null);
  const goal = useRef<{ pos: Vector3; target: Vector3 } | null>(null);
  const lastZoom = useRef(100);

  const bounds = useMemo(() => partsBounds(parts), [parts]);
  const regionCenters = useMemo(() => {
    const m = new Map<string, Vector3>();
    for (const id of new Set(parts.map((p) => p.regionId))) {
      const b = regionBounds(parts, id);
      if (b) m.set(id, b.getCenter(new Vector3()));
    }
    return m;
  }, [parts]);

  const moveTo = useCallback((pos: Vector3, target: Vector3) => {
    const c = controls.current;
    if (prefersReducedMotion() || !c) {
      camera.position.copy(pos);
      c?.target.copy(target);
      c?.update();
      goal.current = null;
    } else {
      goal.current = { pos, target };
    }
    invalidate();
  }, [camera, invalidate]);

  const reportZoom = useCallback(() => {
    const c = controls.current;
    if (!c) return;
    const pct = Math.round((HOME_DISTANCE / camera.position.distanceTo(c.target)) * 100);
    if (pct !== lastZoom.current) {
      lastZoom.current = pct;
      onZoomChange(pct);
    }
  }, [camera, onZoomChange]);

  useEffect(() => { onZoomChange(100); }, [onZoomChange]);

  useFrame(() => {
    const g = goal.current;
    const c = controls.current;
    if (!g || !c) return;
    camera.position.lerp(g.pos, 0.2);
    c.target.lerp(g.target, 0.2);
    c.update();
    if (camera.position.distanceTo(g.pos) < 0.002 && c.target.distanceTo(g.target) < 0.002) goal.current = null;
    invalidate();
  });

  // Keyboard rotation.
  useEffect(() => {
    rig.current = {
      rotate: (dTheta, dPhi) => {
        const c = controls.current;
        if (!c) return;
        goal.current = null;
        const offset = camera.position.clone().sub(c.target);
        const sph = new Spherical().setFromVector3(offset);
        sph.theta += dTheta;
        sph.phi = Math.min(Math.PI - 0.05, Math.max(0.05, sph.phi + dPhi));
        camera.position.copy(c.target).add(new Vector3().setFromSpherical(sph));
        c.update();
        invalidate();
      },
    };
    return () => { rig.current = null; };
  }, [camera, invalidate, rig]);

  const applyPreset = useCallback((preset: ViewPreset, distance = HOME_DISTANCE, target = TARGET) => {
    moveTo(target.clone().add(PRESET_DIR[preset].clone().multiplyScalar(distance)), target.clone());
  }, [moveTo]);

  useEffect(() => {
    if (!state.presetRequest) return;
    const c = controls.current;
    const target = c ? c.target.clone() : TARGET.clone();
    const distance = c ? camera.position.distanceTo(c.target) : HOME_DISTANCE;
    applyPreset(state.preset, distance, target);
  }, [state.presetRequest]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state.resetRequest) applyPreset("anterior");
  }, [state.resetRequest, applyPreset]);

  useEffect(() => {
    if (!state.zoomRequest.n) return;
    const c = controls.current;
    if (!c) return;
    const offset = camera.position.clone().sub(c.target);
    const d = Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, offset.length() * (state.zoomRequest.dir > 0 ? 0.8 : 1.25)));
    moveTo(c.target.clone().add(offset.setLength(d)), c.target.clone());
  }, [state.zoomRequest]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!state.frameRequest || !state.selectedRegionId) return;
    const box = regionBounds(parts, state.selectedRegionId);
    const c = controls.current;
    if (!box || !c) return;
    const center = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3()).length();
    const fit = size / (2 * Math.tan((camera.fov * Math.PI) / 360));
    // Leave room around the structure so its neighbours give context.
    const distance = Math.min(MAX_DISTANCE, Math.max(1.1, fit * 4));
    const dir = camera.position.clone().sub(c.target).normalize();
    moveTo(center.clone().add(dir.multiplyScalar(distance)), center);
  }, [state.frameRequest]); // eslint-disable-line react-hooks/exhaustive-deps

  const clipPlanes = useMemo(() => {
    const { axis, position } = state.section;
    if (axis === "off") return [];
    const t = position / 100;
    if (axis === "sagittal") return [new Plane(new Vector3(-1, 0, 0), bounds.min.x + (bounds.max.x - bounds.min.x) * t)];
    if (axis === "coronal") return [new Plane(new Vector3(0, 0, -1), bounds.min.z + (bounds.max.z - bounds.min.z) * t)];
    return [new Plane(new Vector3(0, -1, 0), bounds.min.y + (bounds.max.y - bounds.min.y) * t)];
  }, [state.section, bounds]);

  const hidden = useMemo(() => new Set(state.hiddenRegions), [state.hiddenRegions]);

  const onClick = (e: ThreeEvent<MouseEvent>, regionId: string) => {
    if (e.delta > 4) return; // that was an orbit drag
    e.stopPropagation();
    if (state.placingPin) {
      const n = e.face?.normal.clone().transformDirection(e.object.matrixWorld) ?? new Vector3(0, 0, 1);
      const r = (v: number) => Math.round(v * 1000) / 1000;
      onPlace({ regionId, position3d: { x: r(e.point.x), y: r(e.point.y), z: r(e.point.z), nx: r(n.x), ny: r(n.y), nz: r(n.z) } });
      return;
    }
    onSelectRegion(regionId);
  };

  const pinItems = useMemo(
    () =>
      pins.flatMap((pin) => {
        if (pin.position3d) return [{ pin, point: new Vector3(pin.position3d.x, pin.position3d.y, pin.position3d.z) }];
        const c = regionCenters.get(pin.regionId);
        return c ? [{ pin, point: c.clone() }] : [];
      }),
    [pins, regionCenters],
  );
  const clusters = useMemo(() => clusterPins(pinItems, (a, b) => a.distanceTo(b), 0.035), [pinItems]);
  const regionName = useCallback((id: string) => index.byId.get(id)?.name ?? id, [index]);

  return (
    <>
      <color attach="background" args={[palette.sunken]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[2.5, 3.5, 4]} intensity={1.6} />
      <directionalLight position={[-3, 1.5, -2.5]} intensity={0.55} />
      <OrbitControls
        ref={controls}
        makeDefault
        target={TARGET}
        enableDamping={false}
        minDistance={MIN_DISTANCE}
        maxDistance={MAX_DISTANCE}
        onChange={reportZoom}
        onStart={() => { goal.current = null; }}
      />
      {parts.map((part) => {
        const region = index.byId.get(part.regionId);
        if (!region || hidden.has(part.regionId) || !isSystemShown(state, region.system)) return null;
        const selected = state.selectedRegionId === part.regionId;
        const hovered = hoveredRegionId === part.regionId;
        const faded = state.selectedRegionId !== null && !selected && !pinnedRegionIds.has(part.regionId);
        const opacity = (state.layers[region.system].opacity / 100) * (faded ? 0.25 : 1);
        const solid = opacity >= 0.99;
        return (
          <mesh
            key={part.key}
            geometry={part.geometry}
            matrix={part.matrix}
            matrixAutoUpdate={false}
            renderOrder={solid ? 0 : 1}
            onClick={(e) => onClick(e, part.regionId)}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHoverRegion(part.regionId);
            }}
            onPointerMove={(e) => {
              e.stopPropagation();
              onTip({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, regionId: part.regionId });
            }}
            onPointerOut={() => {
              onHoverRegion(null);
              onTip(null);
            }}
          >
            <meshStandardMaterial
              color={palette.layer[region.system]}
              roughness={0.72}
              metalness={0}
              transparent={!solid}
              opacity={opacity}
              depthWrite={solid}
              side={DoubleSide}
              clippingPlanes={clipPlanes}
            />
            {(selected || hovered) && (
              <Outlines
                thickness={selected ? 0.006 : 0.003}
                color={selected ? palette.accent : palette.ink2}
                clippingPlanes={clipPlanes}
              />
            )}
          </mesh>
        );
      })}
      {clusters.map((c) => (
        <PinMarker3D
          key={c.key}
          cluster={c}
          color={palette.severity[c.severity]}
          active={c.pins.some((p) => p.id === activePinId)}
          label={pinAriaLabel(c.pins, regionName, SEVERITY_LABEL)}
          onActivate={() => onPinActivate(c.pins[0])}
        />
      ))}
    </>
  );
}

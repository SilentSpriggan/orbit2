import type { AnatomyPin } from "../types";
import { BODY_SHAPES, regionCentroid, shapeCenter, type BodyShape, type Vec3 } from "./bodyShapes";

/**
 * 2D fallback map: front and back outlines projected from the same reference
 * shapes as the 3D placeholder, so region ids and pins line up in both modes.
 */
export type BodyView = "front" | "back";

export const VIEW_W = 240;
export const VIEW_H = 500;
const SCALE = 260;
const CX = VIEW_W / 2;
const BASE = 488;

export function project(view: BodyView, p: Vec3): { x: number; y: number } {
  const x = view === "front" ? CX + p[0] * SCALE : CX - p[0] * SCALE;
  return { x, y: BASE - p[1] * SCALE };
}

export type Shape2D =
  | { kind: "ellipse"; regionId: string; cx: number; cy: number; rx: number; ry: number; z: number }
  | { kind: "line"; regionId: string; x1: number; y1: number; x2: number; y2: number; width: number; z: number }
  | { kind: "ring"; regionId: string; cx: number; cy: number; rx: number; ry: number; width: number; z: number };

function to2d(view: BodyView, s: BodyShape): Shape2D {
  const z = shapeCenter(s)[2];
  if (s.kind === "ellipsoid") {
    const c = project(view, s.center);
    return { kind: "ellipse", regionId: s.regionId, cx: c.x, cy: c.y, rx: s.radii[0] * SCALE, ry: s.radii[1] * SCALE, z };
  }
  if (s.kind === "capsule") {
    const a = project(view, s.from);
    const b = project(view, s.to);
    return { kind: "line", regionId: s.regionId, x1: a.x, y1: a.y, x2: b.x, y2: b.y, width: s.radius * 2 * SCALE, z };
  }
  const c = project(view, s.center);
  if (s.plane === "xy") {
    return { kind: "ring", regionId: s.regionId, cx: c.x, cy: c.y, rx: s.radius * s.scale[0] * SCALE, ry: s.radius * s.scale[1] * SCALE, width: s.tube * 2 * SCALE, z };
  }
  // A horizontal ring seen edge-on is a thin band.
  return { kind: "ellipse", regionId: s.regionId, cx: c.x, cy: c.y, rx: (s.radius * s.scale[0] + s.tube) * SCALE, ry: Math.max(s.tube * SCALE * 1.4, 2), z };
}

/** Shapes drawn in each view, ordered back to front. Skin comes first. */
function buildView(view: BodyView): Shape2D[] {
  const keep = BODY_SHAPES.filter((s) => {
    const z = shapeCenter(s)[2];
    return view === "front" ? z >= -0.04 : z <= 0.04;
  });
  const shapes = keep.map((s) => to2d(view, s));
  return shapes.sort((a, b) => {
    const skinA = a.regionId === "skin" ? 0 : 1;
    const skinB = b.regionId === "skin" ? 0 : 1;
    if (skinA !== skinB) return skinA - skinB;
    return view === "front" ? a.z - b.z : b.z - a.z;
  });
}

export const VIEW_SHAPES: Record<BodyView, Shape2D[]> = { front: buildView("front"), back: buildView("back") };

/** Silhouette (skin) shapes, drawn as an outline when the skin layer is hidden. */
export const SILHOUETTE: Record<BodyView, Shape2D[]> = {
  front: buildView("front").filter((s) => s.regionId === "skin" || s.regionId === "scalp"),
  back: buildView("back").filter((s) => s.regionId === "skin" || s.regionId === "scalp"),
};

export function shapeBounds(s: Shape2D): { x0: number; y0: number; x1: number; y1: number } {
  if (s.kind === "line") {
    const r = s.width / 2;
    return { x0: Math.min(s.x1, s.x2) - r, y0: Math.min(s.y1, s.y2) - r, x1: Math.max(s.x1, s.x2) + r, y1: Math.max(s.y1, s.y2) + r };
  }
  return { x0: s.cx - s.rx, y0: s.cy - s.ry, x1: s.cx + s.rx, y1: s.cy + s.ry };
}

/** Where a pin sits in a 2D view, or null if it is not shown in that view. */
export function pinPoint2d(pin: AnatomyPin, view: BodyView): { x: number; y: number } | null {
  if (pin.position2d) return pin.position2d.view === view ? { x: pin.position2d.x, y: pin.position2d.y } : null;
  if (pin.position3d) {
    const p = pin.position3d;
    const facesFront = p.nz > -0.3;
    const facesBack = p.nz < 0.3;
    if ((view === "front" && !facesFront) || (view === "back" && !facesBack)) return null;
    return project(view, [p.x, p.y, p.z]);
  }
  const c = regionCentroid(pin.regionId);
  if (!c) return null;
  const inView = VIEW_SHAPES[view].some((s) => s.regionId === pin.regionId);
  return inView ? project(view, c) : null;
}

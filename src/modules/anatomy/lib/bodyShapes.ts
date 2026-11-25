/**
 * Procedural reference body: simple capsules, ellipsoids and rings named by
 * region id. It drives the VITE_ANATOMY_PLACEHOLDER 3D body and the 2D
 * fallback map, so both share one coordinate system.
 *
 * Units are metres. Feet at y = 0, top of head at y ≈ 1.8, the body faces +z,
 * and the subject's left is +x.
 */
export type Vec3 = [number, number, number];

export type BodyShape =
  | { kind: "ellipsoid"; regionId: string; center: Vec3; radii: Vec3 }
  | { kind: "capsule"; regionId: string; from: Vec3; to: Vec3; radius: number }
  /** A ring. `plane` is the plane it lies in; `scale` stretches it in that plane. */
  | { kind: "torus"; regionId: string; center: Vec3; radius: number; tube: number; plane: "xz" | "xy"; scale: [number, number] };

const ell = (regionId: string, center: Vec3, radii: Vec3): BodyShape => ({ kind: "ellipsoid", regionId, center, radii });
const cap = (regionId: string, from: Vec3, to: Vec3, radius: number): BodyShape => ({ kind: "capsule", regionId, from, to, radius });
const ring = (regionId: string, center: Vec3, radius: number, tube: number, plane: "xz" | "xy", scale: [number, number]): BodyShape =>
  ({ kind: "torus", regionId, center, radius, tube, plane, scale });

const mx = (v: Vec3): Vec3 => [-v[0], v[1], v[2]];

/** Define the left side (+x); the right side is mirrored. */
function pair(base: string, make: (id: string) => BodyShape): BodyShape[] {
  const left = make(`${base}_left`);
  const right = { ...left, regionId: `${base}_right` } as BodyShape;
  if (right.kind === "ellipsoid" || right.kind === "torus") right.center = mx(right.center);
  if (right.kind === "capsule") { right.from = mx(right.from); right.to = mx(right.to); }
  return [left, right];
}

const RIB_LEVELS = [1.2, 1.25, 1.3, 1.35, 1.4, 1.45];

export const BODY_SHAPES: BodyShape[] = [
  // Integumentary — whole-body silhouette, then named parts.
  ell("skin", [0, 1.17, 0], [0.19, 0.31, 0.125]),
  cap("skin", [0, 1.46, 0], [0, 1.58, 0], 0.055),
  ...pair("skin_arm", (id) => cap(id, [0.205, 1.44, 0], [0.272, 0.86, 0.03], 0.052)).map((s) => ({ ...s, regionId: "skin" })),
  ...pair("skin_leg", (id) => cap(id, [0.095, 0.93, 0], [0.1, 0.08, 0], 0.08)).map((s) => ({ ...s, regionId: "skin" })),
  ell("scalp", [0, 1.7, -0.005], [0.097, 0.095, 0.107]),
  ...pair("hand", (id) => ell(id, [0.275, 0.78, 0.035], [0.032, 0.072, 0.022])),
  ...pair("foot", (id) => ell(id, [0.1, 0.03, 0.06], [0.042, 0.026, 0.1])),

  // Skeletal
  ell("skull", [0, 1.66, 0], [0.09, 0.11, 0.1]),
  cap("spine_cervical", [0, 1.5, -0.03], [0, 1.58, -0.03], 0.02),
  cap("spine_thoracic", [0, 1.18, -0.065], [0, 1.48, -0.06], 0.022),
  cap("spine_lumbar", [0, 0.98, -0.055], [0, 1.16, -0.06], 0.026),
  ...RIB_LEVELS.map((y, i) => ring("ribcage", [0, y, 0], 1, 0.008, "xz", [0.13 + 0.01 * Math.min(i, 5 - i), 0.1])),
  ring("pelvis", [0, 0.95, 0], 1, 0.028, "xz", [0.14, 0.085]),
  ...pair("clavicle", (id) => cap(id, [0.02, 1.47, 0.06], [0.17, 1.49, 0.0], 0.011)),
  ...pair("humerus", (id) => cap(id, [0.2, 1.43, 0], [0.24, 1.15, -0.01], 0.021)),
  ...pair("femur", (id) => cap(id, [0.09, 0.92, 0], [0.1, 0.53, 0], 0.027)),
  ...pair("knee", (id) => ell(id, [0.1, 0.49, 0.008], [0.048, 0.045, 0.048])),
  ...pair("patella", (id) => ell(id, [0.1, 0.49, 0.054], [0.024, 0.03, 0.012])),
  ...pair("tibia", (id) => cap(id, [0.1, 0.44, 0.01], [0.1, 0.1, 0], 0.021)),
  ...pair("ankle", (id) => ell(id, [0.1, 0.07, 0], [0.03, 0.026, 0.03])),

  // Muscular
  ...pair("shoulder", (id) => ell(id, [0.2, 1.44, 0], [0.055, 0.07, 0.06])),
  ...pair("forearm", (id) => cap(id, [0.245, 1.12, 0.005], [0.268, 0.86, 0.03], 0.038)),
  ...pair("quadriceps", (id) => cap(id, [0.09, 0.88, 0.022], [0.1, 0.57, 0.028], 0.066)),
  ...pair("calf", (id) => cap(id, [0.1, 0.42, -0.032], [0.1, 0.15, -0.02], 0.048)),
  ell("abdominal_wall", [0, 1.04, 0.095], [0.13, 0.12, 0.025]),
  ell("lower_back", [0, 1.04, -0.095], [0.11, 0.1, 0.025]),

  // Nervous
  ell("brain", [0, 1.69, -0.005], [0.075, 0.07, 0.085]),
  cap("spinal_cord", [0, 1.0, -0.085], [0, 1.6, -0.045], 0.007),
  ...pair("sciatic_nerve", (id) => cap(id, [0.075, 0.95, -0.07], [0.1, 0.52, -0.05], 0.007)),
  ...pair("eye", (id) => ell(id, [0.032, 1.655, 0.085], [0.013, 0.013, 0.013])),
  ell("inner_ear", [0.072, 1.64, 0], [0.012, 0.012, 0.012]),
  ell("inner_ear", [-0.072, 1.64, 0], [0.012, 0.012, 0.012]),

  // Cardiovascular
  ell("heart", [0.02, 1.3, 0.04], [0.05, 0.06, 0.045]),
  cap("aorta", [0, 1.36, 0.02], [0, 0.95, -0.025], 0.012),
  ...pair("carotid", (id) => cap(id, [0.025, 1.42, 0.03], [0.032, 1.58, 0.02], 0.006)),
  ...pair("femoral_artery", (id) => cap(id, [0.07, 0.9, 0.05], [0.09, 0.56, 0.0], 0.007)),

  // Respiratory
  ring("thorax", [0, 1.26, 0], 1, 0.012, "xz", [0.17, 0.125]),
  ...pair("lung", (id) => ell(id, [0.08, 1.32, 0], [0.062, 0.12, 0.072])),
  cap("trachea", [0, 1.4, 0.022], [0, 1.56, 0.03], 0.01),
  ell("diaphragm", [0, 1.18, 0], [0.135, 0.014, 0.095]),
  ell("nasal_cavity", [0, 1.63, 0.09], [0.015, 0.02, 0.02]),

  // Digestive
  cap("esophagus", [0, 1.2, -0.022], [0, 1.56, 0.008], 0.008),
  ell("stomach", [0.05, 1.12, 0.04], [0.06, 0.045, 0.04]),
  ell("liver", [-0.06, 1.14, 0.03], [0.09, 0.05, 0.06]),
  ell("intestine_small", [0, 1.0, 0.03], [0.085, 0.06, 0.05]),
  ring("colon", [0, 1.0, 0.02], 1, 0.018, "xy", [0.11, 0.085]),

  // Urinary
  ...pair("kidney", (id) => ell(id, [0.07, 1.08, -0.05], [0.025, 0.045, 0.025])),
  ...pair("ureter", (id) => cap(id, [0.065, 1.04, -0.04], [0.03, 0.91, 0.025], 0.004)),
  ell("bladder", [0, 0.9, 0.04], [0.035, 0.032, 0.035]),

  // Lymphatic
  ell("spleen", [0.1, 1.14, -0.03], [0.025, 0.04, 0.025]),
  ell("thymus", [0, 1.42, 0.06], [0.025, 0.025, 0.012]),
  ell("lymph_cervical", [0.042, 1.53, 0.02], [0.01, 0.01, 0.01]),
  ell("lymph_cervical", [-0.042, 1.53, 0.02], [0.01, 0.01, 0.01]),
  ...pair("lymph_axillary", (id) => ell(id, [0.16, 1.38, 0.0], [0.015, 0.015, 0.015])),
  ...pair("lymph_inguinal", (id) => ell(id, [0.08, 0.88, 0.06], [0.012, 0.012, 0.012])),
];

/** The centre of a shape. */
export function shapeCenter(s: BodyShape): Vec3 {
  if (s.kind === "capsule") return [(s.from[0] + s.to[0]) / 2, (s.from[1] + s.to[1]) / 2, (s.from[2] + s.to[2]) / 2];
  return s.center;
}

/** Average centre of every shape of a region; null if the region has no shape. */
export function regionCentroid(regionId: string): Vec3 | null {
  const shapes = BODY_SHAPES.filter((s) => s.regionId === regionId);
  if (!shapes.length) return null;
  const sum = shapes.reduce<Vec3>((acc, s) => {
    const c = shapeCenter(s);
    return [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]];
  }, [0, 0, 0]);
  return [sum[0] / shapes.length, sum[1] / shapes.length, sum[2] / shapes.length];
}

/** Body extents, used for section planes and camera framing. */
export const BODY_BOUNDS = { min: [-0.32, 0, -0.14] as Vec3, max: [0.32, 1.8, 0.16] as Vec3 };

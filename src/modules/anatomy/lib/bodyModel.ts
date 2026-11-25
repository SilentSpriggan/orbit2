import {
  Box3,
  BufferGeometry,
  CapsuleGeometry,
  Matrix4,
  Mesh,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type Object3D,
} from "three";
import { BODY_SHAPES, type BodyShape } from "./bodyShapes";

/** One drawable piece of the reference body, already placed in body space. */
export interface BodyPart {
  key: string;
  regionId: string;
  geometry: BufferGeometry;
  matrix: Matrix4;
  /** World-space bounds, for framing and section planes. */
  bounds: Box3;
}

// Under the app base (/voice/ in the website build), not the site root.
export const MODEL_URL = `${import.meta.env.BASE_URL}models/anatomy/body.glb`;
/** Draco decoders are served locally next to the model, never from a CDN. */
export const DRACO_PATH = `${import.meta.env.BASE_URL}models/anatomy/draco/`;

export const PLACEHOLDER_ENABLED = import.meta.env.VITE_ANATOMY_PLACEHOLDER === "true";

const Y = new Vector3(0, 1, 0);

function partFromShape(s: BodyShape, i: number): BodyPart {
  let geometry: BufferGeometry;
  const m = new Matrix4();
  if (s.kind === "ellipsoid") {
    geometry = new SphereGeometry(1, 32, 20);
    m.compose(new Vector3(...s.center), new Quaternion(), new Vector3(...s.radii));
  } else if (s.kind === "capsule") {
    const a = new Vector3(...s.from);
    const b = new Vector3(...s.to);
    const dir = b.clone().sub(a);
    const length = Math.max(0.001, dir.length());
    geometry = new CapsuleGeometry(s.radius, length, 6, 16);
    m.compose(a.add(b).multiplyScalar(0.5), new Quaternion().setFromUnitVectors(Y, dir.normalize()), new Vector3(1, 1, 1));
  } else {
    const minScale = Math.min(s.scale[0], s.scale[1]);
    geometry = new TorusGeometry(s.radius, s.tube / minScale, 10, 48);
    const q = s.plane === "xz" ? new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2) : new Quaternion();
    m.compose(new Vector3(...s.center), q, new Vector3(s.scale[0], s.scale[1], 1));
  }
  geometry.computeBoundingBox();
  const bounds = (geometry.boundingBox ?? new Box3()).clone().applyMatrix4(m);
  return { key: `${s.regionId}#${i}`, regionId: s.regionId, geometry, matrix: m, bounds };
}

let placeholderCache: BodyPart[] | null = null;

/** Capsules, spheres and rings named by region id (VITE_ANATOMY_PLACEHOLDER=true). */
export function buildPlaceholderParts(): BodyPart[] {
  if (!placeholderCache) placeholderCache = BODY_SHAPES.map(partFromShape);
  return placeholderCache;
}

/**
 * Load the shipped GLB and map its meshes to regions through regions.json
 * meshNames. The model is scaled to 1.8 m, feet at y = 0, centred on x/z.
 * Meshes that match no region are skipped.
 */
export async function loadGlbParts(url: string, byMeshName: Map<string, string>, signal?: AbortSignal): Promise<BodyPart[]> {
  // Loaders are split out: the placeholder body never downloads them.
  const [{ GLTFLoader }, { DRACOLoader }, { MeshoptDecoder }] = await Promise.all([
    import("three/examples/jsm/loaders/GLTFLoader.js"),
    import("three/examples/jsm/loaders/DRACOLoader.js"),
    import("three/examples/jsm/libs/meshopt_decoder.module.js"),
  ]);
  const draco = new DRACOLoader().setDecoderPath(DRACO_PATH);
  const loader = new GLTFLoader().setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder);
  try {
    const gltf = await loader.loadAsync(url);
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const root = gltf.scene;
    root.updateMatrixWorld(true);
    const all = new Box3().setFromObject(root);
    const size = all.getSize(new Vector3());
    const center = all.getCenter(new Vector3());
    const k = size.y > 0 ? 1.8 / size.y : 1;
    const normalize = new Matrix4().makeScale(k, k, k).multiply(new Matrix4().makeTranslation(-center.x, -all.min.y, -center.z));

    const parts: BodyPart[] = [];
    const regionFor = (o: Object3D): string | undefined => {
      for (let n: Object3D | null = o; n; n = n.parent) {
        const r = byMeshName.get(n.name);
        if (r) return r;
      }
      return undefined;
    };
    root.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      const regionId = regionFor(o);
      if (!regionId) return;
      const geometry = o.geometry as BufferGeometry;
      const matrix = normalize.clone().multiply(o.matrixWorld);
      geometry.computeBoundingBox();
      const bounds = (geometry.boundingBox ?? new Box3()).clone().applyMatrix4(matrix);
      parts.push({ key: `${regionId}#${o.uuid}`, regionId, geometry, matrix, bounds });
    });
    if (!parts.length) throw new Error("The model has no meshes that match regions.json.");
    return parts;
  } finally {
    draco.dispose();
  }
}

/** Bounds of every part of one region. */
export function regionBounds(parts: BodyPart[], regionId: string): Box3 | null {
  const box = new Box3();
  let found = false;
  for (const p of parts) {
    if (p.regionId !== regionId) continue;
    box.union(p.bounds);
    found = true;
  }
  return found ? box : null;
}

export function partsBounds(parts: BodyPart[]): Box3 {
  const box = new Box3();
  for (const p of parts) box.union(p.bounds);
  return box;
}

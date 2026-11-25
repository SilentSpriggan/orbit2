import type { AnatomyPin, PinSeverity } from "../types";

export interface PinCluster<P> {
  key: string;
  pins: AnatomyPin[];
  point: P;
  /** Worst severity in the cluster. */
  severity: PinSeverity;
}

const RANK: Record<PinSeverity, number> = { nominal: 1, caution: 2, critical: 3 };

export function worstSeverity(pins: AnatomyPin[]): PinSeverity {
  return pins.reduce<PinSeverity>((w, p) => (RANK[p.severity] > RANK[w] ? p.severity : w), "nominal");
}

/** Greedy clustering: pins closer than `radius` (by `dist`) share one marker. */
export function clusterPins<P>(
  items: { pin: AnatomyPin; point: P }[],
  dist: (a: P, b: P) => number,
  radius: number,
): PinCluster<P>[] {
  const clusters: PinCluster<P>[] = [];
  for (const it of items) {
    const near = clusters.find((c) => dist(c.point, it.point) < radius);
    if (near) {
      near.pins.push(it.pin);
      near.severity = worstSeverity(near.pins);
    } else {
      clusters.push({ key: it.pin.id, pins: [it.pin], point: it.point, severity: it.pin.severity });
    }
  }
  for (const c of clusters) c.key = c.pins.map((p) => p.id).join("+");
  return clusters;
}

export function pinAriaLabel(pins: AnatomyPin[], regionName: (id: string) => string, severityLabel: Record<PinSeverity, string>): string {
  if (pins.length === 1) {
    const p = pins[0];
    return `Pin: ${p.title}. ${severityLabel[p.severity]}. ${regionName(p.regionId)}.`;
  }
  return `${pins.length} pins: ${pins.map((p) => `${p.title} (${severityLabel[p.severity]})`).join(", ")}.`;
}

import { Html } from "@react-three/drei/web/Html.js";
import type { Vector3 } from "three";
import { cn, ICON_STROKE } from "../../../shared/ui/cn";
import { STATUS_ICON } from "../../../shared/ui/StatusBadge";
import type { PinCluster } from "./pinCluster";

const CHIP = {
  nominal: "bg-nominal-tint border-nominal text-nominal",
  caution: "bg-caution-tint border-caution text-caution",
  critical: "bg-critical-tint border-critical text-critical",
} as const;

export interface PinMarker3DProps {
  cluster: PinCluster<Vector3>;
  color: string;
  active: boolean;
  label: string;
  onActivate: () => void;
}

/**
 * Screen-space disc (sprite) colored by severity, plus an HTML chip with the
 * status icon so the marker is never color-only. Clusters show a mono count.
 */
export function PinMarker3D({ cluster, color, active, label, onActivate }: PinMarker3DProps) {
  const Icon = STATUS_ICON[cluster.severity];
  const count = cluster.pins.length;
  return (
    <group position={cluster.point}>
      <sprite scale={[0.03, 0.03, 1]} renderOrder={10}>
        <spriteMaterial color={color} sizeAttenuation={false} depthTest={false} transparent opacity={0.35} />
      </sprite>
      <Html center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <button
          type="button"
          aria-label={label}
          onClick={(e) => {
            e.stopPropagation();
            onActivate();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="pointer-events-auto relative grid size-11 place-items-center rounded-full"
        >
          <span
            className={cn(
              "grid size-6 place-items-center rounded-full border",
              CHIP[cluster.severity],
              active && "outline-2 outline-offset-2 outline-accent",
            )}
          >
            <Icon size={14} strokeWidth={ICON_STROKE + 0.25} aria-hidden="true" />
          </span>
          {count > 1 && (
            <span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-sm border border-line-strong bg-overlay px-1 font-mono text-2xs font-semibold text-ink">
              {count}
            </span>
          )}
        </button>
      </Html>
    </group>
  );
}

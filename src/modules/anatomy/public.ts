/**
 * Public surface of the Anatomy lab for other modules.
 *
 * Modules never import each other's folders at runtime, so the supported way
 * to drive the viewer is the `orbit:anatomy` window event:
 *
 *   window.dispatchEvent(new CustomEvent("orbit:anatomy", {
 *     detail: { action: "selectRegion", payload: "knee_left" },
 *   }));
 *
 * `anatomyActions` builds those details with the right shape, and
 * `dispatchAnatomyAction` sends one. The flat snake_case form used by the
 * Crew assistant's `control_anatomy` tool is also accepted:
 *   { action: "focus_region", region: "knee_left" }
 *
 * Deep links stay stable: /anatomy?crew=c03&region=knee_left&pin=p12
 */
import type { BodySystem, SectionAxis, ViewPreset } from "./types";

export const ANATOMY_EVENT = "orbit:anatomy";

export type AnatomyCommand =
  | { action: "selectRegion"; payload: string | null }
  | { action: "setPreset"; payload: ViewPreset }
  | { action: "toggleLayer"; payload: BodySystem }
  | { action: "isolate"; payload: BodySystem | null }
  | { action: "setSection"; payload: { axis?: SectionAxis; position?: number } }
  | { action: "frameSelection"; payload?: undefined }
  | { action: "resetView"; payload?: undefined };

export const anatomyActions = {
  selectRegion: (regionId: string | null): AnatomyCommand => ({ action: "selectRegion", payload: regionId }),
  setPreset: (preset: ViewPreset): AnatomyCommand => ({ action: "setPreset", payload: preset }),
  toggleLayer: (system: BodySystem): AnatomyCommand => ({ action: "toggleLayer", payload: system }),
  isolate: (system: BodySystem | null): AnatomyCommand => ({ action: "isolate", payload: system }),
  setSection: (axis: SectionAxis, position?: number): AnatomyCommand => ({ action: "setSection", payload: { axis, position } }),
  frameSelection: (): AnatomyCommand => ({ action: "frameSelection" }),
  resetView: (): AnatomyCommand => ({ action: "resetView" }),
} as const;

export function dispatchAnatomyAction(command: AnatomyCommand): void {
  window.dispatchEvent(new CustomEvent(ANATOMY_EVENT, { detail: command }));
}

/** Link to the workspace with a crew member, region and pin preselected. */
export function anatomyHref(params: { crew?: string; region?: string; pin?: string }): string {
  const q = new URLSearchParams();
  if (params.crew) q.set("crew", params.crew);
  if (params.region) q.set("region", params.region);
  if (params.pin) q.set("pin", params.pin);
  const s = q.toString();
  return s ? `/anatomy?${s}` : "/anatomy";
}

import { useEffect, useRef, type Dispatch } from "react";
import { ANATOMY_EVENT } from "../public";
import { BODY_SYSTEMS, type BodySystem, type SectionAxis, type ViewPreset } from "../types";
import type { ViewerAction } from "./useViewerState";

const PRESETS: ViewPreset[] = ["anterior", "posterior", "left", "right", "superior"];
const PRESET_ALIASES: Record<string, ViewPreset> = { front: "anterior", back: "posterior", top: "superior", above: "superior" };
const AXES: SectionAxis[] = ["off", "sagittal", "coronal", "axial"];

const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

function field(detail: Record<string, unknown>, payload: unknown, ...keys: string[]): unknown {
  if (typeof payload !== "object" || payload === null) {
    if (payload !== undefined) return payload;
  } else {
    for (const k of keys) if (k in payload) return (payload as Record<string, unknown>)[k];
  }
  for (const k of keys) if (k in detail) return detail[k];
  return undefined;
}

/**
 * Translate an `orbit:anatomy` event into viewer actions. Unknown actions and
 * unknown region ids are ignored.
 */
export function commandToActions(raw: unknown, regionExists: (id: string) => boolean): ViewerAction[] {
  if (typeof raw !== "object" || raw === null) return [];
  const detail = raw as Record<string, unknown>;
  const name = str(detail.action);
  if (!name) return [];
  const payload = detail.payload;
  switch (toCamel(name)) {
    case "selectRegion":
    case "focusRegion": {
      const value = field(detail, payload, "region", "regionId", "id");
      if (value === null) return [{ type: "selectRegion", payload: null }];
      const id = str(value);
      if (!id || !regionExists(id)) return [];
      const out: ViewerAction[] = [{ type: "selectRegion", payload: id }];
      if (toCamel(name) === "focusRegion") out.push({ type: "frameSelection" });
      return out;
    }
    case "frameSelection":
      return [{ type: "frameSelection" }];
    case "resetView":
      return [{ type: "selectRegion", payload: null }, { type: "resetView" }];
    case "setPreset":
    case "rotate": {
      const v = str(field(detail, payload, "preset", "view", "direction"))?.toLowerCase() ?? "";
      const preset = PRESETS.includes(v as ViewPreset) ? (v as ViewPreset) : PRESET_ALIASES[v];
      return preset ? [{ type: "setPreset", payload: preset }] : [];
    }
    case "toggleLayer": {
      const v = str(field(detail, payload, "layer", "system"))?.toLowerCase();
      return v && BODY_SYSTEMS.includes(v as BodySystem) ? [{ type: "toggleLayer", payload: v as BodySystem }] : [];
    }
    case "isolate": {
      const value = field(detail, payload, "system", "layer");
      if (value === null) return [{ type: "isolate", payload: null }];
      const v = str(value)?.toLowerCase();
      return v && BODY_SYSTEMS.includes(v as BodySystem) ? [{ type: "isolate", payload: v as BodySystem }] : [];
    }
    case "setSection": {
      const axis = str(field(detail, payload, "axis"));
      const position = field(detail, payload, "position");
      return [{
        type: "setSection",
        payload: {
          axis: axis && AXES.includes(axis as SectionAxis) ? (axis as SectionAxis) : undefined,
          position: typeof position === "number" ? position : undefined,
        },
      }];
    }
    default:
      return [];
  }
}

/** Listen for `orbit:anatomy` window events while the workspace is mounted. */
export function useAnatomyEvents(dispatch: Dispatch<ViewerAction>, regionExists: (id: string) => boolean): void {
  const existsRef = useRef(regionExists);
  existsRef.current = regionExists;
  useEffect(() => {
    const onEvent = (e: Event) => {
      if (!(e instanceof CustomEvent)) return;
      for (const a of commandToActions(e.detail, existsRef.current)) dispatch(a);
    };
    window.addEventListener(ANATOMY_EVENT, onEvent);
    return () => window.removeEventListener(ANATOMY_EVENT, onEvent);
  }, [dispatch]);
}

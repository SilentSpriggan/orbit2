import { useReducer } from "react";
import { BODY_SYSTEMS, type BodySystem, type SectionAxis, type ViewerState, type ViewPreset } from "../types";

/**
 * Viewer state lives in one reducer so other modules (the Crew assistant) can
 * drive it through the same actions, via public.ts and the `orbit:anatomy`
 * window event.
 */
export interface ViewerStore extends ViewerState {
  /** Regions hidden with the inspector's Hide button. */
  hiddenRegions: string[];
  /** Counters the cameras watch; each bump is one request. */
  frameRequest: number;
  resetRequest: number;
  presetRequest: number;
  /** One step of keyboard / command zoom (+1 in, -1 out). */
  zoomRequest: { n: number; dir: 1 | -1 };
}

export type ViewerAction =
  | { type: "selectRegion"; payload: string | null }
  | { type: "setPreset"; payload: ViewPreset }
  | { type: "toggleLayer"; payload: BodySystem }
  | { type: "setLayerVisible"; payload: { system: BodySystem; visible: boolean } }
  | { type: "setLayerOpacity"; payload: { system: BodySystem; opacity: number } }
  | { type: "isolate"; payload: BodySystem | null }
  | { type: "setSection"; payload: { axis?: SectionAxis; position?: number } }
  | { type: "frameSelection" }
  | { type: "resetView" }
  | { type: "zoom"; payload: 1 | -1 }
  | { type: "setMode"; payload: { mode: ViewerState["mode"]; isFallback?: boolean } }
  | { type: "setPlacingPin"; payload: boolean }
  | { type: "hideRegion"; payload: string }
  | { type: "showAllRegions" };

/** Defaults: skin hidden and muscles translucent so inner structures can be seen. */
const DEFAULT_LAYERS: ViewerState["layers"] = {
  skeletal: { visible: true, opacity: 100 },
  muscular: { visible: true, opacity: 40 },
  nervous: { visible: true, opacity: 100 },
  cardiovascular: { visible: true, opacity: 100 },
  respiratory: { visible: true, opacity: 70 },
  digestive: { visible: true, opacity: 80 },
  urinary: { visible: true, opacity: 100 },
  lymphatic: { visible: true, opacity: 100 },
  integumentary: { visible: false, opacity: 25 },
};

export function initialViewerState(overrides: Partial<ViewerStore> = {}): ViewerStore {
  return {
    mode: "3d",
    isFallback: false,
    preset: "anterior",
    layers: DEFAULT_LAYERS,
    isolated: null,
    section: { axis: "off", position: 50 },
    selectedRegionId: null,
    placingPin: false,
    hiddenRegions: [],
    frameRequest: 0,
    resetRequest: 0,
    presetRequest: 0,
    zoomRequest: { n: 0, dir: 1 },
    ...overrides,
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function viewerReducer(state: ViewerStore, action: ViewerAction): ViewerStore {
  switch (action.type) {
    case "selectRegion":
      if (state.selectedRegionId === action.payload) return state;
      return {
        ...state,
        selectedRegionId: action.payload,
        // Selecting a hidden region shows it again.
        hiddenRegions: action.payload ? state.hiddenRegions.filter((id) => id !== action.payload) : state.hiddenRegions,
      };
    case "setPreset":
      return { ...state, preset: action.payload, presetRequest: state.presetRequest + 1 };
    case "toggleLayer": {
      const layer = state.layers[action.payload];
      return { ...state, layers: { ...state.layers, [action.payload]: { ...layer, visible: !layer.visible } } };
    }
    case "setLayerVisible": {
      const layer = state.layers[action.payload.system];
      return { ...state, layers: { ...state.layers, [action.payload.system]: { ...layer, visible: action.payload.visible } } };
    }
    case "setLayerOpacity": {
      const layer = state.layers[action.payload.system];
      return {
        ...state,
        layers: { ...state.layers, [action.payload.system]: { ...layer, opacity: clamp(Math.round(action.payload.opacity), 0, 100) } },
      };
    }
    case "isolate": {
      if (action.payload === null) return { ...state, isolated: null };
      // Isolating a hidden layer makes it visible, otherwise nothing would show.
      const layer = state.layers[action.payload];
      return {
        ...state,
        isolated: action.payload,
        layers: layer.visible ? state.layers : { ...state.layers, [action.payload]: { ...layer, visible: true } },
      };
    }
    case "setSection":
      return {
        ...state,
        section: {
          axis: action.payload.axis ?? state.section.axis,
          position: clamp(action.payload.position ?? state.section.position, 0, 100),
        },
      };
    case "frameSelection":
      return { ...state, frameRequest: state.frameRequest + 1 };
    case "resetView":
      return { ...state, preset: "anterior", resetRequest: state.resetRequest + 1 };
    case "zoom":
      return { ...state, zoomRequest: { n: state.zoomRequest.n + 1, dir: action.payload } };
    case "setMode":
      return { ...state, mode: action.payload.mode, isFallback: action.payload.isFallback ?? false };
    case "setPlacingPin":
      return state.placingPin === action.payload ? state : { ...state, placingPin: action.payload };
    case "hideRegion":
      return state.hiddenRegions.includes(action.payload)
        ? state
        : { ...state, hiddenRegions: [...state.hiddenRegions, action.payload] };
    case "showAllRegions":
      return state.hiddenRegions.length ? { ...state, hiddenRegions: [] } : state;
    default:
      return state;
  }
}

export function useViewerState(overrides?: Partial<ViewerStore>) {
  return useReducer(viewerReducer, overrides, initialViewerState);
}

/** Is a region's layer drawn right now (visibility, isolation and Hide)? */
export function isSystemShown(state: ViewerState, system: BodySystem): boolean {
  if (state.isolated && state.isolated !== system) return false;
  return state.layers[system].visible;
}

export const ALL_SYSTEMS = BODY_SYSTEMS;

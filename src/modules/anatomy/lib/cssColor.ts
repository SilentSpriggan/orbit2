import type { BodySystem, PinSeverity } from "../types";

/**
 * three.js needs color values, but components must not hard-code hex.
 * Read the design tokens from the document at runtime instead.
 */
export function readCssVar(name: string): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || "gray";
  } catch {
    return "gray";
  }
}

export interface ViewerPalette {
  accent: string;
  sunken: string;
  ink: string;
  ink2: string;
  layer: Record<BodySystem, string>;
  severity: Record<PinSeverity, string>;
}

let cached: ViewerPalette | null = null;

/** Token colors for the 3D viewer. The app is dark-only, so read once. */
export function getViewerPalette(): ViewerPalette {
  if (cached) return cached;
  cached = {
    accent: readCssVar("--color-accent"),
    sunken: readCssVar("--color-sunken"),
    ink: readCssVar("--color-ink"),
    ink2: readCssVar("--color-ink-2"),
    layer: {
      skeletal: readCssVar("--color-layer-skeletal"),
      muscular: readCssVar("--color-layer-muscular"),
      nervous: readCssVar("--color-layer-nervous"),
      cardiovascular: readCssVar("--color-layer-cardiovascular"),
      respiratory: readCssVar("--color-layer-respiratory"),
      digestive: readCssVar("--color-layer-digestive"),
      urinary: readCssVar("--color-layer-urinary"),
      lymphatic: readCssVar("--color-layer-lymphatic"),
      integumentary: readCssVar("--color-layer-integumentary"),
    },
    severity: {
      nominal: readCssVar("--color-nominal"),
      caution: readCssVar("--color-caution"),
      critical: readCssVar("--color-critical"),
    },
  };
  return cached;
}

/** CSS `var()` reference for a layer swatch (inline style, still a token). */
export const layerVar = (system: BodySystem) => `var(--color-layer-${system})`;

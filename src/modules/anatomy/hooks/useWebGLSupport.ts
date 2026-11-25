import { useState } from "react";

let cached: boolean | null = null;

/** Try a WebGL 2 context once per page load and cache the answer. */
export function detectWebGL2(): boolean {
  if (cached !== null) return cached;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    cached = gl !== null;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    cached = false;
  }
  return cached;
}

/** Dev-only `?webgl=off` forces the 2D fallback so it can be checked. */
function forcedOff(): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    return new URLSearchParams(window.location.search).get("webgl") === "off";
  } catch {
    return false;
  }
}

export function useWebGLSupport(): boolean {
  const [supported] = useState(() => !forcedOff() && detectWebGL2());
  return supported;
}

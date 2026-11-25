import { useMediaQuery, WIDE } from "../../../shared/hooks/useMediaQuery";
import { useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";

export function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

export function useIsWide(): boolean {
  return useMediaQuery(WIDE);
}

function subscribeVisibility(cb: () => void) {
  document.addEventListener("visibilitychange", cb);
  return () => document.removeEventListener("visibilitychange", cb);
}

export function useDocumentVisible(): boolean {
  return useSyncExternalStore(subscribeVisibility, () => document.visibilityState === "visible", () => true);
}

export type PageStateOverride = "loading" | "empty" | "error" | null;

/** Dev-only `?state=loading|empty|error` override (definition of done, section K). */
export function usePageStateOverride(): PageStateOverride {
  const { search } = useLocation();
  if (!import.meta.env.DEV) return null;
  const v = new URLSearchParams(search).get("state");
  return v === "loading" || v === "empty" || v === "error" ? v : null;
}

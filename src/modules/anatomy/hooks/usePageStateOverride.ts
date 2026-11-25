import { useLocation } from "react-router-dom";

export type PageStateOverride = "loading" | "empty" | "error" | null;

/** Dev-only `?state=loading|empty|error` override (definition of done, section K). */
export function usePageStateOverride(): PageStateOverride {
  const { search } = useLocation();
  if (!import.meta.env.DEV) return null;
  const v = new URLSearchParams(search).get("state");
  return v === "loading" || v === "empty" || v === "error" ? v : null;
}

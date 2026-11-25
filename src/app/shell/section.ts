/** Which top-level module a route belongs to, for the sidebar's current item and the top bar. */
export type Section = "crew" | "anatomy" | "assistant" | "evidence" | "other";

export const SECTION_LABEL: Record<Section, string> = {
  crew: "Crew status",
  anatomy: "Anatomy lab",
  assistant: "Crew voice assistant",
  evidence: "Offline evidence library",
  other: "ORBIT",
};

export function currentSection(pathname: string): Section {
  const first = pathname.replace(/^\/+/, "").split("/")[0];
  return first === "crew" || first === "anatomy" || first === "assistant" || first === "evidence" ? first : "other";
}

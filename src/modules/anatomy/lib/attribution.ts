/** Kept apart from bodyModel.ts so reading it does not pull three.js into the 2D path. */
export const ATTRIBUTION_URL = `${import.meta.env.BASE_URL}models/anatomy/ATTRIBUTION.json`;

export interface ModelAttribution {
  text: string;
  license?: string;
  url?: string;
}

/** Read the shipped model's attribution; null when the file is missing. */
export async function loadAttribution(signal?: AbortSignal): Promise<ModelAttribution | null> {
  try {
    const res = await fetch(ATTRIBUTION_URL, { signal, credentials: "same-origin" });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("json")) return null;
    const body: unknown = await res.json();
    if (typeof body !== "object" || body === null) return null;
    const b = body as Record<string, unknown>;
    if (typeof b.text !== "string") return null;
    return {
      text: b.text,
      license: typeof b.license === "string" ? b.license : undefined,
      url: typeof b.url === "string" ? b.url : undefined,
    };
  } catch {
    return null;
  }
}

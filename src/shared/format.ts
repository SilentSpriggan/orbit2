const pad = (n: number) => String(n).padStart(2, "0");

/** `14:05Z` */
export function formatUtcTime(iso: string | Date, withSeconds = false): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  const base = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  return `${withSeconds ? `${base}:${pad(d.getUTCSeconds())}` : base}Z`;
}

/** `2026-11-14` */
export function formatUtcDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** `2026-11-14 14:05Z` */
export function formatUtcDateTime(iso: string | Date): string {
  return `${formatUtcDate(iso)} ${formatUtcTime(iso)}`;
}

/** `12,480` */
export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

/** U+2009 thin space between a value and its unit: `72 bpm`. */
export const THIN_SPACE = String.fromCharCode(0x2009);

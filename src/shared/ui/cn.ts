/** Join class names, skipping falsy values. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Typography roles (section D). Use these instead of re-typing class lists. */
export const TYPE = {
  pageTitle: "font-sans text-xl font-semibold tracking-[-0.01em] text-ink",
  sectionTitle: "font-sans text-md font-semibold text-ink",
  body: "font-sans text-base text-ink",
  secondary: "font-sans text-sm text-ink-2",
  label: "font-sans text-xs font-medium text-ink-2",
  overline: "font-mono text-2xs font-medium uppercase tracking-[0.08em] text-ink-3",
  valueLg: "font-mono text-2xl font-medium tabular-nums text-ink",
  valueInline: "font-mono text-base font-medium tabular-nums text-ink",
  unit: "font-mono text-xs text-ink-3",
  meta: "font-mono text-xs text-ink-3",
  citation: "font-mono text-2xs font-semibold text-accent",
} as const;

/** Lucide icon stroke width used everywhere. */
export const ICON_STROKE = 1.75;

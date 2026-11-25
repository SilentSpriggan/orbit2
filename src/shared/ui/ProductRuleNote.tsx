import { Info } from "lucide-react";
import { cn, ICON_STROKE } from "./cn";

/** Must appear next to any alert, band or flag the app computes. */
export function ProductRuleNote({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-ink-3", className)}>
      <Info size={12} strokeWidth={ICON_STROKE} aria-hidden="true" />
      Product rule — not a clinical threshold
    </span>
  );
}

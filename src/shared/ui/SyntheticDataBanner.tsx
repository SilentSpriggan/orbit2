import { FlaskConical } from "lucide-react";
import { cn, ICON_STROKE } from "./cn";

/** Shown at the top of every page while in mock mode. */
export function SyntheticDataBanner({ className }: { className?: string }) {
  return (
    <div
      role="note"
      className={cn("flex items-center gap-2 px-6 h-9 bg-standby-tint border-b border-standby-line text-xs text-ink-2", className)}
    >
      <FlaskConical size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
      Synthetic demo data · not real crew records
    </div>
  );
}

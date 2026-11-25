import { cn } from "../../../shared/ui/cn";
import { layerVar } from "../lib/cssColor";
import { SYSTEM_LABEL, type BodySystem } from "../types";

/** Neutral badge naming a body system, with its layer swatch. Not a status. */
export function SystemBadge({ system, size = "md", className }: { system: BodySystem; size?: "sm" | "md"; className?: string }) {
  const sm = size === "sm";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border border-line font-medium text-ink-2 whitespace-nowrap",
        sm ? "h-5 px-1.5 gap-1 text-2xs" : "h-6 px-2 gap-1.5 text-xs",
        className,
      )}
    >
      <span aria-hidden="true" className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: layerVar(system) }} />
      {SYSTEM_LABEL[system]}
    </span>
  );
}

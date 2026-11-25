import { CircleCheck, CircleDashed, CircleDot, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { StatusLevel } from "../types";
import { cn, ICON_STROKE } from "./cn";

/** Text / tint / border classes per status level (section F). */
export const STATUS_CLASSES: Record<StatusLevel, string> = {
  nominal: "text-nominal bg-nominal-tint border-nominal-line",
  caution: "text-caution bg-caution-tint border-caution-line",
  critical: "text-critical bg-critical-tint border-critical-line",
  standby: "text-standby bg-standby-tint border-standby-line",
  nodata: "text-ink-3 bg-transparent border-line border-dashed",
};

export const STATUS_TEXT: Record<StatusLevel, string> = {
  nominal: "text-nominal",
  caution: "text-caution",
  critical: "text-critical",
  standby: "text-standby",
  nodata: "text-ink-3",
};

export const STATUS_ICON: Record<StatusLevel, LucideIcon> = {
  nominal: CircleCheck,
  caution: TriangleAlert,
  critical: OctagonAlert,
  standby: CircleDot,
  nodata: CircleDashed,
};

export interface StatusBadgeProps {
  level: StatusLevel;
  children: ReactNode;
  size?: "sm" | "md";
  /** Override the level's default icon (the level still sets the color). */
  icon?: LucideIcon;
  /** Plays the single 1.2s pulse — only for a newly raised critical badge. */
  pulse?: boolean;
  className?: string;
}

export function StatusBadge({ level, children, size = "md", icon, pulse = false, className }: StatusBadgeProps) {
  const Icon = icon ?? STATUS_ICON[level];
  const sm = size === "sm";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border font-medium whitespace-nowrap",
        sm ? "h-5 px-1.5 gap-1 text-2xs" : "h-6 px-2 gap-1.5 text-xs",
        STATUS_CLASSES[level],
        pulse && level === "critical" && "animate-critical-pulse",
        className,
      )}
    >
      <Icon size={sm ? 12 : 14} strokeWidth={ICON_STROKE} aria-hidden="true" className="shrink-0" />
      {children}
    </span>
  );
}

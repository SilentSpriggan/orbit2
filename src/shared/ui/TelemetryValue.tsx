import type { StatusLevel } from "../types";
import { THIN_SPACE } from "../format";
import { cn, TYPE } from "./cn";
import { StatusBadge } from "./StatusBadge";

const LEVEL_TEXT: Record<StatusLevel, string> = {
  nominal: "Nominal",
  caution: "Review",
  critical: "Urgent",
  standby: "Standby",
  nodata: "No data",
};

export interface TelemetryValueProps {
  label: string;
  value: number | string | null;
  unit?: string;
  timestamp?: string;
  source?: string;
  level?: StatusLevel;
  size?: "lg" | "md";
  className?: string;
}

/** Shared readout used by every module. */
export function TelemetryValue({ label, value, unit, timestamp, source, level, size = "lg", className }: TelemetryValueProps) {
  const isNull = value === null;
  const shownLevel: StatusLevel | undefined = isNull ? "nodata" : level;
  const meta = [timestamp, source].filter(Boolean).join(" · ");
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="flex items-center gap-2">
        <span className={TYPE.overline}>{label}</span>
        {shownLevel && shownLevel !== "nominal" && (
          <StatusBadge level={shownLevel} size="sm">
            {LEVEL_TEXT[shownLevel]}
          </StatusBadge>
        )}
      </span>
      <span>
        <span className={cn(size === "lg" ? TYPE.valueLg : TYPE.valueInline, isNull && "text-ink-3")}>
          {isNull ? "—" : value}
        </span>
        {unit && !isNull && <span className={TYPE.unit}>{`${THIN_SPACE}${unit}`}</span>}
      </span>
      {meta && <span className={TYPE.meta}>{meta}</span>}
    </div>
  );
}

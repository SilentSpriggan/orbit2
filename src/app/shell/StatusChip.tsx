import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { StatusLevel } from "../../shared/types";
import { cn, ICON_STROKE } from "../../shared/ui/cn";
import { Popover } from "../../shared/ui/Popover";
import { STATUS_CLASSES } from "../../shared/ui/StatusBadge";
import { Tooltip } from "../../shared/ui/Tooltip";
import { useMediaQuery, WIDE } from "../../shared/hooks/useMediaQuery";

export interface StatusChipProps {
  level: StatusLevel;
  icon: LucideIcon;
  /** Plain-text name used for aria-label / tooltip when collapsed. */
  text: string;
  /** Rich content shown in the chip (defaults to `text`). */
  children?: ReactNode;
  /** Popover heading. */
  title: string;
  details: Array<[string, ReactNode]>;
}

/** A status bar chip that opens a details popover. Icon-only below 1280px. */
export function StatusChip({ level, icon: Icon, text, children, title, details }: StatusChipProps) {
  const wide = useMediaQuery(WIDE);
  return (
    <Popover
      label={title}
      align="end"
      className="w-[320px]"
      autoFocus={false}
      trigger={(p) => {
        const btn = (
          <button
            ref={p.ref}
            type="button"
            onClick={p.onClick}
            aria-expanded={p["aria-expanded"]}
            aria-controls={p["aria-controls"]}
            aria-haspopup={p["aria-haspopup"]}
            aria-label={wide ? undefined : `${title}: ${text}`}
            className={cn(
              "h-8 px-2.5 rounded-md border flex items-center gap-1.5 text-xs font-medium whitespace-nowrap",
              STATUS_CLASSES[level],
            )}
          >
            <Icon size={14} strokeWidth={ICON_STROKE} aria-hidden="true" className="shrink-0" />
            {wide && (children ?? text)}
          </button>
        );
        return wide ? btn : <Tooltip content={text}>{btn}</Tooltip>;
      }}
    >
      {() => (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-ink">{title}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
            {details.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-xs text-ink-3">{k}</dt>
                <dd className="font-mono text-xs text-ink break-all">{v}</dd>
              </div>
            ))}
          </dl>
          <Link
            to="/evidence/offline"
            className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-md text-sm font-medium text-accent hover:text-accent-hover"
          >
            Open offline diagnostics
            <ArrowRight size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </Link>
        </div>
      )}
    </Popover>
  );
}

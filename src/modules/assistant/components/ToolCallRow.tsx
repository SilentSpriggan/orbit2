import { Ban, ChevronRight, CircleCheck, Hand, Loader2, OctagonAlert, type LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { StatusLevel } from "../../../shared/types";
import { cn, ICON_STROKE } from "../../../shared/ui/cn";
import { StatusBadge, STATUS_TEXT } from "../../../shared/ui/StatusBadge";
import type { ToolCallEvent, ToolPermission } from "../types";

const STATUS: Record<ToolCallEvent["status"], { icon: LucideIcon; level: StatusLevel; text: string; spin?: boolean }> = {
  requested: { icon: Loader2, level: "caution", text: "requested", spin: true },
  running: { icon: Loader2, level: "caution", text: "running", spin: true },
  awaiting_confirmation: { icon: Hand, level: "caution", text: "awaiting confirmation" },
  succeeded: { icon: CircleCheck, level: "nominal", text: "succeeded" },
  failed: { icon: OctagonAlert, level: "critical", text: "failed" },
  declined: { icon: Ban, level: "standby", text: "declined" },
};

export const PERMISSION_LEVEL: Record<ToolPermission, StatusLevel> = { read: "standby", write: "caution", share: "critical" };

function useElapsed(call: ToolCallEvent): number {
  const done = Boolean(call.finishedAt);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (done) return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [done]);
  const end = call.finishedAt ? Date.parse(call.finishedAt) : now;
  return Math.max(0, end - Date.parse(call.startedAt));
}

export interface ToolCallRowProps {
  call: ToolCallEvent;
  /** Rendered under the row while the call awaits a person. */
  children?: ReactNode;
}

/** Inline tool call row in the transcript (section 4.1). */
export function ToolCallRow({ call, children }: ToolCallRowProps) {
  const s = STATUS[call.status];
  const Icon = s.icon;
  const ms = useElapsed(call);
  const args = JSON.stringify(call.args, null, 2);

  return (
    <li className="flex flex-col gap-2">
      <div className="flex items-start gap-3 px-3 py-2 rounded-md border border-line bg-sunken font-mono text-xs">
        <Icon
          size={16}
          strokeWidth={ICON_STROKE}
          aria-hidden="true"
          className={cn("mt-0.5 shrink-0", STATUS_TEXT[s.level], s.spin && "animate-spin")}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-ink">{call.name}</span>
            <span className={STATUS_TEXT[s.level]}>{s.text}</span>
            <span className="text-ink-3 tabular-nums">{ms} ms</span>
            <StatusBadge level={PERMISSION_LEVEL[call.permission]} size="sm">
              {call.permission}
            </StatusBadge>
          </div>
          {(call.resultSummary || call.error) && (
            <p className={cn("font-sans text-sm", call.status === "failed" ? "text-critical" : "text-ink-2")}>
              {call.status === "failed" ? call.error : (call.resultSummary ?? call.error)}
            </p>
          )}
          <details className="group">
            <summary className="inline-flex min-h-6 cursor-pointer list-none items-center gap-1 rounded-sm text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">
              <ChevronRight size={12} strokeWidth={ICON_STROKE} aria-hidden="true" className="transition-transform group-open:rotate-90" />
              Arguments
            </summary>
            <pre className="mt-1 whitespace-pre-wrap break-words text-ink-2">{args}</pre>
          </details>
        </div>
      </div>
      {children}
    </li>
  );
}

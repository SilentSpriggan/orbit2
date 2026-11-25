import { BookOpenCheck, HeartPulse, Library, OctagonAlert, StickyNote, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import type { ApiError } from "../../../shared/types";
import { formatUtcDateTime } from "../../../shared/format";
import { Button } from "../../../shared/ui/Button";
import { ICON_STROKE, TYPE } from "../../../shared/ui/cn";
import { EmptyState } from "../../../shared/ui/EmptyState";
import { Skeleton, SkeletonGroup } from "../../../shared/ui/Skeleton";
import type { RegionReference } from "../types";

const KIND: Record<RegionReference["kind"], { icon: LucideIcon; label: string; link: string }> = {
  pin_note: { icon: StickyNote, label: "Pin note", link: "Open pin" },
  health_log: { icon: HeartPulse, label: "Health log", link: "Open in Crew status" },
  evidence: { icon: BookOpenCheck, label: "Evidence", link: "Open in Evidence library" },
};

export interface NotesReferencesTabProps {
  regionName: string | null;
  data: RegionReference[] | null;
  isLoading: boolean;
  error: ApiError | null;
  onRetry: () => void;
}

/** Timeline of pin notes, related health-log entries and Evidence library sources. */
export function NotesReferencesTab({ regionName, data, isLoading, error, onRetry }: NotesReferencesTabProps) {
  if (!regionName) {
    return <EmptyState icon={Library} title="No region selected" description="Select a region to see its notes, health-log entries and sources." />;
  }
  if (isLoading && !data) {
    return (
      <SkeletonGroup label="Loading references" className="flex flex-col gap-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </SkeletonGroup>
    );
  }
  if (error) {
    return (
      <EmptyState
        icon={OctagonAlert}
        title="References could not be loaded"
        description={error.message}
        action={<Button onClick={onRetry}>Try again</Button>}
      />
    );
  }
  if (!data || data.length === 0) {
    return <EmptyState icon={Library} title="Nothing linked yet" description={`No notes, health-log entries or sources are linked to ${regionName}.`} />;
  }
  return (
    <ol className="relative flex flex-col gap-4 border-l border-line pl-4">
      {data.map((ref) => {
        const meta = KIND[ref.kind];
        const Icon = meta.icon;
        return (
          <li key={`${ref.kind}-${ref.id}`} className="relative">
            <span className="absolute -left-[29px] top-0 grid size-6 place-items-center rounded-full border border-line bg-panel">
              <Icon size={14} strokeWidth={ICON_STROKE} aria-hidden="true" className="text-ink-2" />
            </span>
            <p className="flex flex-wrap items-center gap-x-2">
              <span className={TYPE.overline}>{meta.label}</span>
              <span className={TYPE.meta}>{ref.at ? formatUtcDateTime(ref.at) : "—"}</span>
            </p>
            <p className="mt-0.5 text-sm text-ink">{ref.title}</p>
            <Link to={ref.href} className="inline-flex min-h-6 items-center text-xs font-medium text-accent hover:text-accent-hover">
              {meta.link}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

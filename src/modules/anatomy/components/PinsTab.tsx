import { CheckCircle2, MapPin, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import type { CrewMember } from "../../../shared/types";
import { formatUtcDateTime } from "../../../shared/format";
import { Button } from "../../../shared/ui/Button";
import { cn, ICON_STROKE, TYPE } from "../../../shared/ui/cn";
import { EmptyState } from "../../../shared/ui/EmptyState";
import { Switch } from "../../../shared/ui/Field";
import { Skeleton, SkeletonGroup } from "../../../shared/ui/Skeleton";
import { StatusBadge } from "../../../shared/ui/StatusBadge";
import { PIN_STATUS_LABEL, PIN_TYPE_LABEL, SEVERITY_LABEL, type AnatomyPin, type AnatomyRegion } from "../types";
import { PIN_TYPE_ICON } from "./pinMeta";

export interface PinsTabProps {
  pins: AnatomyPin[];
  isLoading: boolean;
  region: AnatomyRegion | null;
  regionName: (id: string) => string;
  subject: CrewMember | null;
  getCrew: (id: string) => CrewMember | undefined;
  activePinId: string | null;
  showResolved: boolean;
  onShowResolvedChange: (v: boolean) => void;
  onEdit: (pin: AnatomyPin) => void;
  onToggleResolved: (pin: AnatomyPin) => void;
  onDelete: (pin: AnatomyPin) => void;
  onOpenRegion: (pin: AnatomyPin) => void;
  onAddPin: () => void;
  readOnly: boolean;
  pendingId: string | null;
}

export function PinsTab({
  pins, isLoading, region, regionName, subject, getCrew, activePinId, showResolved, onShowResolvedChange,
  onEdit, onToggleResolved, onDelete, onOpenRegion, onAddPin, readOnly, pendingId,
}: PinsTabProps) {
  const activeRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activePinId, pins.length]);

  const shown = pins.filter((p) => showResolved || p.status !== "resolved" || p.id === activePinId);
  const hiddenResolved = pins.length - shown.length;
  const scope = region ? region.name : "all regions";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-2">
          Pins on <span className="text-ink">{scope}</span> for <span className="font-mono text-ink">{subject?.callsign ?? "—"}</span>
        </p>
        <Switch checked={showResolved} onChange={onShowResolvedChange} label="Show resolved" showLabel />
      </div>

      {isLoading ? (
        <SkeletonGroup label="Loading pins" className="flex flex-col gap-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </SkeletonGroup>
      ) : shown.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title={hiddenResolved ? "Only resolved pins here" : "No pins"}
          description={
            hiddenResolved
              ? `${hiddenResolved} resolved ${hiddenResolved === 1 ? "pin is" : "pins are"} hidden. Turn on “Show resolved” to see them.`
              : `Nothing is pinned to ${scope} for ${subject?.callsign ?? "this crew member"}. Use “Add pin” to record a symptom, injury or observation.`
          }
          action={!hiddenResolved && !readOnly ? <Button onClick={onAddPin}>Add pin</Button> : undefined}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((pin) => {
            const Icon = PIN_TYPE_ICON[pin.type];
            const active = pin.id === activePinId;
            const author = getCrew(pin.authorId);
            return (
              <li
                key={pin.id}
                ref={active ? activeRef : undefined}
                aria-current={active || undefined}
                className={cn("rounded-lg border p-3", active ? "border-accent bg-accent-tint" : "border-line bg-panel")}
              >
                <div className="flex items-start gap-2">
                  <Icon size={16} strokeWidth={ICON_STROKE} aria-hidden="true" className="mt-0.5 shrink-0 text-ink-2" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">
                      <span className="sr-only">{PIN_TYPE_LABEL[pin.type]}: </span>
                      {pin.title}
                    </p>
                    {!region && (
                      <button type="button" onClick={() => onOpenRegion(pin)} className="min-h-6 text-xs text-accent hover:text-accent-hover">
                        {regionName(pin.regionId)}
                      </button>
                    )}
                  </div>
                  <StatusBadge level={pin.severity} size="sm">{SEVERITY_LABEL[pin.severity]}</StatusBadge>
                </div>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 pl-6">
                  <dt className="text-xs text-ink-3">Type</dt>
                  <dd className="text-xs text-ink-2">{PIN_TYPE_LABEL[pin.type]}</dd>
                  <dt className="text-xs text-ink-3">Status</dt>
                  <dd className="text-xs text-ink">{PIN_STATUS_LABEL[pin.status]}</dd>
                  <dt className="text-xs text-ink-3">Onset</dt>
                  <dd className={TYPE.meta}>{formatUtcDateTime(pin.onsetAt)}</dd>
                  <dt className="text-xs text-ink-3">Updated</dt>
                  <dd className={TYPE.meta}>{formatUtcDateTime(pin.updatedAt)}</dd>
                  <dt className="text-xs text-ink-3">Author</dt>
                  <dd className="font-mono text-xs text-ink-2">{author?.callsign ?? pin.authorId}</dd>
                </dl>
                {pin.note && <p className="mt-2 line-clamp-3 pl-6 text-sm text-ink-2">{pin.note}</p>}
                {pin.linkedVitalKinds.length > 0 && (
                  <p className="mt-1 pl-6 font-mono text-2xs text-ink-3">Linked: {pin.linkedVitalKinds.join(", ")}</p>
                )}
                {!readOnly && (
                  <div className="mt-2 flex flex-wrap gap-1 pl-4">
                    <Button variant="ghost" icon={Pencil} onClick={() => onEdit(pin)}>Edit</Button>
                    <Button
                      variant="ghost"
                      icon={pin.status === "resolved" ? RotateCcw : CheckCircle2}
                      loading={pendingId === pin.id}
                      onClick={() => onToggleResolved(pin)}
                    >
                      {pin.status === "resolved" ? "Reopen" : "Resolve"}
                    </Button>
                    <Button variant="ghost" icon={Trash2} onClick={() => onDelete(pin)}>Delete</Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-ink-3">Severity is the crew's own label. It is not a diagnosis.</p>
    </div>
  );
}

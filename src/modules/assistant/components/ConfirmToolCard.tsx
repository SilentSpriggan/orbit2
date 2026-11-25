import { Eye, Hand } from "lucide-react";
import { formatUtcTime } from "../../../shared/format";
import { Button } from "../../../shared/ui/Button";
import { ICON_STROKE } from "../../../shared/ui/cn";
import type { Confirmation } from "../hooks/useToolRegistry";

export interface ConfirmToolCardProps {
  confirmation: Confirmation;
  onApprove: () => void;
  onDecline: () => void;
  /** Share only: reopen the review dialog. */
  onReview: () => void;
}

/** The human gate for write/share tools. The model cannot press these buttons. */
export function ConfirmToolCard({ confirmation, onApprove, onDecline, onReview }: ConfirmToolCardProps) {
  if (confirmation.kind === "vital") {
    const d = confirmation.draft;
    return (
      <div role="group" aria-label="Confirm reading" className="ml-7 flex flex-col gap-3 rounded-md border border-caution-line bg-caution-tint p-3">
        <p className="flex items-center gap-2 text-sm font-medium text-ink">
          <Hand size={16} strokeWidth={ICON_STROKE} aria-hidden="true" className="text-caution" />
          {confirmation.question}
        </p>
        <p className="font-mono text-xs text-ink-2">
          {confirmation.crew.callsign} · {d.kind} · {d.value} {d.unit} · {formatUtcTime(d.recordedAt)} · source assistant
        </p>
        <p className="text-xs text-ink-2">Nothing is saved until a person presses Save or says &ldquo;Confirm save&rdquo;.</p>
        <div className="flex gap-2">
          <Button variant="primary" onClick={onApprove}>
            Save
          </Button>
          <Button variant="ghost" onClick={onDecline}>
            Discard
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div role="group" aria-label="Review share" className="ml-7 flex flex-col gap-3 rounded-md border border-critical-line bg-critical-tint p-3">
      <p className="flex items-center gap-2 text-sm font-medium text-ink">
        <Hand size={16} strokeWidth={ICON_STROKE} aria-hidden="true" className="text-critical" />
        Share {confirmation.crew.callsign}&rsquo;s record with the assistant?
      </p>
      <p className="text-xs text-ink-2">
        Review exactly what will be shared, then press Share — or say &ldquo;Confirm share&rdquo;. Nothing has been shared yet.
      </p>
      <div className="flex gap-2">
        <Button variant="primary" icon={Eye} onClick={onReview}>
          Review and share
        </Button>
        <Button variant="ghost" onClick={onDecline}>
          Decline
        </Button>
      </div>
    </div>
  );
}

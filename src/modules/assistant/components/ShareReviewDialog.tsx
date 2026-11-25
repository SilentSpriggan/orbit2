import { ChevronRight, Share2 } from "lucide-react";
import { Button } from "../../../shared/ui/Button";
import { ICON_STROKE } from "../../../shared/ui/cn";
import { Dialog } from "../../../shared/ui/Dialog";
import type { ShareConfirmation } from "../hooks/useToolRegistry";

export interface ShareReviewDialogProps {
  request: ShareConfirmation | null;
  open: boolean;
  onClose: () => void;
  onShare: () => void;
  onDecline: () => void;
}

/**
 * Shows exactly what will be shared before a person approves it. Tool calls
 * and model text cannot approve; only this button or the spoken phrase can.
 */
export function ShareReviewDialog({ request, open, onClose, onShare, onDecline }: ShareReviewDialogProps) {
  if (!request) return null;
  const sections = Array.from(new Set(request.rows.map((r) => r.section)));
  return (
    <Dialog
      open={open}
      onClose={onClose}
      role="alertdialog"
      title={`Share ${request.crew.callsign}'s record with the assistant?`}
      description="This is exactly what the local assistant will be able to read in this session. It stays on this network and is removed when the session or crew changes. Nothing has been shared yet."
      footer={
        <>
          <Button variant="ghost" onClick={onDecline}>
            Decline
          </Button>
          <Button variant="primary" icon={Share2} onClick={onShare}>
            Share
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {sections.map((sec) => (
          <section key={sec} className="flex flex-col gap-2">
            <h3 className="font-mono text-2xs font-medium uppercase tracking-[0.08em] text-ink-3">{sec}</h3>
            <dl className="divide-y divide-line rounded-md border border-line bg-sunken">
              {request.rows
                .filter((r) => r.section === sec)
                .map((r) => (
                  <div key={`${r.section}-${r.label}`} className="grid grid-cols-[140px_1fr] gap-3 px-3 py-2">
                    <dt className="text-xs text-ink-3">{r.label}</dt>
                    <dd className="font-mono text-xs text-ink">{r.value}</dd>
                  </div>
                ))}
            </dl>
          </section>
        ))}
        {request.withheld.length > 0 && (
          <section className="flex flex-col gap-1.5">
            <h3 className="font-mono text-2xs font-medium uppercase tracking-[0.08em] text-ink-3">Not included</h3>
            <ul className="list-disc pl-5 text-sm text-ink-2">
              {request.withheld.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </section>
        )}
        <details className="group">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-sm text-sm text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">
            <ChevronRight size={16} strokeWidth={ICON_STROKE} aria-hidden="true" className="transition-transform group-open:rotate-90" />
            Exact payload
          </summary>
          <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md border border-line bg-sunken p-3 font-mono text-xs text-ink-2">
            {JSON.stringify(request.content, null, 2)}
          </pre>
        </details>
        <p className="text-xs text-ink-3">
          You can also say &ldquo;Confirm share&rdquo; out loud. Typed text and the assistant&rsquo;s own words do not count as approval.
        </p>
      </div>
    </Dialog>
  );
}

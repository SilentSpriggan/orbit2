import { MapPinPlus } from "lucide-react";
import { Button } from "../../../shared/ui/Button";
import { ICON_STROKE } from "../../../shared/ui/cn";

/** Shown while pin placement mode is on. Esc also cancels. */
export function PinPlacementBanner({ onCancel }: { onCancel: () => void }) {
  return (
    <div
      role="status"
      className="pointer-events-auto flex items-center gap-3 rounded-lg border border-accent bg-accent-tint py-1 pl-3 pr-1 text-sm text-ink shadow-overlay"
    >
      <MapPinPlus size={16} strokeWidth={ICON_STROKE} aria-hidden="true" className="shrink-0 text-accent" />
      <span>Tap a region to place a pin · Esc to cancel</span>
      <Button variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

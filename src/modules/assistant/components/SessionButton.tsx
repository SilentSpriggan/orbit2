import { AudioLines, Square } from "lucide-react";
import { useId } from "react";
import { Button } from "../../../shared/ui/Button";

export interface SessionButtonProps {
  isActive: boolean;
  connecting: boolean;
  /** Why the session cannot start (e.g. the model is not ready). */
  disabledReason: string | null;
  onStart: () => void;
  onEnd: () => void;
}

/** The page's primary action: "Start session" / "End session" (danger while connected). */
export function SessionButton({ isActive, connecting, disabledReason, onStart, onEnd }: SessionButtonProps) {
  const reasonId = useId();
  if (isActive) {
    return (
      <Button variant="danger" icon={Square} loading={connecting} onClick={onEnd}>
        End session
      </Button>
    );
  }
  return (
    <span className="flex items-center gap-3">
      {disabledReason && (
        <span id={reasonId} className="text-xs text-ink-2">
          {disabledReason}
        </span>
      )}
      <Button
        variant="primary"
        icon={AudioLines}
        disabled={disabledReason !== null}
        aria-describedby={disabledReason ? reasonId : undefined}
        onClick={onStart}
      >
        Start session
      </Button>
    </span>
  );
}

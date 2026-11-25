import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "right" | "left";
  /** When true the tooltip never shows (e.g. the label is already visible). */
  disabled?: boolean;
  className?: string;
}

const DELAY_MS = 400;
const GAP = 6;

/**
 * Hover (after 400ms) or keyboard focus shows the tooltip; Esc hides it
 * (WCAG 1.4.13). The trigger keeps its own accessible name.
 */
export function Tooltip({ content, children, side = "bottom", disabled = false, className }: TooltipProps) {
  const id = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const clear = () => window.clearTimeout(timer.current);
  const show = useCallback((delay: number) => {
    clear();
    timer.current = window.setTimeout(() => setOpen(true), delay);
  }, []);
  const hide = useCallback(() => {
    clear();
    setOpen(false);
    setPos(null);
  }, []);

  useEffect(() => () => clear(), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", hide, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", hide, true);
    };
  }, [open, hide]);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current || !tipRef.current) return;
    const a = anchorRef.current.getBoundingClientRect();
    const t = tipRef.current.getBoundingClientRect();
    let top = 0;
    let left = 0;
    if (side === "bottom") { top = a.bottom + GAP; left = a.left + a.width / 2 - t.width / 2; }
    if (side === "top") { top = a.top - t.height - GAP; left = a.left + a.width / 2 - t.width / 2; }
    if (side === "right") { top = a.top + a.height / 2 - t.height / 2; left = a.right + GAP; }
    if (side === "left") { top = a.top + a.height / 2 - t.height / 2; left = a.left - t.width - GAP; }
    left = Math.max(8, Math.min(left, window.innerWidth - t.width - 8));
    top = Math.max(8, Math.min(top, window.innerHeight - t.height - 8));
    setPos({ top, left });
  }, [open, side]);

  if (disabled) return <>{children}</>;

  return (
    <span
      ref={anchorRef}
      className={cn("inline-flex", className)}
      onPointerEnter={(e) => { if (e.pointerType === "mouse") show(DELAY_MS); }}
      onPointerLeave={hide}
      onFocus={(e) => { if ((e.target as HTMLElement).matches(":focus-visible")) show(0); }}
      onBlur={hide}
      onPointerDown={hide}
      aria-describedby={open ? id : undefined}
    >
      {children}
      {open &&
        createPortal(
          <div
            ref={tipRef}
            id={id}
            role="tooltip"
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
            className="pointer-events-none fixed z-[60] max-w-[280px] bg-overlay border border-line-strong rounded-md px-2 py-1 text-xs text-ink shadow-overlay"
          >
            {content}
          </div>,
          document.body,
        )}
    </span>
  );
}

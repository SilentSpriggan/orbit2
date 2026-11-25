import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";
import { getFocusable, isTopLayer, popLayer, pushLayer } from "./focus";

export interface PopoverTriggerProps {
  ref: RefObject<HTMLButtonElement>;
  onClick: () => void;
  "aria-expanded": boolean;
  "aria-controls": string | undefined;
  "aria-haspopup": "dialog" | "listbox" | "menu";
}

export interface PopoverProps {
  trigger: (props: PopoverTriggerProps) => ReactNode;
  children: (close: () => void) => ReactNode;
  /** Accessible name of the popover surface. */
  label: string;
  role?: "dialog" | "listbox" | "menu";
  align?: "start" | "end";
  side?: "bottom" | "top";
  /** `menu` = p-2, `popover` = p-4 (section G). */
  padding?: "menu" | "popover";
  className?: string;
  /** Focus the first focusable element on open (default true). */
  autoFocus?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const GAP = 6;

export function Popover({
  trigger,
  children,
  label,
  role = "dialog",
  align = "start",
  side = "bottom",
  padding = "popover",
  className,
  autoFocus = true,
  open: controlledOpen,
  onOpenChange,
}: PopoverProps) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const setOpen = useCallback(
    (v: boolean) => {
      if (controlledOpen === undefined) setUncontrolledOpen(v);
      onOpenChange?.(v);
    },
    [controlledOpen, onOpenChange],
  );

  const close = useCallback(
    (returnFocus = true) => {
      setOpen(false);
      setPos(null);
      if (returnFocus) triggerRef.current?.focus();
    },
    [setOpen],
  );

  const place = useCallback(() => {
    const a = triggerRef.current?.getBoundingClientRect();
    const p = panelRef.current?.getBoundingClientRect();
    if (!a || !p) return;
    let left = align === "start" ? a.left : a.right - p.width;
    left = Math.max(8, Math.min(left, window.innerWidth - p.width - 8));
    let top = side === "bottom" ? a.bottom + GAP : a.top - p.height - GAP;
    if (side === "bottom" && top + p.height > window.innerHeight - 8) top = Math.max(8, a.top - p.height - GAP);
    setPos({ top, left });
  }, [align, side]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const layer = pushLayer();
    if (autoFocus && panelRef.current) {
      const first = getFocusable(panelRef.current)[0];
      (first ?? panelRef.current).focus();
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isTopLayer(layer)) {
        e.stopPropagation();
        close(true);
      }
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      close(false);
    };
    const onResize = () => place();
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("resize", onResize);
    return () => {
      popLayer(layer);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("resize", onResize);
    };
  }, [open, autoFocus, close, place]);

  return (
    <>
      {trigger({
        ref: triggerRef,
        onClick: () => (open ? close(false) : setOpen(true)),
        "aria-expanded": open,
        "aria-controls": open ? id : undefined,
        "aria-haspopup": role,
      })}
      {open &&
        createPortal(
          <div
            ref={panelRef}
            id={id}
            role={role === "dialog" ? "dialog" : undefined}
            aria-label={role === "dialog" ? label : undefined}
            tabIndex={-1}
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
            className={cn(
              "fixed z-50 bg-overlay border border-line-strong rounded-xl shadow-overlay focus-visible:outline-none",
              padding === "menu" ? "p-2" : "p-4",
              className,
            )}
          >
            {children(() => close(true))}
          </div>,
          document.body,
        )}
    </>
  );
}

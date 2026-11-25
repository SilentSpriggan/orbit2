import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "./Button";
import { cn, TYPE } from "./cn";
import { getFocusable, isTopLayer, popLayer, pushLayer, trapTab } from "./focus";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** `center` = modal dialog; `right` / `left` = side sheet (drawer) with dialog semantics. */
  placement?: "center" | "right" | "left";
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Close when the backdrop is clicked (default true). */
  dismissible?: boolean;
  /** "alertdialog" for destructive confirms. */
  role?: "dialog" | "alertdialog";
  className?: string;
  bodyClassName?: string;
}

/** Focus trap, Esc closes, focus returns to the element that opened it. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  placement = "center",
  initialFocusRef,
  dismissible = true,
  role = "dialog",
  className,
  bodyClassName,
}: DialogProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const layer = pushLayer();
    const panel = panelRef.current;
    const target = initialFocusRef?.current ?? (panel ? getFocusable(panel)[0] : null) ?? panel;
    target?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (!isTopLayer(layer) || !panel) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
      } else {
        trapTab(e, panel);
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      popLayer(layer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (returnTo && document.contains(returnTo)) returnTo.focus();
    };
  }, [open, initialFocusRef]);

  if (!open) return null;

  const sheet = placement !== "center";
  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex",
        placement === "right" && "justify-end",
        placement === "left" && "justify-start",
        !sheet && "items-center justify-center p-4",
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-sunken/80"
        onClick={() => dismissible && onCloseRef.current()}
      />
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          "relative flex flex-col bg-overlay border border-line-strong shadow-overlay focus-visible:outline-none",
          placement === "right" && "h-full w-full max-w-[480px] rounded-l-xl border-r-0",
          placement === "left" && "h-full w-full max-w-[280px] rounded-r-xl border-l-0",
          !sheet && "w-full max-w-[560px] max-h-[calc(100dvh-32px)] rounded-xl",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-3 px-5 h-14 border-b border-line shrink-0">
          <h2 id={titleId} className={cn(TYPE.sectionTitle, "truncate")}>
            {title}
          </h2>
          <IconButton icon={X} label="Close" onClick={() => onCloseRef.current()} tooltipSide="left" />
        </div>
        <div className={cn("p-5 overflow-y-auto flex-1 min-h-0", bodyClassName)}>
          {description && (
            <p id={descId} className="text-sm text-ink-2 mb-4 max-w-[72ch]">
              {description}
            </p>
          )}
          {children}
        </div>
        {footer && <div className="px-5 py-3 border-t border-line flex justify-end gap-2 shrink-0">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

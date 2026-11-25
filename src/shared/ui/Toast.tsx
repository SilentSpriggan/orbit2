import { X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { StatusLevel } from "../types";
import { Button } from "./Button";
import { cn, ICON_STROKE } from "./cn";
import { STATUS_ICON, STATUS_TEXT } from "./StatusBadge";

export interface ToastInput {
  level?: StatusLevel;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

interface ToastItem extends ToastInput {
  id: number;
  level: StatusLevel;
}

interface ToastContextValue {
  toast: (t: ToastInput) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const AUTO_DISMISS_MS = 6000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);
  const toast = useCallback((t: ToastInput) => {
    const id = nextId.current++;
    setItems((list) => [...list.slice(-3), { ...t, id, level: t.level ?? "standby" }]);
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);
  const polite = items.filter((t) => t.level !== "critical");
  const assertive = items.filter((t) => t.level === "critical");

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex flex-col items-end gap-2">
        <div aria-live="polite" aria-relevant="additions" className="flex flex-col gap-2">
          {polite.map((t) => (
            <ToastView key={t.id} item={t} onDismiss={dismiss} />
          ))}
        </div>
        <div aria-live="assertive" aria-relevant="additions" className="flex flex-col gap-2">
          {assertive.map((t) => (
            <ToastView key={t.id} item={t} onDismiss={dismiss} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const Icon = STATUS_ICON[item.level];
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (item.level === "critical" || paused) return;
    const t = window.setTimeout(() => onDismiss(item.id), AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [item.id, item.level, paused, onDismiss]);

  return (
    <div
      role={item.level === "critical" ? "alert" : "status"}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto bg-overlay border border-line-strong rounded-lg shadow-overlay p-4 w-[360px] max-w-[calc(100vw-32px)] flex items-start gap-3"
    >
      <Icon size={16} strokeWidth={ICON_STROKE} aria-hidden="true" className={cn("mt-0.5 shrink-0", STATUS_TEXT[item.level])} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink">{item.title}</p>
        {item.description && <p className="mt-0.5 text-sm text-ink-2">{item.description}</p>}
        {item.action && (
          <Button
            size="sm"
            variant="secondary"
            className="mt-3"
            onClick={() => {
              item.action?.onClick();
              onDismiss(item.id);
            }}
          >
            {item.action.label}
          </Button>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(item.id)}
        className="-m-2 grid size-11 shrink-0 place-items-center rounded-md text-ink-2 hover:bg-raised hover:text-ink"
      >
        <X size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

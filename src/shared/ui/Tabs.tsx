import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "./cn";

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
}

export interface TabsProps<T extends string> {
  label: string;
  items: TabItem<T>[];
  value: T;
  onChange: (v: T) => void;
  /** Render the active panel. */
  children?: (active: T, panelProps: { id: string; role: "tabpanel"; "aria-labelledby": string; tabIndex: 0 }) => ReactNode;
  className?: string;
}

/** Full ARIA tablist with arrow-key, Home and End navigation (automatic activation). */
export function Tabs<T extends string>({ label, items, value, onChange, children, className }: TabsProps<T>) {
  const base = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const tabId = (v: T) => `${base}-tab-${v}`;
  const panelId = (v: T) => `${base}-panel-${v}`;

  const focusIndex = (i: number) => {
    const next = items[(i + items.length) % items.length];
    onChange(next.value);
    listRef.current?.querySelector<HTMLButtonElement>(`#${CSS.escape(tabId(next.value))}`)?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key === "ArrowRight") { e.preventDefault(); focusIndex(i + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); focusIndex(i - 1); }
    else if (e.key === "Home") { e.preventDefault(); focusIndex(0); }
    else if (e.key === "End") { e.preventDefault(); focusIndex(items.length - 1); }
  };

  return (
    <div className={className}>
      <div ref={listRef} role="tablist" aria-label={label} className="flex gap-1 border-b border-line">
        {items.map((t, i) => {
          const active = t.value === value;
          return (
            <button
              key={t.value}
              id={tabId(t.value)}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={panelId(t.value)}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(t.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "relative h-11 px-3 text-sm font-medium rounded-t-md",
                active ? "text-ink" : "text-ink-2 hover:text-ink",
              )}
            >
              {t.label}
              {active && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-accent" />}
            </button>
          );
        })}
      </div>
      {children?.(value, { id: panelId(value), role: "tabpanel", "aria-labelledby": tabId(value), tabIndex: 0 })}
    </div>
  );
}

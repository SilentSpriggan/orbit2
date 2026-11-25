import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "./cn";

export function Table({ caption, children, className }: { caption?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("bg-panel border border-line rounded-lg overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          {caption && <caption className="sr-only">{caption}</caption>}
          {children}
        </table>
      </div>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="bg-raised text-xs font-medium text-ink-2 h-10 border-b border-line-strong">{children}</tr>
    </thead>
  );
}

export function TH({ numeric = false, className, ...rest }: ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return <th scope="col" className={cn("px-4 font-medium", numeric && "text-right", className)} {...rest} />;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TR({ selected = false, className, ...rest }: HTMLAttributes<HTMLTableRowElement> & { selected?: boolean }) {
  return (
    <tr
      aria-selected={selected || undefined}
      className={cn("h-12 border-b border-line last:border-0 hover:bg-raised", selected && "bg-accent-tint", className)}
      {...rest}
    />
  );
}

export function TD({ numeric = false, className, ...rest }: TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <td
      className={cn("px-4 text-base text-ink", numeric && "text-right font-mono font-medium tabular-nums", className)}
      {...rest}
    />
  );
}

import type { ReactNode } from "react";
import { cn, TYPE } from "./cn";

export interface SectionHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** Page header: one page title per page, one secondary line, page actions on the right. */
export function SectionHeader({ title, subtitle, actions, className }: SectionHeaderProps) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-4 pb-5 mb-5 border-b border-line", className)}>
      <div className="min-w-0">
        <h1 className={TYPE.pageTitle}>{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

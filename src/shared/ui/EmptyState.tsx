import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn, ICON_STROKE } from "./cn";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center gap-2 py-10 px-4", className)}>
      <Icon size={24} strokeWidth={ICON_STROKE} className="text-ink-3" aria-hidden="true" />
      <p className="text-md font-semibold text-ink">{title}</p>
      <div className="text-sm text-ink-2 max-w-[56ch]">{description}</div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

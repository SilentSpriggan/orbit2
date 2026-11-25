import type { HTMLAttributes, ReactNode } from "react";
import { cn, TYPE } from "./cn";

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLElement> & { children?: ReactNode }) {
  return (
    <section className={cn("bg-panel border border-line rounded-lg", className)} {...rest}>
      {children}
    </section>
  );
}

export interface CardHeaderProps {
  title: ReactNode;
  /** id for aria-labelledby on the parent Card. */
  titleId?: string;
  actions?: ReactNode;
  className?: string;
  as?: "h2" | "h3";
}

export function CardHeader({ title, titleId, actions, className, as: H = "h2" }: CardHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3 px-5 h-12 border-b border-line", className)}>
      <H id={titleId} className={cn(TYPE.sectionTitle, "truncate")}>
        {title}
      </H>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children?: ReactNode }) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

export function CardFooter({ className, children }: { className?: string; children?: ReactNode }) {
  return <div className={cn("px-5 py-3 border-t border-line flex justify-end gap-2", className)}>{children}</div>;
}

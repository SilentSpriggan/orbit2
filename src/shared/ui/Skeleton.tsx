import type { ReactNode } from "react";
import { cn } from "./cn";

/** Placeholder block matching the final layout. Never use spinners for whole sections. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("bg-raised rounded-md animate-pulse", className)} />;
}

/** A labelled loading region made of skeleton blocks. */
export function SkeletonGroup({ label = "Loading", className, children }: { label?: string; className?: string; children: ReactNode }) {
  return (
    <div role="status" aria-label={label} aria-busy="true" className={className}>
      {children}
    </div>
  );
}

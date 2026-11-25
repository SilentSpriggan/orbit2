import { useSyncExternalStore } from "react";

/**
 * A version number that changes whenever a pin is created, edited or deleted,
 * so every usePins() on screen refetches after a mutation.
 */
let version = 0;
const listeners = new Set<() => void>();

export function bumpPinsVersion(): void {
  version += 1;
  for (const l of listeners) l();
}

export function usePinsVersion(): number {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => version,
    () => version,
  );
}

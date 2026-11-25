import type { SessionEvents } from "./VoiceSession";

type Listener = (...args: never[]) => void;

/** Minimal typed event emitter for SessionEvents. */
export class SessionEmitter {
  private listeners = new Map<keyof SessionEvents, Set<Listener>>();

  on<E extends keyof SessionEvents>(event: E, cb: SessionEvents[E]): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(cb as Listener);
    return () => {
      set?.delete(cb as Listener);
    };
  }

  emit<E extends keyof SessionEvents>(event: E, ...args: Parameters<SessionEvents[E]>): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const cb of Array.from(set)) {
      try {
        (cb as (...a: Parameters<SessionEvents[E]>) => void)(...args);
      } catch (e) {
        console.error(`[assistant] listener for "${String(event)}" failed`, e);
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

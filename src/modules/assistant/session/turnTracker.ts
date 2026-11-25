import type { ConnectionState, TurnState } from "../types";

export interface TurnInputs {
  connection: ConnectionState;
  micEnabled: boolean;
  userSpeaking: boolean;
  botSpeaking: boolean;
  /** Name of a tool that is currently running, if any. */
  activeTool: string | null;
  /** The user finished a turn and the reply has not started yet. */
  awaitingReply: boolean;
  error: boolean;
}

export const INITIAL_TURN_INPUTS: TurnInputs = {
  connection: "idle",
  micEnabled: true,
  userSpeaking: false,
  botSpeaking: false,
  activeTool: null,
  awaitingReply: false,
  error: false,
};

/** Priority order: error > not connected > speech > tools > thinking > muted > listening. */
export function deriveTurnState(i: TurnInputs): TurnState {
  if (i.error || i.connection === "error") return "error";
  if (i.connection === "idle" || i.connection === "disconnected") return "idle";
  if (i.connection === "connecting" || i.connection === "reconnecting") return "connecting";
  if (i.botSpeaking) return "bot_speaking";
  if (i.userSpeaking && i.micEnabled) return "user_speaking";
  if (i.activeTool) return "tool_running";
  if (i.awaitingReply) return "thinking";
  if (!i.micEnabled) return "muted";
  return "listening";
}

/** Holds turn inputs and reports the derived state only when it changes. */
export class TurnTracker {
  private inputs: TurnInputs = { ...INITIAL_TURN_INPUTS };
  private last: TurnState = "idle";
  /** Forced state from the mock dev panel; null = derived. */
  private forced: TurnState | null = null;

  private readonly onChange: (s: TurnState) => void;

  constructor(onChange: (s: TurnState) => void) {
    this.onChange = onChange;
  }

  update(patch: Partial<TurnInputs>): void {
    this.inputs = { ...this.inputs, ...patch };
    this.flush();
  }

  force(s: TurnState | null): void {
    this.forced = s;
    this.flush();
  }

  get state(): TurnState {
    return this.last;
  }

  get snapshot(): Readonly<TurnInputs> {
    return this.inputs;
  }

  reset(): void {
    this.inputs = { ...INITIAL_TURN_INPUTS };
    this.forced = null;
    this.flush();
  }

  private flush(): void {
    const next = this.forced ?? deriveTurnState(this.inputs);
    if (next !== this.last) {
      this.last = next;
      this.onChange(next);
    }
  }
}

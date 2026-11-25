import { useCallback, useEffect, useRef, useState } from "react";
import { isAbortError, toApiError } from "../../../shared/api/client";
import type { ApiError } from "../../../shared/types";
import { createPin, deletePin, updatePin } from "../services/anatomyService";
import type { AnatomyPin, PinInput, PinPatch } from "../types";
import { bumpPinsVersion } from "./pinEvents";

export type PinMutation =
  | { kind: "create"; input: PinInput }
  | { kind: "update"; id: string; patch: PinPatch }
  | { kind: "delete"; id: string };

export interface UsePinMutations {
  mutate: (m: PinMutation) => Promise<AnatomyPin | null>;
  isPending: boolean;
  error: ApiError | null;
  reset: () => void;
}

/** Create, update and delete pins. No retries (section J). */
export function usePinMutations(): UsePinMutations {
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);

  useEffect(() => () => ctrlRef.current?.abort(), []);

  const mutate = useCallback(async (m: PinMutation): Promise<AnatomyPin | null> => {
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    setPending(true);
    setError(null);
    try {
      let result: AnatomyPin | null = null;
      if (m.kind === "create") result = await createPin(m.input, ctrl.signal);
      else if (m.kind === "update") result = await updatePin(m.id, m.patch, ctrl.signal);
      else await deletePin(m.id, ctrl.signal);
      bumpPinsVersion();
      return result;
    } catch (e) {
      if (isAbortError(e)) return null;
      const err = toApiError(e);
      setError(err);
      throw err;
    } finally {
      if (ctrlRef.current === ctrl) setPending(false);
    }
  }, []);

  const reset = useCallback(() => setError(null), []);
  return { mutate, isPending, error, reset };
}

import { useCallback, useEffect, useState } from "react";
import { isAbortError, toApiError } from "../../../shared/api/client";
import type { ApiError } from "../../../shared/types";
import { listPins } from "../services/anatomyService";
import type { AnatomyPin, PinFilter } from "../types";
import { usePinsVersion } from "./pinEvents";

export interface UsePins {
  data: AnatomyPin[] | null;
  error: ApiError | null;
  isLoading: boolean;
  refetch: () => void;
}

export function usePins(filter: PinFilter = {}, enabled = true): UsePins {
  const { crewId, regionId, status } = filter;
  const version = usePinsVersion();
  const [data, setData] = useState<AnatomyPin[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setLoading] = useState(enabled);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    listPins({ crewId, regionId, status }, ctrl.signal)
      .then((list) => { setData(list); setLoading(false); })
      .catch((e: unknown) => {
        if (isAbortError(e)) return;
        setError(toApiError(e));
        setLoading(false);
      });
    return () => ctrl.abort();
  }, [crewId, regionId, status, enabled, version, attempt]);

  const refetch = useCallback(() => setAttempt((n) => n + 1), []);
  return { data, error, isLoading, refetch };
}

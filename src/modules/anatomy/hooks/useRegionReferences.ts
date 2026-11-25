import { useCallback, useEffect, useState } from "react";
import { isAbortError, toApiError } from "../../../shared/api/client";
import type { ApiError } from "../../../shared/types";
import { getRegionReferences } from "../services/anatomyService";
import type { RegionReference } from "../types";
import { usePinsVersion } from "./pinEvents";

export interface UseRegionReferences {
  data: RegionReference[] | null;
  error: ApiError | null;
  isLoading: boolean;
  refetch: () => void;
}

export function useRegionReferences(regionId: string | null, crewId: string | null): UseRegionReferences {
  const version = usePinsVersion();
  const [data, setData] = useState<RegionReference[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!regionId || !crewId) {
      setData(null);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    getRegionReferences(regionId, crewId, ctrl.signal)
      .then((list) => { setData(list); setLoading(false); })
      .catch((e: unknown) => {
        if (isAbortError(e)) return;
        setError(toApiError(e));
        setLoading(false);
      });
    return () => ctrl.abort();
  }, [regionId, crewId, version, attempt]);

  const refetch = useCallback(() => setAttempt((n) => n + 1), []);
  return { data, error, isLoading, refetch };
}

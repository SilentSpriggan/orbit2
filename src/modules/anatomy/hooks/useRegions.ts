import { useCallback, useEffect, useMemo, useState } from "react";
import { toApiError } from "../../../shared/api/client";
import type { ApiError } from "../../../shared/types";
import { buildRegionIndex, type RegionIndex } from "../lib/regionIndex";
import { getRegions } from "../services/anatomyService";
import type { AnatomyRegion } from "../types";

export interface UseRegions {
  data: AnatomyRegion[] | null;
  index: RegionIndex | null;
  error: ApiError | null;
  isLoading: boolean;
  refetch: () => void;
}

/** The region catalogue. Cached for the page lifetime by the service. */
export function useRegions(): UseRegions {
  const [data, setData] = useState<AnatomyRegion[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setError(null);
    getRegions()
      .then((list) => { if (live) setData(list); })
      .catch((e: unknown) => { if (live) setError(toApiError(e)); });
    return () => { live = false; };
  }, [attempt]);

  const index = useMemo(() => (data ? buildRegionIndex(data) : null), [data]);
  const refetch = useCallback(() => setAttempt((n) => n + 1), []);
  return { data, index, error, isLoading: !data && !error, refetch };
}

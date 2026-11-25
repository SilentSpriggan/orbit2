import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useCrew } from "../../../shared/context/CrewContext";
import { isAbortError, toApiError } from "../../../shared/api/client";
import { canSeeWellbeing, type ApiError } from "../../../shared/types";
import * as service from "../services/crewService";
import { WELLBEING_KINDS, type ReviewBand, type VitalReading } from "../types";
let optimistic: VitalReading[] = [];
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
const snapshot = () => optimistic;
function updateOptimistic(next: VitalReading[]) {
  optimistic = next;
  listeners.forEach((fn) => fn());
}
export const invalidate = () =>
  window.dispatchEvent(new Event("orbit:crew-change"));
export function useRead<T>(
  load: (viewer: string, signal: AbortSignal) => Promise<T>,
) {
  const { activeCrew } = useCrew();
  const viewer = activeCrew?.id ?? "";
  const [result, setResult] = useState<{
    data: T | null;
    error: ApiError | null;
    isLoading: boolean;
    viewer: string;
  }>({ data: null, error: null, isLoading: true, viewer });
  const [revision, setRevision] = useState(0);
  const refetch = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    window.addEventListener("orbit:crew-change", refetch);
    return () => window.removeEventListener("orbit:crew-change", refetch);
  }, [refetch]);
  useEffect(() => {
    const ctrl = new AbortController();
    if (!viewer) return;
    load(viewer, ctrl.signal)
      .then((data) => {
        if (!ctrl.signal.aborted)
          setResult({ data, error: null, isLoading: false, viewer });
      })
      .catch((e: unknown) => {
        if (!isAbortError(e))
          setResult({
            data: null,
            error: toApiError(e),
            isLoading: false,
            viewer,
          });
      });
    return () => ctrl.abort();
  }, [load, viewer, revision]);
  return {
    ...(result.viewer === viewer
      ? result
      : { data: null, error: null, isLoading: true }),
    refetch,
  };
}
export function useCrewSummaries() {
  return useRead(
    useCallback((v: string, s: AbortSignal) => service.listSummaries(v, s), []),
  );
}
export function useReadings(id: string, range: service.Range = {}) {
  const key = JSON.stringify(range);
  const query = useRead(
    useCallback(
      async (v: string, s: AbortSignal) => {
        const range = JSON.parse(key) as service.Range;
        const items: VitalReading[] = [];
        const seen = new Set<string>();
        let cursor = range.cursor;
        do {
          const page = await service.listReadings(
            id,
            { ...range, cursor },
            v,
            s,
          );
          items.push(...page.items);
          if (!page.nextCursor || range.limit) break;
          if (seen.has(page.nextCursor))
            throw new Error(
              "The server returned a repeated pagination cursor.",
            );
          seen.add(page.nextCursor);
          cursor = page.nextCursor;
        } while (!s.aborted);
        return { items, nextCursor: null };
      },
      [id, key],
    ),
  );
  const pending = useSyncExternalStore(subscribe, snapshot);
  const { activeCrew } = useCrew();
  const added = pending.filter(
    (r) =>
      r.crewId === id &&
      activeCrew &&
      (canSeeWellbeing(activeCrew, id) || !WELLBEING_KINDS.includes(r.kind)),
  );
  return {
    ...query,
    data: query.data
      ? {
          ...query.data,
          items: [...added, ...query.data.items].sort((a, b) =>
            b.recordedAt.localeCompare(a.recordedAt),
          ),
        }
      : query.data,
  };
}
export function useReviewBands(id: string) {
  return useRead(
    useCallback(
      (v: string, s: AbortSignal) => service.getBands(id, v, s),
      [id],
    ),
  );
}
export function useAlerts() {
  return useRead(
    useCallback((v: string, s: AbortSignal) => service.listAlerts(v, s), []),
  );
}
export function useMutation<A, T>(
  fn: (arg: A, viewer: string, signal: AbortSignal) => Promise<T>,
) {
  const { activeCrew } = useCrew();
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const mutate = async (arg: A) => {
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    setPending(true);
    setError(null);
    try {
      const result = await fn(arg, activeCrew?.id ?? "", ctrl.signal);
      invalidate();
      return result;
    } catch (e) {
      if (!isAbortError(e)) setError(toApiError(e));
      throw e;
    } finally {
      if (!ctrl.signal.aborted) setPending(false);
    }
  };
  return { mutate, isPending, error };
}
export const useCreateReading = () =>
  useMutation(
    async (
      { id, input }: { id: string; input: Omit<VitalReading, "id" | "crewId"> },
      v,
      s,
    ) => {
      const temporary: VitalReading = {
        ...input,
        crewId: id,
        id: `pending-${crypto.randomUUID()}`,
      };
      updateOptimistic([...optimistic, temporary]);
      try {
        return await service.createReading(id, input, v, s);
      } finally {
        updateOptimistic(optimistic.filter((r) => r.id !== temporary.id));
      }
    },
  );
export const useDeleteReading = () =>
  useMutation(({ id, readingId }: { id: string; readingId: string }, v, s) =>
    service.deleteReading(id, readingId, v, s),
  );
export const useUpdateBands = () =>
  useMutation(({ id, bands }: { id: string; bands: ReviewBand[] }, v, s) =>
    service.updateBands(id, bands, v, s),
  );
export const useAcknowledge = () =>
  useMutation((id: string, v, s) => service.acknowledgeAlert(id, v, s));

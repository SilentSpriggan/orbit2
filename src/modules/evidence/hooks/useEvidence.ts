import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { toApiError } from "../../../shared/api/client";
import type { ApiError } from "../../../shared/types";
import type {
  AskEvent,
  DiagnosticCheck,
  IndexJob,
  RetrievalTrace,
  SearchHit,
  SearchParams,
} from "../types";
import * as service from "../services/evidence";

export function usePageState() {
  const { search } = useLocation();
  const value = import.meta.env.DEV
    ? new URLSearchParams(search).get("state")
    : null;
  return value === "loading" || value === "empty" || value === "error"
    ? value
    : null;
}
export function useRead<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState<ApiError | null>(null),
    [isLoading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  const refetch = useCallback(() => setRevision((v) => v + 1), []);
  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    setData(null);
    load(ctrl.signal)
      .then((value) => {
        if (!ctrl.signal.aborted) setData(value);
      })
      .catch((e: unknown) => {
        if (!ctrl.signal.aborted) setError(toApiError(e));
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [load, revision]);
  return { data, error, isLoading, refetch, setData };
}
export function useSearch(params: SearchParams) {
  const key = JSON.stringify(params);
  return useRead(
    useCallback(
      async (signal: AbortSignal) => {
        await service.pause(250, signal);
        return service.search(JSON.parse(key) as SearchParams, signal);
      },
      [key],
    ),
  );
}
export const useDocument = (id: string) =>
  useRead(
    useCallback((signal: AbortSignal) => service.getDocument(id, signal), [id]),
  );
export const useChunks = (id: string) =>
  useRead(
    useCallback((signal: AbortSignal) => service.getChunks(id, signal), [id]),
  );
export const useFacets = () => useRead(service.getFacets);
export const useNetworkInfo = () => useRead(service.getNetworkInfo);
export function useDiagnostics() {
  const read = useRead(service.getDiagnostics);
  const ctrl = useRef<AbortController | null>(null);
  const [running, setRunning] = useState(false),
    [runError, setRunError] = useState<string | null>(null);
  useEffect(() => () => ctrl.current?.abort(), []);
  const run = async (id?: string) => {
    ctrl.current?.abort();
    const controller = new AbortController();
    ctrl.current = controller;
    setRunning(true);
    setRunError(null);
    try {
      await service.runDiagnostics(
        (check: DiagnosticCheck) => {
          if (!controller.signal.aborted)
            read.setData((old) =>
              [...(old ?? []).filter((c) => c.id !== check.id), check].sort(
                (a, b) =>
                  Number(a.id.split("-")[1]) - Number(b.id.split("-")[1]),
              ),
            );
        },
        controller.signal,
        id,
      );
    } catch (e) {
      if (!controller.signal.aborted) setRunError(toApiError(e).message);
    } finally {
      if (!controller.signal.aborted) setRunning(false);
    }
  };
  return { ...read, run, running, runError };
}
export function useIndexJobs() {
  const read = useRead(service.listJobs);
  const [streamError, setStreamError] = useState<string | null>(null),
    [revision, setRevision] = useState(0);
  const { setData } = read;
  useEffect(() => {
    const ctrl = new AbortController();
    setStreamError(null);
    void service
      .streamJobs((job: IndexJob) => {
        if (!ctrl.signal.aborted)
          setData((old) => [
            ...(old ?? []).filter((j) => j.id !== job.id),
            job,
          ]);
      }, ctrl.signal)
      .then(() => {
        if (!ctrl.signal.aborted)
          setStreamError(
            "The live job stream ended. Reconnect for current progress.",
          );
      })
      .catch((e: unknown) => {
        if (!ctrl.signal.aborted) setStreamError(toApiError(e).message);
      });
    return () => ctrl.abort();
  }, [setData, revision]);
  return {
    ...read,
    streamError,
    reconnect: () => {
      read.refetch();
      setRevision((v) => v + 1);
    },
  };
}
export function useAsk() {
  const [answer, setAnswer] = useState(""),
    [sources, setSources] = useState<SearchHit[]>([]),
    [trace, setTrace] = useState<RetrievalTrace | null>(null),
    [citations, setCitations] = useState<Record<number, string>>({}),
    [unsupported, setUnsupported] = useState<[number, number][]>([]),
    [state, setState] = useState<
      "idle" | "streaming" | "done" | "no-answer" | "error" | "cancelled"
    >("idle"),
    [error, setError] = useState("");
  const ctrl = useRef<AbortController | null>(null);
  useEffect(() => () => ctrl.current?.abort(), []);
  const cancel = () => {
    ctrl.current?.abort();
    setState("cancelled");
  };
  const ask = async (
    question: string,
    opts: Parameters<typeof service.ask>[1],
  ) => {
    ctrl.current?.abort();
    const controller = new AbortController();
    ctrl.current = controller;
    setAnswer("");
    setSources([]);
    setTrace(null);
    setCitations({});
    setUnsupported([]);
    setError("");
    setState("streaming");
    const onEvent = (e: AskEvent) => {
      if (controller.signal.aborted) return;
      switch (e.type) {
        case "retrieval":
          setSources(e.sources);
          setTrace(e.trace);
          break;
        case "token":
          setAnswer((v) => v + e.text);
          break;
        case "citation":
          setCitations((v) => ({ ...v, [e.marker]: e.chunkId }));
          break;
        case "unsupported":
          setUnsupported((v) => [...v, [e.start, e.end]]);
          break;
        case "done":
          setState(e.noAnswer ? "no-answer" : "done");
          if (e.noAnswer) {
            setAnswer("");
            setSources([]);
            setCitations({});
          }
          break;
        case "error":
          setError(e.message);
          setState("error");
          break;
      }
    };
    try {
      await service.ask(question, opts, onEvent, controller.signal);
      if (!controller.signal.aborted)
        setState((v) => (v === "streaming" ? "error" : v));
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(toApiError(e).message);
        setState("error");
      }
    }
  };
  return {
    ask,
    answer,
    sources,
    trace,
    citations,
    unsupported,
    state,
    error,
    cancel,
  };
}

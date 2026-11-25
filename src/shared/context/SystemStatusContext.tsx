import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { apiGet, isAbortError, toApiError } from "../api/client";
import { withMock } from "../api/mockMode";
import { getMockSystemStatus } from "../mocks/systemStatus";
import type { ApiError, SystemStatus } from "../types";

export interface SystemStatusValue {
  status: SystemStatus | null;
  error: ApiError | null;
  refresh(): void;
}

const SystemStatusContext = createContext<SystemStatusValue | null>(null);

const POLL_MS = 10_000;

/** Fallback shown when the local server cannot be reached at all. */
function unreachable(prev: SystemStatus | null): SystemStatus {
  const now = new Date().toISOString();
  if (prev) return { ...prev, network: { ...prev.network, mode: "unreachable" }, serverTime: now };
  return {
    network: { mode: "unreachable", host: window.location.hostname || "orbit.local", lanIp: null, ssid: null, certExpiresAt: null },
    ollama: { state: "unavailable", model: "qwen3:8b", loadProgress: null },
    faiss: { state: "missing", documentCount: 0, chunkCount: 0, buildProgress: null, updatedAt: null },
    serverTime: now,
  };
}

export function fetchSystemStatus(signal?: AbortSignal): Promise<SystemStatus> {
  return withMock(() => apiGet<SystemStatus>("/api/system/status", { signal }), getMockSystemStatus, 120, signal);
}

export function SystemStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);

  const refresh = useCallback(() => {
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    fetchSystemStatus(ctrl.signal)
      .then((s) => {
        if (ctrl.signal.aborted) return;
        setStatus(s);
        setError(null);
      })
      .catch((e: unknown) => {
        if (isAbortError(e)) return;
        setError(toApiError(e));
        setStatus((prev) => unreachable(prev));
      });
  }, []);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
      ctrlRef.current?.abort();
    };
  }, [refresh]);

  const value = useMemo(() => ({ status, error, refresh }), [status, error, refresh]);
  return <SystemStatusContext.Provider value={value}>{children}</SystemStatusContext.Provider>;
}

export function useSystemStatus(): SystemStatusValue {
  const ctx = useContext(SystemStatusContext);
  if (!ctx) throw new Error("useSystemStatus must be used inside <SystemStatusProvider>");
  return ctx;
}

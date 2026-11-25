import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiGet, isAbortError } from "../api/client";
import { withMock } from "../api/mockMode";
import { MOCK_CREW } from "../mocks/crew";
import type { CrewMember } from "../types";

export interface CrewContextValue {
  crew: CrewMember[];
  activeCrew: CrewMember | null;
  setActiveCrewId(id: string): void;
  getCrew(id: string): CrewMember | undefined;
}

const CrewContext = createContext<CrewContextValue | null>(null);

export const ACTIVE_CREW_KEY = "orbit.activeCrewId";

function readStoredId(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_CREW_KEY);
  } catch {
    return null;
  }
}

function writeStoredId(id: string): void {
  try {
    window.localStorage.setItem(ACTIVE_CREW_KEY, id);
  } catch {
    /* storage unavailable: selection still applies for this session */
  }
}

export function fetchCrew(signal?: AbortSignal): Promise<CrewMember[]> {
  return withMock(() => apiGet<CrewMember[]>("/api/crew", { signal }), () => MOCK_CREW, 150, signal);
}

export function CrewProvider({ children }: { children: ReactNode }) {
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [activeId, setActiveId] = useState<string | null>(() => readStoredId());

  useEffect(() => {
    const ctrl = new AbortController();
    fetchCrew(ctrl.signal)
      .then((list) => setCrew(list))
      .catch((e: unknown) => {
        if (!isAbortError(e)) setCrew([]);
      });
    return () => ctrl.abort();
  }, []);

  const setActiveCrewId = useCallback((id: string) => {
    setActiveId(id);
    writeStoredId(id);
  }, []);

  const getCrew = useCallback((id: string) => crew.find((c) => c.id === id), [crew]);

  const activeCrew = useMemo(
    () => crew.find((c) => c.id === activeId) ?? crew[0] ?? null,
    [crew, activeId],
  );

  const value = useMemo(
    () => ({ crew, activeCrew, setActiveCrewId, getCrew }),
    [crew, activeCrew, setActiveCrewId, getCrew],
  );
  return <CrewContext.Provider value={value}>{children}</CrewContext.Provider>;
}

export function useCrew(): CrewContextValue {
  const ctx = useContext(CrewContext);
  if (!ctx) throw new Error("useCrew must be used inside <CrewProvider>");
  return ctx;
}

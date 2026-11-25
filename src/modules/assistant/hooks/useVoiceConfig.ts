import { useCallback, useEffect, useRef, useState } from "react";
import { isAbortError, toApiError } from "../../../shared/api/client";
import type { ApiError } from "../../../shared/types";
import { getVoiceConfig, saveVoiceSettings } from "../services/voiceService";
import type { VoiceConfig, VoiceSettings } from "../types";

export function useVoiceConfig() {
  const [data, setData] = useState<VoiceConfig | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    getVoiceConfig(ctrl.signal)
      .then((c) => {
        setData(c);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (isAbortError(e)) return;
        setError(toApiError(e));
        setLoading(false);
      });
    return () => ctrl.abort();
  }, [nonce]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);
  return { data, error, isLoading, refetch };
}

export function useSaveVoiceSettings() {
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);

  useEffect(() => () => ctrlRef.current?.abort(), []);

  const mutate = useCallback(async (s: VoiceSettings): Promise<VoiceSettings | null> => {
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    setPending(true);
    setError(null);
    try {
      const saved = await saveVoiceSettings(s, ctrl.signal);
      return saved;
    } catch (e) {
      if (!isAbortError(e)) setError(toApiError(e));
      return null;
    } finally {
      if (ctrlRef.current === ctrl) setPending(false);
    }
  }, []);

  return { mutate, isPending, error };
}

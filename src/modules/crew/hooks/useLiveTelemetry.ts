import { useEffect, useState } from "react";
import { MOCK_MODE } from "../../../shared/api/mockMode";
import { API_BASE } from "../../../shared/api/client";
import { useCrew } from "../../../shared/context/CrewContext";
import type { LiveTelemetryFrame } from "../types";
export function useLiveTelemetry(crewId: string) {
  const { activeCrew } = useCrew();
  const viewer = activeCrew?.id;
  const [result, setResult] = useState<{
    data: LiveTelemetryFrame | null;
    state: "live" | "paused" | "off";
  }>({ data: null, state: "off" });
  useEffect(() => {
    let stopped = false,
      timer: ReturnType<typeof setTimeout>,
      source: EventSource | undefined,
      attempt = 0,
      tick = 0;
    const connect = () => {
      if (MOCK_MODE) {
        if (crewId !== "c01") {
          setResult({ data: null, state: "off" });
          return;
        }
        setResult({
          data: {
            crewId,
            deviceName: "ORBIT wearable · W01",
            at: new Date().toISOString(),
            heartRate: 72 + Math.round(Math.sin(tick++)),
            spo2: 98,
          },
          state: navigator.onLine ? "live" : "paused",
        });
        timer = setTimeout(connect, 2000);
        return;
      }
      // Native EventSource cannot attach headers; viewer is an explicit query parameter on this endpoint.
      source = new EventSource(
        `${API_BASE}/api/telemetry/stream?crew=${encodeURIComponent(crewId)}&viewer=${encodeURIComponent(viewer ?? "")}`,
      );
      source.onmessage = (e) => {
        try {
          const frame = JSON.parse(e.data) as LiveTelemetryFrame;
          if (frame.crewId === crewId && !stopped) {
            attempt = 0;
            setResult({ data: frame, state: "live" });
          }
        } catch {
          /* Ignore malformed frames. */
        }
      };
      source.onerror = () => {
        source?.close();
        if (!stopped) {
          setResult((r) => ({ ...r, state: "paused" }));
          timer = setTimeout(connect, Math.min(30000, 1000 * 2 ** attempt++));
        }
      };
    };
    connect();
    return () => {
      stopped = true;
      clearTimeout(timer);
      source?.close();
    };
  }, [crewId, viewer]);
  return result;
}

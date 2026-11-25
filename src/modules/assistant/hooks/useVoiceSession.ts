import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MOCK_MODE } from "../../../shared/api/mockMode";
import { useCrew } from "../../../shared/context/CrewContext";
import { useToast } from "../../../shared/ui/Toast";
import { MockVoiceSession, type MockControls } from "../mocks/MockVoiceSession";
import { createPipecatSession } from "../pipecat/adapter";
import type { VoiceSession } from "../session/VoiceSession";
import { CLIENT_TOOL_NAMES } from "../tools/definitions";
import type {
  ConnectionState,
  MicPermission,
  PipelineMetrics,
  PipelineStage,
  SpeechSegment,
  StageHealth,
  TurnState,
  VoiceSettings,
} from "../types";
import { transcript, useTranscript } from "./transcriptStore";
import type { ToolRegistry } from "./useToolRegistry";

const SEGMENT_WINDOW_MS = 15_000;
const HISTORY = 20;

export interface SessionError {
  code: string;
  message: string;
  fatal: boolean;
  at: number;
}

async function queryMicPermission(): Promise<MicPermission> {
  if (!navigator.mediaDevices?.getUserMedia) return "unavailable";
  try {
    const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
    return status.state === "granted" ? "granted" : status.state === "denied" ? "denied" : "unknown";
  } catch {
    return "unknown";
  }
}

export function useVoiceSession(registry: ToolRegistry, settings: VoiceSettings | null) {
  const { activeCrew } = useCrew();
  const { toast } = useToast();
  const sessionRef = useRef<VoiceSession | null>(null);
  const subscriptions = useRef<Array<() => void>>([]);
  const ending = useRef<Promise<void> | null>(null);

  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [turnState, setTurnState] = useState<TurnState>("idle");
  const [micEnabled, setMicEnabledState] = useState(true);
  const [micPermission, setMicPermission] = useState<MicPermission>("unknown");
  const [metricsHistory, setMetricsHistory] = useState<PipelineMetrics[]>([]);
  const [segments, setSegments] = useState<SpeechSegment[]>([]);
  const [endOfTurn, setEndOfTurn] = useState<number | null>(null);
  const [pipelineHealth, setPipelineHealth] = useState<Partial<Record<PipelineStage, StageHealth>>>({});
  const [lastError, setLastError] = useState<SessionError | null>(null);
  const [tracks, setTracks] = useState<{ local: MediaStreamTrack | null; bot: MediaStreamTrack | null }>({ local: null, bot: null });
  const [mock, setMock] = useState<MockControls | null>(null);
  const [, refreshMock] = useState(0);
  const [hasSession, setHasSession] = useState(false);

  const state = useTranscript();

  // Latest values for event handlers.
  const live = useRef({ registry, settings });
  live.current = { registry, settings };

  useEffect(() => {
    void queryMicPermission().then((p) => setMicPermission((cur) => (cur === "unknown" ? p : cur)));
  }, []);

  const openSegment = (who: SpeechSegment["who"], on: boolean) => {
    const now = performance.now();
    setSegments((list) => {
      const pruned = list.filter((s) => s.end === null || now - s.end < SEGMENT_WINDOW_MS);
      const open = pruned.findIndex((s) => s.who === who && s.end === null);
      if (on) return open >= 0 ? pruned : [...pruned, { who, start: now, end: null }];
      if (open < 0) return pruned;
      const next = [...pruned];
      next[open] = { ...next[open], end: now };
      return next;
    });
  };

  const detach = () => {
    subscriptions.current.forEach((u) => u());
    subscriptions.current = [];
  };

  const build = useCallback((): VoiceSession => {
    const opts = {
      handleTool: live.current.registry.handleTool,
      clientTools: CLIENT_TOOL_NAMES,
      settings: live.current.settings,
    };
    const session: VoiceSession = MOCK_MODE ? new MockVoiceSession(opts) : createPipecatSession(opts);
    const refreshTracks = () => setTracks({ local: session.getLocalAudioTrack(), bot: session.getBotAudioTrack() });
    subscriptions.current = [
      session.on("connectionState", (c) => {
        setConnectionState(c);
        refreshTracks();
        if (c === "idle" || c === "disconnected" || c === "error") {
          transcript.closeAll();
          openSegment("user", false);
          openSegment("bot", false);
        }
      }),
      session.on("turnState", setTurnState),
      session.on("userSpeaking", (v) => openSegment("user", v)),
      session.on("botSpeaking", (v) => openSegment("bot", v)),
      session.on("userTranscript", (t) => {
        transcript.user(t.text, t.final, t.at, t.method);
        // Voice approval of a share or a save: only the person's own final spoken words.
        if (t.final && t.method === "voice") live.current.registry.approveByVoice(t.text);
      }),
      session.on("botTranscript", (t) => transcript.assistant(t.text, t.final, t.at)),
      session.on("toolCall", (c) => transcript.call(c)),
      session.on("citations", (c) => transcript.citations(c)),
      session.on("metrics", (m) =>
        setMetricsHistory((list) => {
          const i = list.findIndex((x) => x.turnId === m.turnId);
          if (i >= 0) {
            const next = [...list];
            next[i] = m;
            return next;
          }
          return [...list, m].slice(-HISTORY);
        }),
      ),
      session.on("error", (e) => setLastError({ ...e, at: Date.now() })),
      session.on("endOfTurn", setEndOfTurn),
      session.on("pipelineHealth", (h) => setPipelineHealth((cur) => ({ ...cur, ...h }))),
      session.on("micPermission", setMicPermission),
      session.on("micEnabled", setMicEnabledState),
      session.on("tracksChanged", refreshTracks),
    ];
    setMock(session instanceof MockVoiceSession ? session : null);
    return session;
  }, []);

  const connect = useCallback(async () => {
    if (sessionRef.current || ending.current) return;
    setLastError(null);
    setMetricsHistory([]);
    setPipelineHealth({});
    setSegments([]);
    const session = build();
    sessionRef.current = session;
    setHasSession(true);
    try {
      await session.connect();
    } catch {
      /* reported through the error event */
    }
  }, [build]);

  const end = useCallback((): Promise<void> => {
    if (ending.current) return ending.current;
    const session = sessionRef.current;
    const registry = live.current.registry;
    if (!session && registry.sharedContext.length === 0) return Promise.resolve();
    registry.declineAll();
    registry.consumeNavigation();
    detach();
    transcript.closeAll();
    setMock(null);
    setTracks({ local: null, bot: null });
    setEndOfTurn(null);
    setSegments([]);
    setTurnState("idle");
    setConnectionState("disconnected");

    ending.current = (async () => {
      try {
        await session?.disconnect();
      } catch {
        toast({ level: "caution", title: "Session could not close cleanly" });
      } finally {
        await registry.clearShared();
        sessionRef.current = null;
        ending.current = null;
        setHasSession(false);
        setConnectionState("idle");
      }
    })();
    return ending.current;
  }, [toast]);

  // End the session when the active crew member changes.
  const crewId = activeCrew?.id ?? null;
  const prevCrew = useRef(crewId);
  useEffect(() => {
    if (prevCrew.current === crewId) return;
    const had = prevCrew.current !== null;
    prevCrew.current = crewId;
    if (!had) return;
    const wasActive = sessionRef.current !== null;
    void end();
    if (wasActive) {
      toast({ level: "standby", title: "Session ended — crew changed" });
    }
  }, [crewId, end, toast]);

  // Leaving the workspace ends the session.
  useEffect(
    () => () => { void end(); },
    [end],
  );

  // Hiding the tab mutes the microphone; returning does not unmute.
  useEffect(() => {
    const onVis = () => {
      const session = sessionRef.current;
      if (document.visibilityState === "hidden" && session?.micEnabled) session.setMicEnabled(false);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Live voice settings.
  useEffect(() => {
    if (settings && sessionRef.current) void sessionRef.current.setVoiceSettings(settings);
  }, [settings]);

  const sendText = useCallback((text: string) => sessionRef.current?.sendText(text), []);
  const interrupt = useCallback(() => sessionRef.current?.interrupt(), []);
  const setMic = useCallback((on: boolean) => sessionRef.current?.setMicEnabled(on), []);
  const setInputDevice = useCallback(async (id: string) => {
    await sessionRef.current?.setInputDevice(id);
  }, []);

  /** Ask for the microphone again; restarts an active session so it picks the mic up. */
  const retryMic = useCallback(async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicPermission("unavailable");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicPermission("granted");
      if (sessionRef.current) {
        await end();
        await connect();
      }
      return true;
    } catch (e) {
      setMicPermission(e instanceof DOMException && e.name === "NotFoundError" ? "unavailable" : "denied");
      return false;
    }
  }, [connect, end]);

  const toolCalls = useMemo(() => Object.values(state.calls), [state.calls]);
  const metrics = metricsHistory[metricsHistory.length - 1] ?? null;

  const mockControls = mock ? {
    forceTurnState: (state: TurnState | null) => mock.forceTurnState(state),
    triggerError: (fatal: boolean) => mock.triggerError(fatal),
    playNextTurn: () => {
      mock.playNextTurn();
      refreshMock((version) => version + 1);
    },
    setAutoPlay: (on: boolean) => {
      mock.setAutoPlay(on);
      refreshMock((version) => version + 1);
    },
    sayConfirmShare: () => mock.sayConfirmShare(),
    autoPlay: mock.autoPlay,
    scriptIndex: mock.scriptIndex,
    scriptLength: mock.scriptLength,
  } : null;

  return {
    connectionState,
    turnState,
    transcript: state,
    toolCalls,
    metrics,
    metricsHistory,
    segments,
    endOfTurn,
    pipelineHealth,
    micEnabled,
    micPermission,
    lastError,
    localTrack: tracks.local,
    botTrack: tracks.bot,
    /** A session object exists (connecting, connected, or failed and awaiting "End session"). */
    isActive: hasSession,
    connect,
    disconnect: end,
    sendText,
    interrupt,
    setMic,
    setInputDevice,
    retryMic,
    mockControls,
  };
}

export type VoiceSessionState = ReturnType<typeof useVoiceSession>;

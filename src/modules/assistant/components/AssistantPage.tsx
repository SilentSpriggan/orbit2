import { OctagonAlert, Settings2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MOCK_MODE } from "../../../shared/api/mockMode";
import { useCrew } from "../../../shared/context/CrewContext";
import { useSystemStatus } from "../../../shared/context/SystemStatusContext";
import { Button } from "../../../shared/ui/Button";
import { ICON_STROKE } from "../../../shared/ui/cn";
import { SectionHeader } from "../../../shared/ui/SectionHeader";
import { EMBEDDED, openInWebsite } from "../../../shared/embed";
import { useToast } from "../../../shared/ui/Toast";
import type { TranscriptState } from "../hooks/transcriptStore";
import { usePageStateOverride } from "../hooks/usePreferences";
import { useToolRegistry, type ShareConfirmation } from "../hooks/useToolRegistry";
import { useVoiceConfig } from "../hooks/useVoiceConfig";
import { useVoiceSession } from "../hooks/useVoiceSession";
import type { VoiceSettings } from "../types";
import { LiveVoiceCard } from "./LiveVoiceCard";
import { MockDevPanel } from "./MockDevPanel";
import { SessionButton } from "./SessionButton";
import { SessionPipelineCard } from "./SessionPipelineCard";
import { ShareReviewDialog } from "./ShareReviewDialog";
import { ToolsCard } from "./ToolsCard";
import { TranscriptCard } from "./TranscriptCard";
import { VoiceSettingsDrawer } from "./VoiceSettingsDrawer";

const EMPTY_TRANSCRIPT: TranscriptState = { items: [], turns: {}, calls: {} };
const BUSY_STATES = new Set(["bot_speaking", "thinking", "tool_running", "user_speaking"]);

export function AssistantPage() {
  const override = usePageStateOverride();
  const { activeCrew } = useCrew();
  const { status } = useSystemStatus();
  const { toast } = useToast();
  const navigate = useNavigate();

  const voiceConfig = useVoiceConfig();
  const config = override === "loading" || override === "error" ? null : voiceConfig.data;
  const configError = override === "error" ? "Simulated error (?state=error)." : (voiceConfig.error?.message ?? null);
  const configLoading = override === "loading" || (voiceConfig.isLoading && !voiceConfig.data);

  const [settings, setSettings] = useState<VoiceSettings | null>(null);
  useEffect(() => {
    if (voiceConfig.data && !settings) setSettings(voiceConfig.data.defaults);
  }, [voiceConfig.data, settings]);

  const registry = useToolRegistry();
  const session = useVoiceSession(registry, settings);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Session availability.
  const disabledReason = useMemo(() => {
    if (!status) return "Checking the local model…";
    // Embedded in the website there is no React status bar to point at.
    const seeStatus = EMBEDDED ? "" : " — see the status bar";
    if (status.network.mode === "unreachable") return `Local server unreachable${seeStatus}`;
    if (status.ollama.state !== "ready") return `Model not ready${seeStatus}`;
    return null;
  }, [status]);

  const activeTool = session.toolCalls.find((c) => c.status === "requested" || c.status === "running" || c.status === "awaiting_confirmation");
  const errorMessage = session.turnState === "error" ? (session.lastError?.message ?? null) : null;

  // Surface errors as toasts.
  const lastErrorAt = useRef<number | null>(null);
  useEffect(() => {
    const e = session.lastError;
    if (!e || e.at === lastErrorAt.current) return;
    lastErrorAt.current = e.at;
    toast({ level: e.fatal ? "critical" : "caution", title: e.fatal ? "Voice session stopped" : "Assistant problem", description: e.message });
  }, [session.lastError, toast]);

  // Share review: opens automatically for a new request; can be reopened from the transcript.
  const shareRequest = registry.confirmations.find((c): c is ShareConfirmation => c.kind === "share") ?? null;
  const [reviewOpen, setReviewOpen] = useState(false);
  const shownShare = useRef<string | null>(null);
  useEffect(() => {
    if (shareRequest && shownShare.current !== shareRequest.callId) {
      shownShare.current = shareRequest.callId;
      setReviewOpen(true);
    }
    if (!shareRequest) setReviewOpen(false);
  }, [shareRequest]);

  // Deferred navigation from the navigate tool, after ORBIT finishes speaking.
  const { pendingNavigation, consumeNavigation } = registry;
  useEffect(() => {
    const path = pendingNavigation;
    if (!path || BUSY_STATES.has(session.turnState)) return;
    const t = window.setTimeout(() => {
      consumeNavigation();
      // The website dock keeps this frame mounted, so opening another tab does not end the session.
      if (!EMBEDDED && !path.startsWith("/assistant") && session.isActive) {
        toast({ level: "standby", title: "Session ended — left the assistant", description: `Opened ${path}.` });
      }
      // Inside the website tab, open the website's own screen rather than this app's placeholder.
      if (EMBEDDED) openInWebsite(path);
      else navigate(path);
    }, 700);
    return () => window.clearTimeout(t);
  }, [pendingNavigation, consumeNavigation, session.turnState, session.isActive, navigate, toast]);

  const headerActions = (
    <>
      <Button variant="secondary" icon={Settings2} onClick={() => setSettingsOpen(true)}>
        Voice settings
      </Button>
      <SessionButton
        isActive={session.isActive}
        connecting={session.connectionState === "connecting"}
        disabledReason={session.isActive ? null : disabledReason}
        onStart={() => void session.connect()}
        onEnd={() => void session.disconnect()}
      />
    </>
  );

  const connected = session.connectionState === "connected";
  const transcriptState = override === "empty" ? EMPTY_TRANSCRIPT : session.transcript;

  return (
    <div className="flex min-h-full flex-col">
      {EMBEDDED ? (
        // The website tab already shows the page title; keep only the actions.
        <div className="orbit-embedded-actions">{headerActions}</div>
      ) : (
        <SectionHeader
          title="Crew assistant"
          className="orbit-assistant-heading"
          subtitle="Talk to ORBIT, review the conversation, and choose what to share."
          actions={headerActions}
        />
      )}

      {status?.network.mode === "unreachable" && (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-critical-line bg-critical-tint px-4 py-3 text-sm text-ink">
          <OctagonAlert size={16} strokeWidth={ICON_STROKE} aria-hidden="true" className="mt-0.5 shrink-0 text-critical" />
          The local server is unreachable. Voice and text both run on it; the transcript below is still available on this screen.
        </div>
      )}

      <div className="grid flex-1 grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
        <div className="flex min-w-0 flex-col gap-4">
          <LiveVoiceCard
            session={session}
            activeToolName={activeTool?.name ?? null}
            errorMessage={errorMessage}
            onRetryMic={() => {
              void session.retryMic().then((ok) =>
                toast(
                  ok
                    ? { level: "nominal", title: "Microphone allowed" }
                    : { level: "caution", title: "Microphone still blocked", description: "Change the site permission, then try again." },
                ),
              );
            }}
          />
          <TranscriptCard
            className="min-h-[560px] flex-1"
            state={transcriptState}
            loading={override === "loading"}
            userLabel={activeCrew ? `You · ${activeCrew.callsign}` : "You"}
            canSend={connected}
            sendHint={session.isActive ? "Connecting…" : "Start a session to send messages."}
            onSend={session.sendText}
            confirmations={registry.confirmations}
            onResolve={registry.resolveConfirmation}
            onReviewShare={() => setReviewOpen(true)}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <SessionPipelineCard
            connectionState={session.connectionState}
            metrics={session.metrics}
            history={session.metricsHistory}
            config={config}
            liveHealth={session.pipelineHealth}
            voiceId={settings?.voiceId ?? null}
            loading={configLoading}
          />
          <ToolsCard tools={registry.tools} onToggle={registry.setToolEnabled} shared={registry.sharedContext} onClearShared={registry.clearShared} />
          {MOCK_MODE && <MockDevPanel session={session} />}
        </div>
      </div>

      <VoiceSettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        config={config}
        configError={configError}
        onRetryConfig={voiceConfig.refetch}
        settings={settings}
        liveSession={session.isActive}
        onApplied={(s) => {
          setSettings(s);
          toast({ level: "nominal", title: "Voice settings applied", description: session.isActive ? "Live in this session." : undefined });
        }}
      />
      <ShareReviewDialog
        request={shareRequest}
        open={reviewOpen && shareRequest !== null}
        onClose={() => setReviewOpen(false)}
        onShare={() => shareRequest && registry.resolveConfirmation(shareRequest.callId, true, "button")}
        onDecline={() => shareRequest && registry.resolveConfirmation(shareRequest.callId, false, "button")}
      />
    </div>
  );
}

import { MicOff, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "../../../shared/ui/Button";
import { Card } from "../../../shared/ui/Card";
import { ICON_STROKE } from "../../../shared/ui/cn";
import { useAudioAnalyser } from "../hooks/useAudioAnalyser";
import { useDocumentVisible, useReducedMotion } from "../hooks/usePreferences";
import type { VoiceSessionState } from "../hooks/useVoiceSession";
import { DOCKED } from "../../../shared/embed";
import { turnStateMeta, TurnStateIndicator } from "./TurnStateIndicator";
import { VadLane } from "./VadLane";
import { VoiceControls } from "./VoiceControls";
import { WaveformCanvas } from "./WaveformCanvas";

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName);
}

export interface LiveVoiceCardProps {
  session: VoiceSessionState;
  activeToolName: string | null;
  errorMessage: string | null;
  onRetryMic: () => void;
}

const HINT_ID = "live-voice-keys";

export function LiveVoiceCard({ session, activeToolName, errorMessage, onRetryMic }: LiveVoiceCardProps) {
  const reducedMotion = useReducedMotion();
  const visible = useDocumentVisible();
  const userAnalyser = useAudioAnalyser(session.localTrack);
  const botAnalyser = useAudioAnalyser(session.botTrack);
  const [holding, setHolding] = useState(false);
  const holdRestore = useRef<boolean | null>(null);

  const connected = session.connectionState === "connected";
  const micBlocked = session.micPermission === "denied" || session.micPermission === "unavailable";
  const canInterrupt = session.turnState === "bot_speaking";
  const label = turnStateMeta(session.turnState, activeToolName, errorMessage).label;

  const hold = useCallback(
    (down: boolean) => {
      if (!connected || micBlocked) return;
      if (down) {
        if (holdRestore.current !== null) return;
        holdRestore.current = session.micEnabled;
        if (!session.micEnabled) session.setMic(true);
        setHolding(true);
      } else {
        if (holdRestore.current === false) session.setMic(false);
        holdRestore.current = null;
        setHolding(false);
      }
    },
    [connected, micBlocked, session],
  );

  // Release push-to-talk if focus leaves the window mid-hold.
  useEffect(() => {
    const release = () => hold(false);
    window.addEventListener("blur", release);
    return () => window.removeEventListener("blur", release);
  }, [hold]);

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (isTypingTarget(e.target)) return;
    if (e.key === " ") {
      e.preventDefault();
      if (!e.repeat) hold(true);
    } else if ((e.key === "m" || e.key === "M") && !e.metaKey && !e.ctrlKey && !e.altKey) {
      if (connected && !micBlocked) {
        e.preventDefault();
        session.setMic(!session.micEnabled);
      }
    } else if (e.key === "Escape" && canInterrupt) {
      e.preventDefault();
      session.interrupt();
    }
  };

  const onKeyUp = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === " " && !isTypingTarget(e.target)) {
      e.preventDefault();
      hold(false);
    }
  };

  return (
    <Card
      aria-label="Live voice"
      aria-describedby={HINT_ID}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      className="flex flex-col overflow-hidden focus-visible:outline-2 focus-visible:outline-focus"
    >
      <div className={DOCKED ? "bg-panel border-b border-line p-4" : "min-h-[220px] bg-panel border-b border-line p-4"}>
        {micBlocked ? (
          <MicBlocked unavailable={session.micPermission === "unavailable"} onRetry={onRetryMic} />
        ) : (
          <div className={DOCKED ? "flex flex-col items-center gap-3" : "grid h-full grid-cols-[minmax(160px,220px)_1fr] gap-4"}>
            <TurnStateIndicator centered={DOCKED} state={session.turnState} toolName={activeToolName} errorMessage={errorMessage} />
            <div className={DOCKED ? "flex w-full min-w-0 flex-col gap-2" : "flex min-w-0 flex-col justify-between gap-2"}>
              <WaveformCanvas
                analyser={userAnalyser}
                colorVar="--color-series-2"
                fillClass="bg-series-2"
                label="You"
                ariaLabel={`Your microphone: ${session.micEnabled ? label : "microphone off"}`}
                reducedMotion={reducedMotion}
                paused={!visible}
              />
              <WaveformCanvas
                analyser={botAnalyser}
                colorVar="--color-series-1"
                fillClass="bg-series-1"
                label="ORBIT"
                ariaLabel={`ORBIT voice: ${session.turnState === "bot_speaking" ? "speaking" : "silent"}`}
                reducedMotion={reducedMotion}
                paused={!visible}
              />
              <VadLane segments={session.segments} endOfTurn={session.endOfTurn} paused={!visible} reducedMotion={reducedMotion} />
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 px-4 py-3">
        <VoiceControls
          connected={connected}
          micEnabled={session.micEnabled && connected}
          micBlocked={micBlocked}
          canInterrupt={canInterrupt}
          holding={holding}
          onToggleMic={() => session.setMic(!session.micEnabled)}
          onHold={hold}
          onInterrupt={session.interrupt}
          onSelectDevice={(id) => void session.setInputDevice(id)}
          deviceKey={session.localTrack}
        />
        <p id={HINT_ID} className="text-xs text-ink-3">
          With this card focused: <kbd className="font-mono">M</kbd> mutes, hold <kbd className="font-mono">Space</kbd> to talk,{" "}
          <kbd className="font-mono">Esc</kbd> stops ORBIT speaking.
        </p>
      </div>
    </Card>
  );
}

function MicBlocked({ unavailable, onRetry }: { unavailable: boolean; onRetry: () => void }) {
  return (
    <div className="flex h-full gap-4 overflow-y-auto">
      <MicOff size={24} strokeWidth={ICON_STROKE} aria-hidden="true" className="mt-0.5 shrink-0 text-ink-3" />
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-md font-semibold text-ink">
          {unavailable ? "No microphone available" : "Microphone access is blocked"}
        </p>
        {unavailable ? (
          <p className="text-sm text-ink-2 max-w-[72ch]">
            Connect a microphone to this device, then try again. You can keep using the assistant by typing below.
          </p>
        ) : (
          <ol className="list-decimal pl-5 text-sm text-ink-2 max-w-[72ch] space-y-0.5">
            <li>Open the site settings from the lock icon next to the address.</li>
            <li>Set Microphone to Allow for this console.</li>
            <li>Select Try again. Typing below keeps working in the meantime.</li>
          </ol>
        )}
        <div>
          <Button size="sm" variant="secondary" icon={RotateCcw} onClick={onRetry}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}

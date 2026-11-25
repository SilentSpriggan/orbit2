import { FlaskConical, MessageSquareQuote, Play, RefreshCw, TriangleAlert } from "lucide-react";
import { useSystemStatus } from "../../../shared/context/SystemStatusContext";
import { cycleMockStatus } from "../../../shared/mocks/systemStatus";
import { Button } from "../../../shared/ui/Button";
import { Card, CardBody, CardHeader } from "../../../shared/ui/Card";
import { ICON_STROKE } from "../../../shared/ui/cn";
import { Field, Select, Switch } from "../../../shared/ui/Field";
import type { VoiceSessionState } from "../hooks/useVoiceSession";
import type { TurnState } from "../types";

const STATES: TurnState[] = ["idle", "connecting", "listening", "user_speaking", "thinking", "tool_running", "bot_speaking", "muted", "error"];

/** Mock mode only: drive every turn state, the script and simulated failures. */
export function MockDevPanel({ session }: { session: VoiceSessionState }) {
  const { refresh } = useSystemStatus();
  const m = session.mockControls;

  return (
    <Card aria-labelledby="dev-title" className="border-dashed border-standby-line">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <FlaskConical size={16} strokeWidth={ICON_STROKE} aria-hidden="true" className="text-standby" />
            Demo controls
          </span>
        }
        titleId="dev-title"
      />
      <CardBody className="flex flex-col gap-4">
        <p className="text-xs text-ink-3">Mock mode only. These controls simulate the local pipeline; nothing is real.</p>
        {!m ? (
          <p className="text-sm text-ink-2">Start a session to play the scripted conversation.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" icon={Play} disabled={m.scriptIndex >= m.scriptLength} onClick={m.playNextTurn}>
                Next scripted turn
                <span className="font-mono text-xs text-ink-3">
                  {Math.min(m.scriptIndex + 1, m.scriptLength)}/{m.scriptLength}
                </span>
              </Button>
              <Switch checked={m.autoPlay} showLabel label="Auto-play script" onChange={m.setAutoPlay} />
            </div>
            <Field label="Force turn state" helper="Overrides the derived state to check each visual.">
              {(p) => (
                <Select {...p} defaultValue="" onChange={(e) => m.forceTurnState((e.target.value || null) as TurnState | null)}>
                  <option value="">Derived from the session</option>
                  {STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" icon={TriangleAlert} onClick={() => m.triggerError(false)}>
                Simulate error
              </Button>
              <Button size="sm" variant="secondary" icon={TriangleAlert} onClick={() => m.triggerError(true)}>
                Simulate fatal error
              </Button>
              <Button size="sm" variant="secondary" icon={MessageSquareQuote} onClick={m.sayConfirmShare}>
                Say &ldquo;Confirm share&rdquo;
              </Button>
            </div>
          </>
        )}
        <div>
          <Button
            size="sm"
            variant="ghost"
            icon={RefreshCw}
            onClick={() => {
              cycleMockStatus();
              refresh();
            }}
          >
            Cycle system status
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

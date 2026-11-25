import type { ReactNode } from "react";
import { THIN_SPACE } from "../../../shared/format";
import type { StatusLevel } from "../../../shared/types";
import { Card, CardBody, CardHeader } from "../../../shared/ui/Card";
import { Skeleton, SkeletonGroup } from "../../../shared/ui/Skeleton";
import { StatusBadge } from "../../../shared/ui/StatusBadge";
import type { ConnectionState, PipelineMetrics, PipelineStage, StageHealth, VoiceConfig } from "../types";
import { LatencyMetrics } from "./LatencyMetrics";

const CONNECTION: Record<ConnectionState, { level: StatusLevel; text: string }> = {
  idle: { level: "standby", text: "Not connected" },
  connecting: { level: "caution", text: "Connecting" },
  connected: { level: "nominal", text: "Connected" },
  reconnecting: { level: "caution", text: "Reconnecting" },
  disconnected: { level: "standby", text: "Disconnected" },
  error: { level: "critical", text: "Connection failed" },
};

const HEALTH: Record<StageHealth, { level: StatusLevel; text: string }> = {
  ready: { level: "nominal", text: "Ready" },
  loading: { level: "caution", text: "Loading" },
  unavailable: { level: "critical", text: "Unavailable" },
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[112px_1fr] items-center gap-3 py-1.5">
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className="flex min-w-0 flex-wrap items-center justify-between gap-2">{children}</dd>
    </div>
  );
}

function Model({ name, health }: { name: string; health: StageHealth | undefined }) {
  return (
    <>
      <span className="truncate font-mono text-xs text-ink">{name}</span>
      {health ? (
        <StatusBadge level={HEALTH[health].level} size="sm">
          {HEALTH[health].text}
        </StatusBadge>
      ) : (
        <StatusBadge level="nodata" size="sm">
          No data
        </StatusBadge>
      )}
    </>
  );
}

export interface SessionPipelineCardProps {
  connectionState: ConnectionState;
  metrics: PipelineMetrics | null;
  history: PipelineMetrics[];
  config: VoiceConfig | null;
  liveHealth: Partial<Record<PipelineStage, StageHealth>>;
  voiceId: string | null;
  loading: boolean;
}

export function SessionPipelineCard({ connectionState, metrics, history, config, liveHealth, voiceId, loading }: SessionPipelineCardProps) {
  const c = CONNECTION[connectionState];
  const health = { ...(config?.pipelineHealth ?? {}), ...liveHealth };
  return (
    <Card aria-labelledby="pipeline-title">
      <CardHeader title="Session & pipeline" titleId="pipeline-title" />
      <CardBody className="flex flex-col gap-5">
        {loading ? (
          <SkeletonGroup label="Loading pipeline" className="flex flex-col gap-2">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} className="h-6" />
            ))}
          </SkeletonGroup>
        ) : (
          <dl className="divide-y divide-line">
            <Row label="Connection">
              <StatusBadge level={c.level} size="sm">
                {c.text}
              </StatusBadge>
            </Row>
            <Row label="Transport">
              <span className="text-xs text-ink">SmallWebRTC · host candidates</span>
            </Row>
            <Row label="Round trip">
              <span>
                <span className="font-mono text-xs text-ink tabular-nums">{metrics?.rttMs ?? "—"}</span>
                {metrics?.rttMs != null && <span className="font-mono text-xs text-ink-3">{THIN_SPACE}ms</span>}
              </span>
            </Row>
            <Row label="STT">
              <Model name={config?.capabilities.sttModel ?? "—"} health={health.stt} />
            </Row>
            <Row label="LLM">
              <Model name={config?.capabilities.llmModel ?? "qwen3:8b"} health={health.llm} />
            </Row>
            <Row label="TTS">
              <Model name={`Kokoro · ${voiceId ?? config?.defaults.voiceId ?? "af_heart"}`} health={health.tts} />
            </Row>
            <Row label="VAD">
              <Model name="Silero" health={health.vad} />
            </Row>
            <Row label="Turn detection">
              <Model name={config?.capabilities.turnDetection ?? "—"} health={health.turn} />
            </Row>
          </dl>
        )}
        <LatencyMetrics metrics={metrics} history={history} />
      </CardBody>
    </Card>
  );
}

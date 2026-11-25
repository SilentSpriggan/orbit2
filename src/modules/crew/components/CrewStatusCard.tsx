import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useCrew } from "../../../shared/context/CrewContext";
import { ROLE_LABEL } from "../../../shared/types";
import {
  Card,
  ProductRuleNote,
  StatusBadge,
  TelemetryValue,
} from "../../../shared/ui";
import { useReviewBands } from "../hooks/useCrewHealth";
import { COMPACT, METRICS, stamp } from "../logic/metrics";
import { levelFor } from "../logic/status";
import { LABEL, linkStyle, WellbeingGate } from "./common";
import type { CrewHealthSummary } from "../types";
export function CrewStatusCard({ summary }: { summary: CrewHealthSummary }) {
  const { getCrew } = useCrew();
  const person = getCrew(summary.crewId);
  const bands = useReviewBands(summary.crewId);
  if (!person) return null;
  return (
    <Card
      key={person.id}
      className={summary.overall === "critical" ? "border-critical-line" : ""}
    >
      <div className="px-3 pt-3 flex flex-wrap items-center gap-2">
        <span className="size-8 rounded-md bg-raised border border-line grid place-items-center font-mono text-ink-2">
          {person.initials}
        </span>
        <Link to={`/crew/${person.id}`} className="min-h-11 flex-1 group">
          <span className="font-mono font-semibold group-hover:text-accent">
            {person.callsign}
          </span>
          <span className="block text-xs text-ink-2">{person.fullName}</span>
          <span className="block text-xs text-ink-2">
            {ROLE_LABEL[person.role]}
          </span>
        </Link>
        <StatusBadge level={summary.overall} size="sm">
          {LABEL[summary.overall]}
        </StatusBadge>
      </div>
      <div className="grid grid-cols-3 gap-3 px-4 py-3">
        {COMPACT.map((kind) => (
          <TelemetryValue
            key={kind}
            label={
              kind === "resp_rate"
                ? "Resp. rate"
                : kind === "skin_temp"
                  ? "Temperature"
                  : METRICS[kind].label
            }
            value={summary.latest[kind]?.value ?? null}
            unit={METRICS[kind].unit}
            size="md"
            level={
              summary.latest[kind]
                ? levelFor(
                    summary.latest[kind]!,
                    bands.data?.find((b) => b.kind === kind),
                  )
                : "nodata"
            }
          />
        ))}
      </div>
      <div className="px-4 pb-2">
        <p
          className="text-sm text-ink-2 truncate"
          title={summary.topReason ?? ""}
        >
          {summary.topReason}
        </p>
        <ProductRuleNote />
      </div>
      <div className="px-4 border-t border-line flex flex-wrap justify-between items-center gap-1">
        <WellbeingGate id={person.id}>
          <span className="text-xs text-ink-2">
            Stress{" "}
            <span className="font-mono">
              {summary.latest.stress_self?.value ?? "—"}/10
            </span>{" "}
            · fatigue{" "}
            <span className="font-mono">
              {summary.latest.fatigue_self?.value ?? "—"}/10
            </span>{" "}
            · self-reported
          </span>
        </WellbeingGate>
        <Link className={linkStyle} to={`/anatomy?crew=${person.id}`}>
          View on anatomy <ArrowUpRight size={14} />
        </Link>
      </div>
      <p className="px-4 pb-2 font-mono text-2xs text-ink-3">
        Last reading{" "}
        {summary.lastReadingAt ? stamp(summary.lastReadingAt) : "—"}
      </p>
    </Card>
  );
}

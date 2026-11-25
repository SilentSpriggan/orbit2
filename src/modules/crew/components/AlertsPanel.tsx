import { Link } from "react-router-dom";
import { useCrew } from "../../../shared/context/CrewContext";
import {
  Button,
  Card,
  CardHeader,
  ProductRuleNote,
  StatusBadge,
} from "../../../shared/ui";
import { useAcknowledge, useAlerts } from "../hooks/useCrewHealth";
import { stamp } from "../logic/metrics";
import { LABEL, linkStyle } from "./common";
export function AlertsPanel() {
  const query = useAlerts();
  const ack = useAcknowledge();
  const { getCrew } = useCrew();
  const alerts = query.data ?? [];
  return (
    <Card className="sticky top-5">
      <CardHeader
        title="Active alerts"
        actions={
          <span className="font-mono text-sm text-ink-2">
            {alerts.filter((a) => !a.acknowledgedAt).length} open
          </span>
        }
      />
      <div className="divide-y divide-line">
        {query.isLoading && <p className="p-5 text-ink-2">Loading alerts…</p>}
        {(query.error || ack.error) && (
          <p role="alert" className="p-5 text-critical">
            {query.error?.message ?? ack.error?.message}
          </p>
        )}
        {alerts
          .filter((a) => !a.acknowledgedAt)
          .map((a) => (
            <article key={a.id} className="p-4">
              <div className="flex justify-between items-center gap-2">
                <span className="font-mono font-semibold">
                  {getCrew(a.crewId)?.callsign}
                </span>
                <StatusBadge level={a.level}>{LABEL[a.level]}</StatusBadge>
              </div>
              <p className="mt-3 mb-2 text-sm">{a.message}</p>
              <p className="text-xs text-ink-2">{a.rule}</p>
              <ProductRuleNote className="mt-2" />
              <p className="font-mono text-2xs text-ink-3 mt-2">
                {stamp(a.createdAt)}
              </p>
              <div className="flex justify-between mt-3">
                <Button
                  variant="secondary"
                  disabled={ack.isPending}
                  onClick={() => void ack.mutate(a.id).catch(() => {})}
                >
                  Acknowledge
                </Button>
                <Link className={linkStyle} to={`/crew/${a.crewId}`}>
                  Open →
                </Link>
              </div>
            </article>
          ))}
        {!query.isLoading && !alerts.some((a) => !a.acknowledgedAt) && (
          <p className="p-5 text-ink-2">
            No active alerts. Continue scheduled check-ins.
          </p>
        )}
      </div>
      <details className="border-t border-line p-4">
        <summary className="min-h-11 cursor-pointer text-sm text-ink-2">
          Acknowledged today (
          {
            alerts.filter(
              (a) =>
                a.acknowledgedAt?.slice(0, 10) ===
                new Date().toISOString().slice(0, 10),
            ).length
          }
          )
        </summary>
        {alerts
          .filter((a) => a.acknowledgedAt)
          .map((a) => (
            <p key={a.id} className="text-xs text-ink-2 py-2">
              {a.message}
              <br />
              Acknowledged by {getCrew(a.acknowledgedBy ?? "")?.callsign} ·{" "}
              <span className="font-mono">{stamp(a.acknowledgedAt!)}</span>
            </p>
          ))}
      </details>
      <p className="p-4 border-t border-line text-xs text-ink-3">
        Review flags support crew check-ins. They do not diagnose or assess
        fitness for duty.
      </p>
    </Card>
  );
}

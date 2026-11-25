import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { useCrew } from "../../../shared/context/CrewContext";
import { canSeeWellbeing, ROLE_LABEL } from "../../../shared/types";
import {
  Card,
  CardHeader,
  ProductRuleNote,
  SectionHeader,
  StatusBadge,
  Tabs,
  TelemetryValue,
} from "../../../shared/ui";
import {
  useCrewSummaries,
  useReadings,
  useReviewBands,
} from "../hooks/useCrewHealth";
import { useLiveTelemetry } from "../hooks/useLiveTelemetry";
import { KINDS, METRICS, stamp } from "../logic/metrics";
import { levelFor } from "../logic/status";
import { WELLBEING_KINDS } from "../types";
import {
  LABEL,
  linkStyle,
  PageState,
  useForcedState,
  WellbeingGate,
} from "./common";
import { TrendsTab } from "./TrendsTab";
import { HealthLogTab } from "./HealthLogTab";
import { ReviewBandsTab } from "./ReviewBandsTab";
import { LogReadingDialog } from "./LogReadingDialog";
export function CrewProfilePage() {
  const { crewId = "" } = useParams();
  return <Profile key={crewId} id={crewId} />;
}
function Profile({ id }: { id: string }) {
  const { getCrew, activeCrew, crew } = useCrew();
  const person = getCrew(id);
  const readings = useReadings(id);
  const bands = useReviewBands(id);
  const summaries = useCrewSummaries();
  const live = useLiveTelemetry(id);
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const forced = useForcedState();
  const summary = summaries.data?.find((s) => s.crewId === id);
  const wellbeing = !!activeCrew && canSeeWellbeing(activeCrew, id);
  const tab = location.pathname.endsWith("/bands")
    ? "bands"
    : (params.get("tab") ?? "overview");
  const logging = location.pathname.endsWith("/log");
  const loading = readings.isLoading || bands.isLoading || summaries.isLoading;
  const error = readings.error ?? bands.error ?? summaries.error;
  const data = (readings.data?.items ?? []).filter(
    (r) => wellbeing || !WELLBEING_KINDS.includes(r.kind),
  );
  if (!person && crew.length)
    return (
      <div className="p-6">
        <h1 className="text-xl">Crew member not found</h1>
        <Link to="/crew" className={linkStyle}>
          Back to crew
        </Link>
      </div>
    );
  return (
    <div className="mx-auto max-w-[1600px] px-6 py-5">
      <Link to="/crew" className={`${linkStyle} -ml-3 mb-3`}>
        <ArrowLeft size={16} />
        Crew overview
      </Link>
      <SectionHeader
        title={
          <span className="flex items-center gap-3">
            <span className="size-12 grid place-items-center rounded-lg bg-accent-tint text-accent font-mono text-md">
              {person?.initials}
            </span>
            <span>
              <span className="font-mono">{person?.callsign}</span>
              <span className="ml-3">{person?.fullName}</span>
            </span>
          </span>
        }
        subtitle={
          <>
            {person && ROLE_LABEL[person.role]}{" "}
            {person?.isCrewLeader && "· Crew leader"}{" "}
            {person?.isMedicalOfficer && "· Medical officer"}
          </>
        }
        actions={
          <>
            {summary && (
              <StatusBadge level={summary.overall}>
                {LABEL[summary.overall]}
              </StatusBadge>
            )}
            <Link
              to={`/crew/${id}/log`}
              className={`${linkStyle} bg-accent text-on-accent hover:bg-accent-hover`}
            >
              <Plus size={16} />
              Log reading
            </Link>
          </>
        }
      />
      <PageState
        loading={loading}
        error={error}
        empty={false}
        retry={() => {
          readings.refetch();
          bands.refetch();
          summaries.refetch();
        }}
      />
      {!loading && !error && !forced && (
        <Tabs
          label="Crew profile"
          items={[
            { value: "overview", label: "Overview" },
            { value: "trends", label: "Trends" },
            { value: "log", label: "Health log" },
            { value: "bands", label: "Review bands" },
          ]}
          value={
            ["overview", "trends", "log", "bands"].includes(tab)
              ? tab
              : "overview"
          }
          onChange={(value) =>
            navigate(
              value === "bands"
                ? `/crew/${id}/bands`
                : `/crew/${id}?tab=${value}`,
            )
          }
        >
          {(active, p) => (
            <div {...p} className="pt-5 space-y-4">
              {active === "overview" && (
                <>
                  <div className="flex justify-between items-center">
                    <h2 className="text-md font-semibold">Latest vitals</h2>
                    <ProductRuleNote />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {KINDS.filter(
                      (k) =>
                        k !== "bp_diastolic" &&
                        (wellbeing || !WELLBEING_KINDS.includes(k)),
                    ).map((kind) => {
                      const r = data.find((r) => r.kind === kind);
                      const b = bands.data?.find((b) => b.kind === kind);
                      const points = data
                        .filter(
                          (r) =>
                            r.kind === kind &&
                            Date.now() - Date.parse(r.recordedAt) < 86400000,
                        )
                        .toReversed()
                        .map((r) => r.value);
                      const min = Math.min(...points),
                        span = Math.max(...points) - min || 1;
                      return (
                        <Card key={kind} className="p-4">
                          <TelemetryValue
                            label={
                              kind === "bp_systolic"
                                ? "Blood pressure"
                                : METRICS[kind].label
                            }
                            value={
                              r
                                ? kind === "bp_systolic"
                                  ? `${r.value}/${data.find((d) => d.kind === "bp_diastolic" && (r.pairId ? d.pairId === r.pairId : d.recordedAt === r.recordedAt))?.value ?? "—"}`
                                  : r.value
                                : null
                            }
                            unit={METRICS[kind].unit}
                            level={
                              r
                                ? b?.expectedIntervalHours &&
                                  Date.now() - Date.parse(r.recordedAt) >
                                    b.expectedIntervalHours * 3600000
                                  ? "nodata"
                                  : levelFor(r, b)
                                : "nodata"
                            }
                            timestamp={r ? stamp(r.recordedAt) : undefined}
                            source={r?.source}
                          />
                          <svg
                            viewBox="0 0 200 32"
                            className="w-full h-8 mt-3"
                            aria-label={`${METRICS[kind].label}: ${points.length} readings in 24 hours`}
                            role="img"
                          >
                            <polyline
                              points={points
                                .map(
                                  (v, i) =>
                                    `${(i * 200) / Math.max(points.length - 1, 1)},${28 - ((v - min) / span) * 24}`,
                                )
                                .join(" ")}
                              fill="none"
                              stroke="var(--color-series-1)"
                              strokeWidth="2"
                            />
                          </svg>
                          {kind === "hydration_ml" && (
                            <p className="text-xs text-ink-3">
                              Crew target band:{" "}
                              <span className="font-mono">
                                {b?.min}–{b?.max} mL
                              </span>
                            </p>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                  <WellbeingGate id={id}>
                    <p className="text-xs text-ink-3">
                      Stress, fatigue and sleep quality are self-reported.
                    </p>
                  </WellbeingGate>
                  {live.state !== "off" && (
                    <Card>
                      <CardHeader
                        title="Live telemetry"
                        actions={
                          <StatusBadge
                            level={
                              live.state === "live" ? "nominal" : "standby"
                            }
                          >
                            {live.state === "live" ? "Live" : "Stream paused"}
                          </StatusBadge>
                        }
                      />
                      <div className="p-5 flex flex-wrap gap-8">
                        <TelemetryValue
                          label="Heart rate"
                          value={live.data?.heartRate ?? null}
                          unit="bpm"
                        />
                        <TelemetryValue
                          label="SpO₂"
                          value={live.data?.spo2 ?? null}
                          unit="%"
                        />
                        <p className="font-mono text-xs text-ink-3 self-end">
                          {live.data?.deviceName}
                          <br />
                          {live.data && stamp(live.data.at)}
                        </p>
                      </div>
                    </Card>
                  )}
                  <Card>
                    <CardHeader title="Recent notes" />
                    <div className="divide-y divide-line">
                      {data
                        .filter((r) => r.note)
                        .slice(0, 3)
                        .map((r) => (
                          <p key={r.id} className="p-4 text-sm">
                            <span className="font-mono text-xs text-ink-3 mr-4">
                              {stamp(r.recordedAt)}
                            </span>
                            {r.note}
                          </p>
                        ))}
                      {!data.some((r) => r.note) && (
                        <p className="p-5 text-ink-2">No notes recorded.</p>
                      )}
                    </div>
                  </Card>
                </>
              )}
              {active === "trends" && (
                <TrendsTab
                  readings={data}
                  bands={bands.data ?? []}
                  wellbeing={wellbeing}
                />
              )}{" "}
              {active === "log" && (
                <HealthLogTab readings={data} wellbeing={wellbeing} />
              )}{" "}
              {active === "bands" && (
                <ReviewBandsTab
                  key={`${id}-${activeCrew?.id}`}
                  id={id}
                  bands={bands.data ?? []}
                  wellbeing={wellbeing}
                />
              )}
            </div>
          )}
        </Tabs>
      )}
      {logging && !loading && !error && (
        <LogReadingDialog
          key={activeCrew?.id}
          id={id}
          bands={bands.data ?? []}
        />
      )}
    </div>
  );
}

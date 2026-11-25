import { Link } from "react-router-dom";
import { Plus, RefreshCw } from "lucide-react";
import { useCrew } from "../../../shared/context/CrewContext";
import {
  Card,
  IconButton,
  SectionHeader,
  StatusBadge,
} from "../../../shared/ui";
import { useCrewSummaries } from "../hooks/useCrewHealth";
import { rankCrew } from "../logic/status";
import { LABEL, linkStyle, PageState, useForcedState } from "./common";
import { CrewStatusCard } from "./CrewStatusCard";
import { AlertsPanel } from "./AlertsPanel";
export function CrewOverviewPage() {
  const { crew, activeCrew } = useCrew();
  const query = useCrewSummaries();
  const forced = useForcedState();
  const rows = rankCrew(query.data ?? []);
  return (
    <div className="mx-auto max-w-[1600px] px-6 py-5">
      <SectionHeader
        title="Crew status"
        subtitle={
          <>
            Ranked by who needs attention first · updated{" "}
            <span className="font-mono">
              {new Date().toISOString().slice(11, 16)}Z
            </span>
          </>
        }
        actions={
          <>
            <Link
              className={`${linkStyle} border border-line-strong bg-raised text-ink`}
              to={`/crew/${activeCrew?.id ?? "c01"}/log`}
            >
              <Plus size={16} />
              Log reading
            </Link>
            <IconButton
              icon={RefreshCw}
              label="Refresh"
              onClick={query.refetch}
            />
          </>
        }
      />
      <PageState
        loading={query.isLoading}
        error={query.error}
        empty={!rows.length}
        retry={query.refetch}
      />
      {!query.isLoading && !query.error && rows.length > 0 && !forced && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            {(["critical", "caution", "nodata", "nominal"] as const).map(
              (level) => (
                <Card
                  key={level}
                  className="px-4 py-3 flex items-center justify-between gap-2"
                >
                  <StatusBadge level={level}>{LABEL[level]}</StatusBadge>
                  <span className="font-mono text-2xl">
                    {rows.filter((r) => r.overall === level).length}
                  </span>
                </Card>
              ),
            )}
          </div>
          <div className="grid grid-cols-12 gap-4">
            <section
              className="col-span-12 lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4 content-start"
              aria-label="Ranked crew roster"
            >
              {rows.map((summary) => {
                const person = crew.find((c) => c.id === summary.crewId);
                if (!person) return null;
                return <CrewStatusCard key={person.id} summary={summary} />;
              })}
            </section>
            <aside className="col-span-12 lg:col-span-4">
              <AlertsPanel />
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

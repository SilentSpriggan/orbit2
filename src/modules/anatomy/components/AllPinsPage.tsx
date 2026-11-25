import { ArrowLeft, MapPin, OctagonAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCrew } from "../../../shared/context/CrewContext";
import { formatUtcDateTime } from "../../../shared/format";
import { Button } from "../../../shared/ui/Button";
import { Card } from "../../../shared/ui/Card";
import { ICON_STROKE, TYPE } from "../../../shared/ui/cn";
import { EmptyState } from "../../../shared/ui/EmptyState";
import { Field, Select } from "../../../shared/ui/Field";
import { SectionHeader } from "../../../shared/ui/SectionHeader";
import { Skeleton, SkeletonGroup } from "../../../shared/ui/Skeleton";
import { StatusBadge } from "../../../shared/ui/StatusBadge";
import { Table, TBody, TD, TH, THead, TR } from "../../../shared/ui/Table";
import { usePageStateOverride } from "../hooks/usePageStateOverride";
import { usePins } from "../hooks/usePins";
import { useRegions } from "../hooks/useRegions";
import { plural } from "../lib/format";
import { anatomyHref } from "../public";
import {
  BODY_SYSTEMS, PIN_STATUS_LABEL, PIN_TYPE_LABEL, SEVERITY_LABEL, SYSTEM_LABEL,
  type BodySystem, type PinStatus,
} from "../types";
import { PIN_TYPE_ICON } from "./pinMeta";

/** /anatomy/pins — every pin across the crew. */
export function AllPinsPage() {
  const navigate = useNavigate();
  const override = usePageStateOverride();
  const { crew, getCrew } = useCrew();
  const regions = useRegions();
  const pinsQuery = usePins({});
  const [crewFilter, setCrewFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<PinStatus | "">("");
  const [systemFilter, setSystemFilter] = useState<BodySystem | "">("");

  const rows = useMemo(() => {
    const all = override === "empty" ? [] : (pinsQuery.data ?? []);
    return all
      .filter((p) => !crewFilter || p.crewId === crewFilter)
      .filter((p) => !statusFilter || p.status === statusFilter)
      .filter((p) => !systemFilter || regions.index?.byId.get(p.regionId)?.system === systemFilter)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [override, pinsQuery.data, crewFilter, statusFilter, systemFilter, regions.index]);

  const loading = override === "loading" || ((pinsQuery.isLoading || regions.isLoading) && override === null);
  const error = override === "error" ? { message: "Simulated error (?state=error)." } : (pinsQuery.error ?? regions.error);
  const filtered = Boolean(crewFilter || statusFilter || systemFilter);
  const total = override === "empty" ? 0 : (pinsQuery.data?.length ?? 0);

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-5">
      <SectionHeader
        title="All pins"
        subtitle={loading ? "Loading pins…" : `${plural(total, "pin")} across the crew · visible to everyone on this device`}
        actions={<Button icon={ArrowLeft} onClick={() => navigate("/anatomy")}>Back to workspace</Button>}
      />

      <div className="mb-4 grid grid-cols-3 gap-4 lg:max-w-[720px]">
        <Field label="Crew member">
          {(p) => (
            <Select {...p} value={crewFilter} onChange={(e) => setCrewFilter(e.target.value)}>
              <option value="">All crew</option>
              {crew.map((c) => <option key={c.id} value={c.id}>{c.callsign}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Status">
          {(p) => (
            <Select {...p} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as PinStatus | "")}>
              <option value="">All statuses</option>
              {(Object.keys(PIN_STATUS_LABEL) as PinStatus[]).map((s) => <option key={s} value={s}>{PIN_STATUS_LABEL[s]}</option>)}
            </Select>
          )}
        </Field>
        <Field label="System">
          {(p) => (
            <Select {...p} value={systemFilter} onChange={(e) => setSystemFilter(e.target.value as BodySystem | "")}>
              <option value="">All systems</option>
              {BODY_SYSTEMS.map((s) => <option key={s} value={s}>{SYSTEM_LABEL[s]}</option>)}
            </Select>
          )}
        </Field>
      </div>

      {loading ? (
        <SkeletonGroup label="Loading pins" className="flex flex-col gap-2">
          <Skeleton className="h-10" />
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
        </SkeletonGroup>
      ) : error ? (
        <Card>
          <EmptyState
            icon={OctagonAlert}
            title="Pins could not be loaded"
            description={error.message}
            action={<Button onClick={() => { pinsQuery.refetch(); regions.refetch(); }}>Try again</Button>}
          />
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={MapPin}
            title={filtered ? "No pins match these filters" : "No pins yet"}
            description={filtered ? "Change or clear the filters to see more pins." : "Pins added in the workspace appear here for the whole crew."}
            action={
              filtered ? (
                <Button onClick={() => { setCrewFilter(""); setStatusFilter(""); setSystemFilter(""); }}>Clear filters</Button>
              ) : (
                <Button onClick={() => navigate("/anatomy")}>Open workspace</Button>
              )
            }
          />
        </Card>
      ) : (
        <Table caption="All anatomy pins">
          <THead>
            <TH>Crew</TH>
            <TH>Region</TH>
            <TH>Type</TH>
            <TH>Title</TH>
            <TH>Severity</TH>
            <TH>Status</TH>
            <TH numeric>Onset</TH>
            <TH numeric>Updated</TH>
          </THead>
          <TBody>
            {rows.map((pin) => {
              const href = anatomyHref({ crew: pin.crewId, region: pin.regionId, pin: pin.id });
              const Icon = PIN_TYPE_ICON[pin.type];
              return (
                <TR key={pin.id} onClick={() => navigate(href)} className="cursor-pointer">
                  <TD className="font-mono text-sm">{getCrew(pin.crewId)?.callsign ?? pin.crewId}</TD>
                  <TD className="text-sm">{regions.index?.byId.get(pin.regionId)?.name ?? pin.regionId}</TD>
                  <TD className="text-sm text-ink-2">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
                      {PIN_TYPE_LABEL[pin.type]}
                    </span>
                  </TD>
                  <TD className="max-w-[320px]">
                    <Link
                      to={href}
                      onClick={(e) => e.stopPropagation()}
                      className="block truncate text-sm font-medium text-ink hover:text-accent"
                    >
                      {pin.title}
                    </Link>
                  </TD>
                  <TD><StatusBadge level={pin.severity} size="sm">{SEVERITY_LABEL[pin.severity]}</StatusBadge></TD>
                  <TD className="text-sm text-ink-2">{PIN_STATUS_LABEL[pin.status]}</TD>
                  <TD numeric className={`${TYPE.meta} whitespace-nowrap font-normal`}>{formatUtcDateTime(pin.onsetAt)}</TD>
                  <TD numeric className={`${TYPE.meta} whitespace-nowrap font-normal`}>{formatUtcDateTime(pin.updatedAt)}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
      <p className="mt-3 text-xs text-ink-3">Severity is the crew's own label. It is not a diagnosis.</p>
    </div>
  );
}

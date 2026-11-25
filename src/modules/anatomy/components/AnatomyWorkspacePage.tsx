import { List, MapPinPlus, OctagonAlert, PanelRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMediaQuery, WIDE } from "../../../shared/hooks/useMediaQuery";
import { useCrew } from "../../../shared/context/CrewContext";
import { useSystemStatus } from "../../../shared/context/SystemStatusContext";
import { Button } from "../../../shared/ui/Button";
import { Card } from "../../../shared/ui/Card";
import { cn } from "../../../shared/ui/cn";
import { Dialog } from "../../../shared/ui/Dialog";
import { EmptyState } from "../../../shared/ui/EmptyState";
import { SectionHeader } from "../../../shared/ui/SectionHeader";
import { Skeleton, SkeletonGroup } from "../../../shared/ui/Skeleton";
import { StatusBadge } from "../../../shared/ui/StatusBadge";
import { useToast } from "../../../shared/ui/Toast";
import { useAnatomyEvents } from "../hooks/useAnatomyEvents";
import { usePageStateOverride } from "../hooks/usePageStateOverride";
import { usePinMutations } from "../hooks/usePinMutations";
import { usePins } from "../hooks/usePins";
import { useRegionReferences } from "../hooks/useRegionReferences";
import { useRegions } from "../hooks/useRegions";
import { useViewerState } from "../hooks/useViewerState";
import { useWebGLSupport } from "../hooks/useWebGLSupport";
import { plural } from "../lib/format";
import { descendantIds } from "../lib/regionIndex";
import type { AnatomyPin, PinInput, PinPlacement, PinSeverity } from "../types";
import { ExplorerPanel } from "./ExplorerPanel";
import { InspectorPanel, type InspectorTab } from "./InspectorPanel";
import { NotesReferencesTab } from "./NotesReferencesTab";
import { DeletePinDialog, PinDialog } from "./PinDialog";
import { PinsTab } from "./PinsTab";
import { RegionTab } from "./RegionTab";
import { ViewerCard } from "./ViewerCard";

const RANK: Record<PinSeverity, number> = { nominal: 1, caution: 2, critical: 3 };

export function AnatomyWorkspacePage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { crew, activeCrew, setActiveCrewId, getCrew } = useCrew();
  const { status } = useSystemStatus();
  const offline = status?.network.mode === "unreachable";
  const override = usePageStateOverride();
  const wide = useMediaQuery(WIDE);
  const { toast } = useToast();

  const regions = useRegions();
  const index = regions.index;
  const pinsQuery = usePins({ crewId: activeCrew?.id }, Boolean(activeCrew));
  const mutations = usePinMutations();
  const webgl = useWebGLSupport();
  const [state, dispatch] = useViewerState();

  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);
  const [tab, setTab] = useState<InspectorTab>("region");
  const [showResolved, setShowResolved] = useState(false);
  const [activePinId, setActivePinId] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [dialog, setDialog] = useState<{ pin: AnatomyPin | null; placement: PinPlacement | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AnatomyPin | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const pendingRegionPin = useRef<string | null>(null);
  const deepLinkReady = useRef(false);
  /** The ?region= value this page last wrote itself, so only outside links re-select. */
  const lastWrittenRegion = useRef<string | null | undefined>(undefined);

  useAnatomyEvents(dispatch, useCallback((id: string) => Boolean(index?.byId.has(id)), [index]));

  const pins = useMemo(() => (override === "empty" ? [] : (pinsQuery.data ?? [])), [override, pinsQuery.data]);
  const unresolved = useMemo(() => pins.filter((p) => p.status !== "resolved"), [pins]);
  const openCount = unresolved.length;

  // Deep links: ?crew=c03&region=knee_left&pin=p12 (kept stable for other modules).
  useEffect(() => {
    if (!index) return;
    const crewId = params.get("crew");
    const regionId = params.get("region");
    const pinId = params.get("pin");
    const next = new URLSearchParams(params);
    let rewrite = false;
    if (crewId) {
      setActiveCrewId(crewId);
      next.delete("crew");
      rewrite = true;
    }
    if (pinId) {
      setActivePinId(pinId);
      setTab("pins");
      next.delete("pin");
      rewrite = true;
    }
    if (regionId && index.byId.has(regionId) && (crewId || pinId || regionId !== lastWrittenRegion.current)) {
      lastWrittenRegion.current = regionId;
      dispatch({ type: "selectRegion", payload: regionId });
      dispatch({ type: "frameSelection" });
      setTab("pins");
      if (!pinId) pendingRegionPin.current = regionId;
      setInspectorOpen(true);
    }
    deepLinkReady.current = true;
    if (rewrite) setParams(next, { replace: true });
  }, [params, index]); // eslint-disable-line react-hooks/exhaustive-deps

  // With only a region in the link, open its most severe unresolved pin once pins arrive.
  useEffect(() => {
    const regionId = pendingRegionPin.current;
    if (!regionId || !pinsQuery.data || !index) return;
    const ids = new Set(descendantIds(index, regionId));
    const best = pinsQuery.data
      .filter((p) => ids.has(p.regionId) && p.status !== "resolved")
      .sort((a, b) => RANK[b.severity] - RANK[a.severity])[0];
    if (best) setActivePinId(best.id);
    pendingRegionPin.current = null;
  }, [pinsQuery.data, index]);

  // Keep ?region= in step with the selection so the page can be shared or reloaded.
  useEffect(() => {
    if (!deepLinkReady.current) return;
    const current = params.get("region");
    if (current === state.selectedRegionId) return;
    lastWrittenRegion.current = state.selectedRegionId;
    const next = new URLSearchParams(params);
    if (state.selectedRegionId) next.set("region", state.selectedRegionId);
    else next.delete("region");
    setParams(next, { replace: true });
  }, [state.selectedRegionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Forget an open pin that does not belong to the crew member on screen.
  useEffect(() => {
    if (activePinId && pinsQuery.data && !pinsQuery.data.some((p) => p.id === activePinId)) setActivePinId(null);
  }, [activePinId, pinsQuery.data]);

  const selectedRegion = state.selectedRegionId && index ? (index.byId.get(state.selectedRegionId) ?? null) : null;
  const regionName = useCallback((id: string) => index?.byId.get(id)?.name ?? id, [index]);

  const tabPins = useMemo(() => {
    if (!selectedRegion || !index) return pins;
    const ids = new Set(descendantIds(index, selectedRegion.id));
    return pins.filter((p) => ids.has(p.regionId));
  }, [pins, selectedRegion, index]);

  const viewerPins = useMemo(
    () => pins.filter((p) => p.status !== "resolved" || showResolved || p.id === activePinId),
    [pins, showResolved, activePinId],
  );
  const pinnedRegionIds = useMemo(() => new Set(unresolved.map((p) => p.regionId)), [unresolved]);

  const references = useRegionReferences(tab === "notes" ? state.selectedRegionId : null, activeCrew?.id ?? null);

  const selectRegion = useCallback((regionId: string) => {
    dispatch({ type: "selectRegion", payload: regionId });
    setActivePinId(null);
  }, [dispatch]);

  const onPinActivate = useCallback((pin: AnatomyPin) => {
    dispatch({ type: "selectRegion", payload: pin.regionId });
    setActivePinId(pin.id);
    setTab("pins");
    setInspectorOpen(true);
  }, [dispatch]);

  const onPlace = useCallback((placement: PinPlacement) => {
    dispatch({ type: "setPlacingPin", payload: false });
    dispatch({ type: "selectRegion", payload: placement.regionId });
    setDialog({ pin: null, placement });
  }, [dispatch]);

  const startAddPin = () => {
    if (state.placingPin) {
      dispatch({ type: "setPlacingPin", payload: false });
      return;
    }
    setInspectorOpen(false);
    dispatch({ type: "setPlacingPin", payload: true });
  };

  const submitPin = async (input: PinInput) => {
    const editing = dialog?.pin ?? null;
    const saved = editing
      ? await mutations.mutate({ kind: "update", id: editing.id, patch: input })
      : await mutations.mutate({ kind: "create", input });
    if (!saved) return;
    setDialog(null);
    if (saved.crewId !== activeCrew?.id) setActiveCrewId(saved.crewId);
    dispatch({ type: "selectRegion", payload: saved.regionId });
    setActivePinId(saved.id);
    setTab("pins");
    toast({ level: "nominal", title: editing ? "Pin updated" : "Pin saved", description: `${saved.title} · ${regionName(saved.regionId)}` });
  };

  const toggleResolved = async (pin: AnatomyPin) => {
    setPendingId(pin.id);
    try {
      const next = pin.status === "resolved" ? "open" : "resolved";
      await mutations.mutate({ kind: "update", id: pin.id, patch: { status: next } });
      toast({ level: "nominal", title: next === "resolved" ? "Pin resolved" : "Pin reopened", description: pin.title });
    } catch (e) {
      toast({ level: "caution", title: "Not saved", description: e instanceof Object && "message" in e ? String(e.message) : "Try again." });
    } finally {
      setPendingId(null);
    }
  };

  const confirmDelete = async (pin: AnatomyPin) => {
    try {
      await mutations.mutate({ kind: "delete", id: pin.id });
      setDeleteTarget(null);
      if (activePinId === pin.id) setActivePinId(null);
      toast({ level: "standby", title: "Pin deleted", description: pin.title });
    } catch (e) {
      toast({ level: "caution", title: "Not deleted", description: e instanceof Object && "message" in e ? String(e.message) : "Try again." });
    }
  };

  const callsign = activeCrew?.callsign ?? "…";
  const header = (
    <SectionHeader
      title="Anatomy lab"
      subtitle={<>Reference anatomy for <span className="font-mono">{callsign}</span> · {plural(openCount, "open pin")}</>}
      actions={
        <>
          {!wide && index && (
            <Button icon={PanelRight} onClick={() => setInspectorOpen(true)}>
              Inspector
            </Button>
          )}
          <Button icon={List} onClick={() => navigate("/anatomy/pins")}>All pins</Button>
          <Button
            variant="primary"
            icon={MapPinPlus}
            aria-pressed={state.placingPin}
            disabled={offline || !activeCrew || !index || override !== null && override !== "empty"}
            onClick={startAddPin}
          >
            {state.placingPin ? "Cancel placing" : "Add pin"}
          </Button>
        </>
      }
    />
  );

  if (override === "loading" || (regions.isLoading && override !== "error")) {
    return (
      <div className="mx-auto flex h-full max-w-[1600px] flex-col px-6 py-5">
        {header}
        <SkeletonGroup label="Loading anatomy lab" className={cn("grid min-h-[520px] flex-1 gap-4", wide ? "grid-cols-[280px_1fr_360px]" : "grid-cols-[280px_1fr]")}>
          <Skeleton className="h-full rounded-lg" />
          <Skeleton className="h-full rounded-lg" />
          {wide && <Skeleton className="h-full rounded-lg" />}
        </SkeletonGroup>
      </div>
    );
  }

  if (override === "error" || regions.error || !index) {
    return (
      <div className="mx-auto flex h-full max-w-[1600px] flex-col px-6 py-5">
        {header}
        <Card>
          <EmptyState
            icon={OctagonAlert}
            title="The region catalogue could not be loaded"
            description={regions.error?.message ?? "Simulated error (?state=error). Check that the local server is running, then try again."}
            action={<Button onClick={regions.refetch}>Try again</Button>}
          />
        </Card>
      </div>
    );
  }

  const inspector = (bare: boolean) => (
    <InspectorPanel
      bare={bare}
      tab={tab}
      onTabChange={setTab}
      pinCount={tabPins.filter((p) => p.status !== "resolved").length}
      region={
        <RegionTab
          region={selectedRegion}
          index={index}
          isolated={selectedRegion !== null && state.isolated === selectedRegion.system}
          dispatch={dispatch}
          onSelectRegion={selectRegion}
        />
      }
      pins={
        <PinsTab
          pins={tabPins}
          isLoading={pinsQuery.isLoading && !pinsQuery.data && override !== "empty"}
          region={selectedRegion}
          regionName={regionName}
          subject={activeCrew}
          getCrew={getCrew}
          activePinId={activePinId}
          showResolved={showResolved}
          onShowResolvedChange={setShowResolved}
          onEdit={(pin) => setDialog({ pin, placement: null })}
          onToggleResolved={toggleResolved}
          onDelete={setDeleteTarget}
          onOpenRegion={onPinActivate}
          onAddPin={() => (selectedRegion ? setDialog({ pin: null, placement: { regionId: selectedRegion.id } }) : startAddPin())}
          readOnly={offline}
          pendingId={pendingId}
        />
      }
      notes={
        <NotesReferencesTab
          regionName={selectedRegion?.name ?? null}
          data={references.data}
          isLoading={references.isLoading}
          error={references.error}
          onRetry={references.refetch}
        />
      }
    />
  );

  return (
    <div className="mx-auto flex h-full max-w-[1600px] flex-col px-6 py-5">
      {header}
      {offline && (
        <div role="status" className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-caution-line bg-caution-tint px-4 py-2">
          <StatusBadge level="caution">Local server unreachable</StatusBadge>
          <span className="text-sm text-ink-2">Showing the last loaded data. Pins can't be added or changed until the server is back.</span>
        </div>
      )}
      {pinsQuery.error && (
        <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-critical-line bg-critical-tint px-4 py-2">
          <StatusBadge level="critical">Pins not loaded</StatusBadge>
          <span className="text-sm text-ink-2">{pinsQuery.error.message}</span>
          <Button size="sm" className="ml-auto" onClick={pinsQuery.refetch}>Try again</Button>
        </div>
      )}
      <div className={cn("grid min-h-[520px] flex-1 gap-4", wide ? "grid-cols-[280px_minmax(0,1fr)_360px]" : "grid-cols-[280px_minmax(0,1fr)]")}>
        <ExplorerPanel
          index={index}
          state={state}
          dispatch={dispatch}
          pins={unresolved}
          onSelectRegion={selectRegion}
          onHoverRegion={setHoveredRegionId}
        />
        <ViewerCard
          index={index}
          state={state}
          dispatch={dispatch}
          webgl={webgl}
          pins={viewerPins}
          pinnedRegionIds={pinnedRegionIds}
          hoveredRegionId={hoveredRegionId}
          activePinId={activePinId}
          onHoverRegion={setHoveredRegionId}
          onSelectRegion={selectRegion}
          onPlace={onPlace}
          onPinActivate={onPinActivate}
          compact={!wide}
        />
        {wide && inspector(false)}
      </div>

      {!wide && (
        <Dialog
          open={inspectorOpen && !state.placingPin && !dialog}
          onClose={() => setInspectorOpen(false)}
          placement="right"
          title={selectedRegion?.name ?? "Inspector"}
          bodyClassName="p-0 flex flex-col"
        >
          {inspector(true)}
        </Dialog>
      )}

      <PinDialog
        open={dialog !== null}
        onClose={() => { setDialog(null); mutations.reset(); }}
        pin={dialog?.pin ?? null}
        placement={dialog?.placement ?? null}
        index={index}
        crew={crew}
        activeCrewId={activeCrew?.id ?? null}
        authorId={activeCrew?.id ?? null}
        onSubmit={submitPin}
        isPending={mutations.isPending}
        error={mutations.error}
        offline={offline}
      />
      <DeletePinDialog
        pin={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        isPending={mutations.isPending}
      />
    </div>
  );
}

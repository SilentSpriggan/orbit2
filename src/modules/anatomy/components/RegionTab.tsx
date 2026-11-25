import { EyeOff, Focus, Layers, MousePointerClick } from "lucide-react";
import type { Dispatch } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../../shared/ui/Button";
import { TYPE } from "../../../shared/ui/cn";
import { EmptyState } from "../../../shared/ui/EmptyState";
import type { ViewerAction } from "../hooks/useViewerState";
import type { RegionIndex } from "../lib/regionIndex";
import { SYSTEM_LABEL, type AnatomyRegion } from "../types";
import { SystemBadge } from "./SystemBadge";

const SIDE_LABEL = { left: "Left side", right: "Right side", midline: "Midline" } as const;

export interface RegionTabProps {
  region: AnatomyRegion | null;
  index: RegionIndex;
  isolated: boolean;
  dispatch: Dispatch<ViewerAction>;
  onSelectRegion: (regionId: string) => void;
}

export function RegionTab({ region, index, isolated, dispatch, onSelectRegion }: RegionTabProps) {
  if (!region) {
    return (
      <EmptyState
        icon={MousePointerClick}
        title="No region selected"
        description="Tap a structure in the viewer, or choose one from the region tree or search."
      />
    );
  }
  const parent = region.parentId ? index.byId.get(region.parentId) : null;
  const children = index.children.get(region.id) ?? [];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h3 className={TYPE.sectionTitle}>{region.name}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <SystemBadge system={region.system} />
          {region.side && <span className="text-xs text-ink-2">{SIDE_LABEL[region.side]}</span>}
          <span className="font-mono text-xs text-ink-3">{region.id}</span>
        </div>
        {parent && (
          <p className="text-xs text-ink-2">
            Part of{" "}
            <button type="button" onClick={() => onSelectRegion(parent.id)} className="min-h-6 font-medium text-accent hover:text-accent-hover">
              {parent.name}
            </button>
          </p>
        )}
      </div>

      <p className="max-w-[72ch] text-base text-ink">{region.description}</p>

      {region.considerations && region.considerations.length > 0 && (
        <section aria-labelledby="region-considerations" className="flex flex-col gap-2">
          <h4 id="region-considerations" className={TYPE.overline}>Spaceflight considerations</h4>
          <ol className="flex flex-col gap-2">
            {region.considerations.map((c, i) => (
              <li key={`${c.evidenceRef.documentId}-${i}`} className="text-sm text-ink-2">
                {c.text}{" "}
                <Link
                  to={`/evidence?doc=${encodeURIComponent(c.evidenceRef.documentId)}&chunk=${encodeURIComponent(c.evidenceRef.chunkId)}`}
                  aria-label={`Source ${i + 1}: open in Evidence library`}
                  className={`${TYPE.citation} hover:text-accent-hover`}
                >
                  [{i + 1}]
                </Link>
              </li>
            ))}
          </ol>
          <p className="text-xs text-ink-3">Summaries of Evidence library sources. Not medical advice.</p>
        </section>
      )}

      {children.length > 0 && (
        <section aria-labelledby="region-children" className="flex flex-col gap-1">
          <h4 id="region-children" className={TYPE.overline}>Structures</h4>
          <ul className="flex flex-wrap gap-1">
            {children.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => onSelectRegion(c.id)} className="h-11 rounded-md px-2 text-sm text-accent hover:bg-raised hover:text-accent-hover">
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          icon={Layers}
          aria-pressed={isolated}
          onClick={() => dispatch({ type: "isolate", payload: isolated ? null : region.system })}
          title={`Isolate the ${SYSTEM_LABEL[region.system].toLowerCase()} system`}
        >
          {isolated ? "Show all" : "Isolate"}
        </Button>
        <Button icon={EyeOff} onClick={() => { dispatch({ type: "hideRegion", payload: region.id }); dispatch({ type: "selectRegion", payload: null }); }}>
          Hide
        </Button>
        <Button icon={Focus} onClick={() => dispatch({ type: "frameSelection" })}>
          Frame
        </Button>
      </div>
    </div>
  );
}

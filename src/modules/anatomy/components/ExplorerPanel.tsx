import type { Dispatch } from "react";
import { Card } from "../../../shared/ui/Card";
import type { ViewerAction, ViewerStore } from "../hooks/useViewerState";
import type { RegionIndex } from "../lib/regionIndex";
import type { AnatomyPin } from "../types";
import { LayerList } from "./LayerList";
import { RegionTree } from "./RegionTree";
import { StructureSearch } from "./StructureSearch";

export interface ExplorerPanelProps {
  index: RegionIndex;
  state: ViewerStore;
  dispatch: Dispatch<ViewerAction>;
  pins: AnatomyPin[];
  onSelectRegion: (regionId: string) => void;
  onHoverRegion: (regionId: string | null) => void;
}

/** Left column: search, system layers and the region tree. */
export function ExplorerPanel({ index, state, dispatch, pins, onSelectRegion, onHoverRegion }: ExplorerPanelProps) {
  return (
    <Card aria-label="Explorer" className="flex min-h-0 flex-col overflow-hidden">
      <div className="border-b border-line p-4">
        <StructureSearch regions={index.list} onSelect={(r) => onSelectRegion(r.id)} onHover={onHoverRegion} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
        <LayerList state={state} dispatch={dispatch} />
        <RegionTree
          index={index}
          selectedId={state.selectedRegionId}
          onSelect={onSelectRegion}
          onHover={onHoverRegion}
          pins={pins}
        />
      </div>
    </Card>
  );
}

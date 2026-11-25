import type { ReactNode } from "react";
import { Card } from "../../../shared/ui/Card";
import { Tabs } from "../../../shared/ui/Tabs";

export type InspectorTab = "region" | "pins" | "notes";

export interface InspectorPanelProps {
  tab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  pinCount: number;
  region: ReactNode;
  pins: ReactNode;
  notes: ReactNode;
  /** Inside the slide-over sheet the card chrome is dropped. */
  bare?: boolean;
}

/** Right column: Region · Pins · Notes & references. */
export function InspectorPanel({ tab, onTabChange, pinCount, region, pins, notes, bare = false }: InspectorPanelProps) {
  const body = (
    <Tabs<InspectorTab>
      label="Inspector"
      value={tab}
      onChange={onTabChange}
      items={[
        { value: "region", label: "Region" },
        {
          value: "pins",
          label: (
            <span className="inline-flex items-center gap-1.5">
              Pins
              {pinCount > 0 && <span className="rounded-sm bg-raised px-1.5 font-mono text-2xs text-ink-2">{pinCount}</span>}
            </span>
          ),
        },
        { value: "notes", label: "Notes & references" },
      ]}
      className="flex min-h-0 flex-1 flex-col [&>[role=tablist]]:shrink-0 [&>[role=tablist]]:px-3"
    >
      {(active, panelProps) => (
        <div {...panelProps} className="min-h-0 flex-1 overflow-y-auto p-4 focus-visible:outline-offset-[-2px]">
          {active === "region" ? region : active === "pins" ? pins : notes}
        </div>
      )}
    </Tabs>
  );
  if (bare) return <div className="flex h-full min-h-0 flex-col">{body}</div>;
  return (
    <Card aria-label="Inspector" className="flex min-h-0 min-w-0 flex-col overflow-hidden">
      {body}
    </Card>
  );
}

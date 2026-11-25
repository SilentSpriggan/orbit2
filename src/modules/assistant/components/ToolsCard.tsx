import { useId } from "react";
import { formatUtcTime } from "../../../shared/format";
import { Button } from "../../../shared/ui/Button";
import { Card, CardBody, CardHeader } from "../../../shared/ui/Card";
import { Switch } from "../../../shared/ui/Field";
import { StatusBadge } from "../../../shared/ui/StatusBadge";
import type { SharedContextEntry } from "../hooks/useToolRegistry";
import type { ToolDefinition } from "../tools/definitions";
import { PERMISSION_LEVEL } from "./ToolCallRow";

export interface ToolsCardProps {
  tools: Array<ToolDefinition & { enabled: boolean }>;
  onToggle: (name: string, on: boolean) => void;
  shared: SharedContextEntry[];
  onClearShared: () => void;
}

function ToolItem({ tool, onToggle }: { tool: ToolDefinition & { enabled: boolean }; onToggle: (on: boolean) => void }) {
  const descId = useId();
  return (
    <li className="flex items-start gap-3 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-medium text-ink break-all">{tool.name}</span>
          <StatusBadge level={PERMISSION_LEVEL[tool.permission]} size="sm">
            {tool.permission}
          </StatusBadge>
        </div>
        <p id={descId} className="text-sm text-ink-2">
          {tool.description}
        </p>
      </div>
      <Switch checked={tool.enabled} onChange={onToggle} label={`Allow ${tool.name}`} describedBy={descId} />
    </li>
  );
}

export function ToolsCard({ tools, onToggle, shared, onClearShared }: ToolsCardProps) {
  return (
    <Card aria-labelledby="tools-title">
      <CardHeader title="Tools" titleId="tools-title" />
      <CardBody className="flex flex-col gap-3 py-2">
        <ul className="divide-y divide-line">
          {tools.map((t) => (
            <ToolItem key={t.name} tool={t} onToggle={(on) => onToggle(t.name, on)} />
          ))}
        </ul>
        <p className="text-xs text-ink-3">
          Write and share tools always wait for a person. The model cannot confirm its own requests.
        </p>
        {shared.length > 0 && (
          <div className="flex flex-col gap-2 rounded-md border border-line bg-sunken p-3">
            <span className="font-mono text-2xs font-medium uppercase tracking-[0.08em] text-ink-3">Shared in this session</span>
            <ul className="flex flex-col gap-1">
              {shared.map((s) => (
                <li key={`${s.crewId}-${s.sharedAt}`} className="text-xs text-ink-2">
                  <span className="font-mono text-ink">{s.callsign}</span> · {s.sections.join(", ").replace(/_/g, " ")} ·{" "}
                  <span className="font-mono text-ink-3">{formatUtcTime(s.sharedAt)}</span>
                </li>
              ))}
            </ul>
            <div>
              <Button size="sm" variant="secondary" onClick={onClearShared}>
                Remove shared context
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

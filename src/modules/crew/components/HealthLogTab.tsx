import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useCrew } from "../../../shared/context/CrewContext";
import {
  Button,
  Card,
  Dialog,
  Field,
  IconButton,
  Input,
  Select,
  useToast,
} from "../../../shared/ui";
import { useDeleteReading } from "../hooks/useCrewHealth";
import { KINDS, METRICS, stamp } from "../logic/metrics";
import { WELLBEING_KINDS, type VitalReading } from "../types";
export function HealthLogTab({
  readings,
  wellbeing,
}: {
  readings: VitalReading[];
  wellbeing: boolean;
}) {
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<VitalReading | null>(null);
  const remove = useDeleteReading();
  const { getCrew } = useCrew();
  const { toast } = useToast();
  const rows = readings.filter(
    (r) =>
      (wellbeing || !WELLBEING_KINDS.includes(r.kind)) &&
      (!filter || r.kind === filter) &&
      `${r.note ?? ""} ${METRICS[r.kind].label} ${r.source} ${r.value}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <Field label="Metric">
          {(p) => (
            <Select
              {...p}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="">All visible metrics</option>
              {KINDS.filter(
                (k) => wellbeing || !WELLBEING_KINDS.includes(k),
              ).map((k) => (
                <option key={k} value={k}>
                  {METRICS[k].label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Search health log">
          {(p) => (
            <Input
              {...p}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes, source or value"
            />
          )}
        </Field>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-raised text-xs text-ink-2">
            <tr>
              {[
                "Time (UTC)",
                "Metric",
                "Value",
                "Source / entered by",
                "Note",
                "",
              ].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line hover:bg-raised">
                <td className="p-3 font-mono text-xs whitespace-nowrap">
                  {stamp(r.recordedAt)}
                </td>
                <td className="p-3">{METRICS[r.kind].label}</td>
                <td className="p-3 font-mono whitespace-nowrap">
                  {r.value} <span className="text-ink-3">{r.unit}</span>
                </td>
                <td className="p-3 text-xs text-ink-2">
                  {r.source}
                  <br />
                  {getCrew(r.enteredBy)?.callsign ?? r.enteredBy}
                </td>
                <td className="p-3 text-xs text-ink-2 max-w-60">
                  {r.note ?? "—"}
                </td>
                <td>
                  <IconButton
                    icon={Trash2}
                    label={`Delete ${METRICS[r.kind].label} ${r.value}`}
                    onClick={() => setPending(r)}
                  />
                </td>
              </tr>
            ))}
            {!wellbeing && (
              <tr>
                <td colSpan={6} className="p-4 text-ink-2">
                  Support check-in suggested
                </td>
              </tr>
            )}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-ink-2">
                  No entries match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
      <Dialog
        open={!!pending}
        title="Delete reading?"
        onClose={() => !remove.isPending && setPending(null)}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setPending(null)}
              disabled={remove.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={remove.isPending}
              onClick={async () => {
                if (!pending) return;
                try {
                  await remove.mutate({
                    id: pending.crewId,
                    readingId: pending.id,
                  });
                  setPending(null);
                  toast({ title: "Reading deleted" });
                } catch {
                  /* visible error */
                }
              }}
            >
              Delete reading
            </Button>
          </>
        }
      >
        <p>
          {pending &&
            `Delete ${METRICS[pending.kind].label.toLowerCase()} ${pending.value} ${pending.unit} logged ${stamp(pending.recordedAt)}?`}
        </p>
        <p className="mt-3 text-ink-2 text-sm">This cannot be undone.</p>
        {remove.error && (
          <p role="alert" className="text-critical mt-3">
            {remove.error.message}
          </p>
        )}
      </Dialog>
    </>
  );
}

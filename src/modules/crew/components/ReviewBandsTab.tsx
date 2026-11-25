import { useState } from "react";
import { useCrew } from "../../../shared/context/CrewContext";
import {
  Button,
  Card,
  Input,
  ProductRuleNote,
  useToast,
} from "../../../shared/ui";
import { useUpdateBands } from "../hooks/useCrewHealth";
import { defaultBands } from "../mocks/store";
import { METRICS } from "../logic/metrics";
import { WELLBEING_KINDS, type ReviewBand } from "../types";
export function ReviewBandsTab({
  id,
  bands,
  wellbeing,
}: {
  id: string;
  bands: ReviewBand[];
  wellbeing: boolean;
}) {
  const [draft, setDraft] = useState(() => structuredClone(bands));
  const { activeCrew } = useCrew();
  const allowed = !!(activeCrew?.isCrewLeader || activeCrew?.isMedicalOfficer);
  const save = useUpdateBands();
  const { toast } = useToast();
  const invalid = draft.some(
    (b) =>
      (b.min !== null && b.max !== null && b.min >= b.max) ||
      b.consecutiveBeforeAlert < 1 ||
      !Number.isInteger(b.consecutiveBeforeAlert) ||
      (b.expectedIntervalHours !== null && b.expectedIntervalHours <= 0),
  );
  return (
    <Card className="p-5">
      <h2 className="text-md font-semibold">Crew review bands</h2>
      <p className="text-sm text-ink-2 max-w-[72ch] mt-2 mb-4">
        Review bands are set by your crew medical officer. They are product
        rules, not clinical thresholds, and never replace urgent symptom checks.
      </p>
      <ProductRuleNote />
      {!allowed && (
        <p className="text-sm text-ink-2 my-4">
          Read only. Only the crew leader or medical officer can edit review
          bands.
        </p>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!allowed || invalid) return;
          try {
            await save.mutate({
              id,
              bands: draft.map((b) => ({
                ...b,
                updatedBy: activeCrew!.id,
                updatedAt: new Date().toISOString(),
              })),
            });
            toast({ title: "Review bands saved" });
          } catch {
            /* visible */
          }
        }}
      >
        <div className="overflow-x-auto mt-4">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-ink-2 text-left">
                {[
                  "Metric",
                  "Min",
                  "Max",
                  "Readings before alert",
                  "Expected interval (h)",
                ].map((h) => (
                  <th key={h} className="py-3 px-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {draft
                .filter((b) => wellbeing || !WELLBEING_KINDS.includes(b.kind))
                .map((b) => (
                  <tr key={b.kind} className="border-t border-line">
                    <td className="py-3 pr-4 text-sm">
                      {METRICS[b.kind].label}
                      <span className="block text-xs font-mono text-ink-3">
                        {METRICS[b.kind].unit}
                      </span>
                    </td>
                    {(
                      [
                        "min",
                        "max",
                        "consecutiveBeforeAlert",
                        "expectedIntervalHours",
                      ] as const
                    ).map((field) => (
                      <td key={field} className="p-2">
                        <Input
                          aria-label={`${METRICS[b.kind].label} ${field}`}
                          type="number"
                          step={field === "consecutiveBeforeAlert" ? 1 : "any"}
                          min={
                            field === "consecutiveBeforeAlert"
                              ? 1
                              : field === "expectedIntervalHours"
                                ? 0.1
                                : undefined
                          }
                          required={field === "consecutiveBeforeAlert"}
                          disabled={!allowed || save.isPending}
                          value={b[field] ?? ""}
                          onChange={(e) =>
                            setDraft((prev) =>
                              prev.map((row) =>
                                row.kind === b.kind
                                  ? {
                                      ...row,
                                      [field]:
                                        e.target.value === ""
                                          ? null
                                          : Number(e.target.value),
                                    }
                                  : row,
                              ),
                            )
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-ink-3 mt-4">
          Mission default · product rule. Empty min/max means no bound. Empty
          interval disables stale-reading checks.
        </p>
        {invalid && (
          <p role="alert" className="text-critical mt-3">
            Min must be below max; counts must be positive integers and
            intervals positive.
          </p>
        )}
        {save.error && (
          <p role="alert" className="text-critical mt-3">
            {save.error.message}
          </p>
        )}
        {allowed && (
          <div className="flex justify-end gap-3 mt-5">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setDraft(defaultBands())}
            >
              Reset to mission defaults
            </Button>
            <Button type="submit" disabled={invalid} loading={save.isPending}>
              Save review bands
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}

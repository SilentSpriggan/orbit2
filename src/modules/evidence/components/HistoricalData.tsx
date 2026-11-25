import { useMemo, useState } from "react";
import { Card, Field, Input, Button } from "../../../shared/ui";
import rows from "../data/historical.json";
import wideUrl from "../data/ALL_ASTRONAUT_NUMERICAL_DATA.csv?url";
import longUrl from "../data/ALL_NUMERIC_METRICS_LONG.csv?url";
import { useCopy } from "./common";
export function HistoricalData() {
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(30);
  const copy = useCopy();
  const filtered = useMemo(
    () =>
      rows.filter((r) =>
        Object.values(r).join(" ").toLowerCase().includes(q.toLowerCase()),
      ),
    [q],
  );
  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-3">
        <h2 className="text-md font-semibold">Historical reference data</h2>
        <p className="max-w-[72ch] text-sm text-ink-2">
          User-supplied historical transcription: 40 records and 255 metric
          rows. These are not current crew records or fictional demo papers.
          Original PDFs were not supplied, so the transcriptions have not been
          verified against them. Missing fields remain blank; values are not
          clinical thresholds.
        </p>
        <div className="flex gap-4 flex-wrap">
          <a
            className="text-accent underline min-h-11 inline-flex items-center"
            href={wideUrl}
            download="ALL_ASTRONAUT_NUMERICAL_DATA.csv"
          >
            Download original records CSV
          </a>
          <a
            className="text-accent underline min-h-11 inline-flex items-center"
            href={longUrl}
            download="ALL_NUMERIC_METRICS_LONG.csv"
          >
            Download original metrics CSV
          </a>
        </div>
      </Card>
      <Field label="Search historical records">
        {(p) => (
          <Input
            {...p}
            value={q}
            placeholder="Mission, subject, metric or source PDF"
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(30);
            }}
          />
        )}
      </Field>
      <p className="font-mono text-xs text-ink-3">
        {filtered.length} metric rows
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.slice(0, limit).map((r, i) => (
          <Card
            key={`${r.record_id}-${r.field_name}-${i}`}
            className="p-5 space-y-3"
          >
            <h3 className="text-md font-semibold">
              {r.metric.replaceAll("_", " ")}
            </h3>
            <p>
              <span className="font-mono text-xl">{r.value}</span>
              <span className="font-mono text-xs text-ink-3"> {r.unit}</span>
            </p>
            <p className="text-sm">
              {r.subject || "Subject not specified"} · {r.mission} ·{" "}
              {r.mission_phase}
            </p>
            <p className="text-sm text-ink-2">
              {[
                r.crew_role,
                r.exercise_state,
                r.posture,
                r.relative_time,
                r.record_type,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="font-mono text-xs text-ink-3 break-words">
              {r.record_id} · {r.source_pdf} · p. {r.source_pdf_page || "—"} ·{" "}
              {r.source_table || "Table unspecified"}
            </p>
            {r.quality_notes && (
              <p className="text-xs text-ink-2">
                Quality notes: {r.quality_notes}
              </p>
            )}
            <Button
              variant="ghost"
              onClick={() =>
                void copy(
                  `${r.record_id}: ${r.metric} = ${r.value} ${r.unit}. ${r.mission}, ${r.subject}, ${r.mission_phase}. User-supplied transcription from ${r.source_pdf}, p. ${r.source_pdf_page}, ${r.source_table}. ${r.quality_notes}`,
                )
              }
            >
              Copy source reference
            </Button>
          </Card>
        ))}
      </div>
      {filtered.length === 0 && <p>No matching historical records.</p>}
      {filtered.length > limit && (
        <Button onClick={() => setLimit((v) => v + 30)}>
          Load more records
        </Button>
      )}
    </div>
  );
}

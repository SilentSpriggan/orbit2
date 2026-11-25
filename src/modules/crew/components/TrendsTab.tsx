import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader, ProductRuleNote } from "../../../shared/ui";
import { KINDS, METRICS } from "../logic/metrics";
import { levelFor, trendChange } from "../logic/status";
import {
  WELLBEING_KINDS,
  type VitalKind,
  type VitalReading,
  type ReviewBand,
} from "../types";
export function TrendsTab({
  readings,
  bands,
  wellbeing,
}: {
  readings: VitalReading[];
  bands: ReviewBand[];
  wellbeing: boolean;
}) {
  const [days, setDays] = useState(7);
  const [selected, setSelected] = useState<VitalKind[]>(["heart_rate"]);
  const kinds = KINDS.filter((k) => wellbeing || !WELLBEING_KINDS.includes(k));
  const trend = trendChange(readings, "heart_rate");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div
          className="inline-flex p-1 bg-sunken border border-line rounded-md"
          aria-label="Time range"
        >
          {[1, 7, 14, 30].map((d) => (
            <button
              key={d}
              aria-pressed={days === d}
              onClick={() => setDays(d)}
              className={`min-h-11 px-4 rounded-sm ${days === d ? "bg-raised text-ink" : "text-ink-2"}`}
            >
              {d === 1 ? "24h" : `${d}d`}
            </button>
          ))}
        </div>
        <p className="text-xs text-ink-3">UTC · manual and wearable readings</p>
      </div>
      <div className="flex flex-wrap gap-x-4">
        {kinds.map((k) => (
          <label
            key={k}
            className="flex items-center gap-2 min-h-11 text-sm text-ink-2"
          >
            <input
              type="checkbox"
              className="accent-accent size-4"
              checked={selected.includes(k)}
              onChange={(e) =>
                setSelected((prev) =>
                  e.target.checked ? [...prev, k] : prev.filter((v) => v !== k),
                )
              }
            />
            {METRICS[k].label}
          </label>
        ))}
      </div>
      {selected
        .filter((k) => kinds.includes(k))
        .map((k) => {
          const data = readings
            .filter(
              (r) =>
                r.kind === k &&
                Date.parse(r.recordedAt) >= Date.now() - days * 86400000,
            )
            .toReversed();
          const band = bands.find((b) => b.kind === k);
          return (
            <TrendChart
              key={k}
              kind={k}
              readings={data}
              band={band}
              days={days}
            />
          );
        })}
      {!selected.some((k) => kinds.includes(k)) && (
        <p className="p-5 text-ink-2">Select a metric to see its trend.</p>
      )}
      <Card className="p-5">
        <h3 className="font-semibold mb-2">Resting heart rate change</h3>
        <p className="text-sm text-ink-2">
          {trend?.percent !== null && trend?.percent !== undefined
            ? `Last 7 days vs. the 21 days before: ${trend.percent >= 0 ? "up" : "down"} ${Math.abs(trend.percent).toFixed(1)} % (${trend.sustained ? "sustained" : "not sustained"}).`
            : "Not enough readings to compare these periods."}
        </p>
        <ProductRuleNote className="mt-3" />
      </Card>
    </div>
  );
}
export function TrendChart({
  kind,
  readings,
  band,
  days,
}: {
  kind: VitalKind;
  readings: VitalReading[];
  band?: ReviewBand;
  days: number;
}) {
  const m = METRICS[kind],
    values = readings.map((r) => r.value);
  const outside = readings.filter((r) =>
    ["critical", "caution"].includes(levelFor(r, band)),
  ).length;
  const summary = values.length
    ? `${m.label}, last ${days} days: average ${(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)} ${m.unit}, range ${Math.min(...values)}–${Math.max(...values)}, ${outside} readings outside band.`
    : "No readings in this period.";
  return (
    <Card>
      <CardHeader
        title={m.label}
        actions={<span className="font-mono text-xs text-ink-3">{m.unit}</span>}
      />
      <div className="p-4">
        <p className="text-xs text-ink-2 mb-3">{summary}</p>
        <div
          className="h-56 bg-sunken rounded-md"
          role="img"
          aria-label={summary}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={readings}
              margin={{ top: 20, right: 24, bottom: 4, left: 0 }}
            >
              <CartesianGrid vertical={false} stroke="var(--color-line)" />
              <XAxis
                dataKey="recordedAt"
                tickFormatter={(v) => String(v).slice(5, 10)}
                tick={{
                  fill: "var(--color-ink-3)",
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                }}
                minTickGap={50}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{
                  fill: "var(--color-ink-3)",
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                }}
              />
              {band?.min !== null && band?.max !== null && band && (
                <ReferenceArea
                  y1={band.min!}
                  y2={band.max!}
                  fill="var(--color-nominal-tint)"
                  fillOpacity={0.6}
                  ifOverflow="extendDomain"
                />
              )}
              <Tooltip
                contentStyle={{
                  background: "var(--color-overlay)",
                  border: "1px solid var(--color-line-strong)",
                  borderRadius: 6,
                  color: "var(--color-ink)",
                }}
                labelFormatter={(v) =>
                  String(v).replace("T", " ").slice(0, 16) + "Z"
                }
              />
              <Line
                name={`${m.label} (${m.unit})`}
                dataKey="value"
                stroke="var(--color-series-1)"
                strokeWidth={2}
                isAnimationActive={false}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  const level = levelFor(payload as VitalReading, band);
                  return level === "critical" || level === "caution" ? (
                    <path
                      key={props.key}
                      d={`M ${cx} ${cy! - 5} l 5 9 h -10 Z`}
                      fill={`var(--color-${level})`}
                    />
                  ) : (
                    <circle
                      key={props.key}
                      cx={cx}
                      cy={cy}
                      r={2}
                      fill="var(--color-series-1)"
                    />
                  );
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <ProductRuleNote className="mt-3" />
      </div>
    </Card>
  );
}

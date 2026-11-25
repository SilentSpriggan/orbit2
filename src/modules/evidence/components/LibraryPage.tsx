import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { Button, Card, Field, Input, Select, Switch } from "../../../shared/ui";
import { useSystemStatus } from "../../../shared/context/SystemStatusContext";
import { MOCK_MODE } from "../../../shared/api/mockMode";
import { useFacets, usePageState, useSearch } from "../hooks/useEvidence";
import { emptyParams, LABELS, TYPES } from "../mocks/data";
import type { Facets, SearchHit, SearchParams } from "../types";
import {
  citationText,
  EvidenceLabelBadge,
  HighlightedText,
  passageUrl,
  ReadState,
  useCopy,
} from "./common";
import { AskPanel } from "./AskPanel";
import { HistoricalData } from "./HistoricalData";

export function FilterPanel({
  params,
  onChange,
  facets,
}: {
  params: SearchParams;
  onChange: (p: SearchParams) => void;
  facets: Facets | null;
}) {
  const groups = [
    { key: "labels", name: "Evidence label", labels: LABELS },
    { key: "systems", name: "Body system", labels: {} },
    { key: "types", name: "Source type", labels: TYPES },
    { key: "topics", name: "Topic tags", labels: {} },
  ] as const;
  return (
    <Card className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-md font-semibold">Filters</h2>
        <Button
          variant="ghost"
          onClick={() =>
            onChange({ ...emptyParams, q: params.q, mode: params.mode })
          }
        >
          Clear
        </Button>
      </div>
      {groups.map((g) => (
        <fieldset key={g.key}>
          <legend className="font-mono text-2xs uppercase tracking-[0.08em] text-ink-3 mb-2">
            {g.name}
          </legend>
          {Object.entries(facets?.[g.key] ?? {}).map(([value, count]) => (
            <label
              key={value}
              className="flex min-h-11 items-center gap-2 text-sm cursor-pointer"
            >
              <input
                type="checkbox"
                checked={params[g.key].includes(value)}
                onChange={(e) =>
                  onChange({
                    ...params,
                    [g.key]: e.target.checked
                      ? [...params[g.key], value]
                      : params[g.key].filter((v) => v !== value),
                  })
                }
                className="size-4 shrink-0 accent-accent"
              />
              <span className="flex-1">
                {(g.labels as Record<string, string>)[value] ??
                  value.replaceAll("_", " ")}
              </span>
              <span className="font-mono text-xs text-ink-3">{count}</span>
            </label>
          ))}
        </fieldset>
      ))}
      <div className="grid grid-cols-2 gap-2">
        <Field label="From year">
          {(p) => (
            <Input
              {...p}
              type="number"
              min="1900"
              max="2100"
              value={params.from}
              onChange={(e) => onChange({ ...params, from: e.target.value })}
            />
          )}
        </Field>
        <Field label="To year">
          {(p) => (
            <Input
              {...p}
              type="number"
              min="1900"
              max="2100"
              value={params.to}
              onChange={(e) => onChange({ ...params, to: e.target.value })}
            />
          )}
        </Field>
      </div>
      <Switch
        label="Has full text"
        showLabel
        checked={params.fullText}
        onChange={(v) => onChange({ ...params, fullText: v })}
      />
    </Card>
  );
}
export function ResultCard({
  hit,
  onCite,
}: {
  hit: SearchHit;
  onCite: (h: SearchHit) => void;
}) {
  const copy = useCopy();
  return (
    <Card className="p-5 space-y-3">
      <EvidenceLabelBadge label={hit.document.evidenceLabel} />
      <h3 className="text-md font-semibold">
        <Link className="hover:text-accent" to={passageUrl(hit)}>
          {hit.document.title}
        </Link>
      </h3>
      <p className="text-xs text-ink-2">
        {hit.document.authors.join(", ")} · {hit.document.venue} ·{" "}
        <span className="font-mono">{hit.document.year ?? "—"}</span>
      </p>
      <p className="line-clamp-3 text-sm leading-6">
        <HighlightedText text={hit.chunk.text} ranges={hit.highlights} />
      </p>
      <p className="font-mono text-2xs text-ink-3 break-words">
        {hit.document.id} · chunk {hit.chunk.id} · p. {hit.chunk.page ?? "—"} ·
        score {hit.score.toFixed(2)}
        {hit.semanticScore !== null &&
          ` · semantic ${hit.semanticScore.toFixed(2)}`}
        {hit.keywordScore !== null &&
          ` · keyword ${hit.keywordScore.toFixed(2)}`}
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          className="inline-flex items-center min-h-11 px-3 rounded-md border border-line-strong text-sm hover:bg-raised"
          to={passageUrl(hit)}
        >
          Open passage
        </Link>
        <Button variant="ghost" onClick={() => onCite(hit)}>
          Cite in Ask
        </Button>
        <Button variant="ghost" onClick={() => void copy(citationText(hit))}>
          Copy citation
        </Button>
      </div>
    </Card>
  );
}
export function SearchModeControl({
  mode,
  onChange,
  disabled,
}: {
  mode: SearchParams["mode"];
  onChange: (v: SearchParams["mode"]) => void;
  disabled: boolean;
}) {
  return (
    <div
      role="group"
      aria-label="Search mode"
      className="inline-flex border border-line rounded-md bg-sunken p-1"
    >
      {(["hybrid", "semantic", "keyword"] as const).map((m) => (
        <button
          key={m}
          disabled={disabled && m !== "keyword"}
          aria-pressed={mode === m}
          className={`min-h-11 px-3 rounded-sm text-sm disabled:text-ink-disabled ${mode === m ? "bg-raised text-ink" : "text-ink-2"}`}
          onClick={() => onChange(m)}
        >
          {m[0].toUpperCase() + m.slice(1)}
        </button>
      ))}
    </div>
  );
}
export function LibraryPage() {
  const [url, setUrl] = useSearchParams();
  const { status } = useSystemStatus();
  const override = usePageState();
  const [params, setParams] = useState<SearchParams>({
    ...emptyParams,
    q: url.get("q") ?? "",
  });
  const [cursor, setCursor] = useState<string | undefined>();
  const [previous, setPrevious] = useState<SearchHit[]>([]);
  const [group, setGroup] = useState(false);
  const [pane, setPane] = useState<"results" | "ask">("results");
  const [cited, setCited] = useState<SearchHit[]>([]);
  const [historical, setHistorical] = useState(false);
  const indexMissing =
    status?.faiss.state !== "ready" ||
    (import.meta.env.DEV && url.get("index") === "missing");
  const effective = {
    ...params,
    q: url.get("q") ?? "",
    mode: indexMissing ? ("keyword" as const) : params.mode,
    cursor,
  };
  const result = useSearch(effective);
  const facets = useFacets();
  useEffect(() => {
    setCursor(undefined);
    setPrevious([]);
  }, [url, indexMissing]);
  const change = (next: SearchParams) => {
    setParams(next);
    setCursor(undefined);
    setPrevious([]);
    const u = new URLSearchParams(url);
    if (next.q) u.set("q", next.q);
    else u.delete("q");
    setUrl(u, { replace: true });
  };
  const hits = [...previous, ...(result.data?.hits ?? [])];
  const unique = hits.filter(
    (h, i) => hits.findIndex((v) => v.chunk.id === h.chunk.id) === i,
  );
  const cite = (hit: SearchHit) => {
    setCited((old) =>
      old.some((h) => h.chunk.id === hit.chunk.id) ? old : [...old, hit],
    );
    setPane("ask");
  };
  const blocked =
    override === "loading" ||
    override === "error" ||
    override === "empty" ||
    (result.isLoading && !cursor) ||
    !!result.error;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-sm text-ink-2">
          {MOCK_MODE
            ? "24 fictional documents · 192 passages · demo search scores"
            : "Search the local research collection"}
        </p>
        <Button variant="secondary" onClick={() => setHistorical((v) => !v)}>
          {historical ? "Return to library" : "Historical reference data"}
        </Button>
      </div>
      {historical ? (
        <HistoricalData />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] min-[1600px]:grid-cols-[260px_minmax(0,1fr)] gap-4 items-start">
          <aside>
            <FilterPanel
              params={effective}
              onChange={change}
              facets={facets.data}
            />
            {facets.error && (
              <p role="alert" className="text-caution text-sm mt-2">
                Filters unavailable.{" "}
                <button onClick={facets.refetch} className="underline min-h-11">
                  Retry
                </button>
              </p>
            )}
          </aside>
          <section className="min-w-0 grid grid-cols-1 min-[1280px]:grid-cols-[minmax(0,1fr)_360px] min-[1600px]:grid-cols-[minmax(0,1fr)_420px] gap-4 items-start">
            <div className="min-w-0 space-y-4">
              <div
                className="min-[1280px]:hidden flex gap-2"
                role="group"
                aria-label="Library view"
              >
                <Button
                  aria-pressed={pane === "results"}
                  onClick={() => setPane("results")}
                >
                  Search results
                </Button>
                <Button
                  aria-pressed={pane === "ask"}
                  onClick={() => setPane("ask")}
                >
                  Ask the library
                </Button>
              </div>
              <div
                className={
                  pane === "ask"
                    ? "hidden min-[1280px]:block space-y-4"
                    : "space-y-4"
                }
              >
                <Field label="Search the library">
                  {(p) => (
                    <div className="relative">
                      <Search
                        className="absolute left-3 top-4 text-ink-3"
                        size={16}
                        aria-hidden="true"
                      />
                      <Input
                        {...p}
                        className="h-12 pl-10"
                        placeholder="Search the library — e.g. bone loss"
                        value={effective.q}
                        onChange={(e) =>
                          change({ ...params, q: e.target.value })
                        }
                      />
                    </div>
                  )}
                </Field>
                <div className="flex flex-wrap gap-3 items-end">
                  <SearchModeControl
                    mode={effective.mode}
                    disabled={indexMissing}
                    onChange={(mode) =>
                      change({ ...params, q: effective.q, mode })
                    }
                  />
                  <Field label="Sort">
                    {(p) => (
                      <Select
                        {...p}
                        value={params.sort}
                        onChange={(e) =>
                          change({
                            ...params,
                            q: effective.q,
                            sort: e.target.value as SearchParams["sort"],
                          })
                        }
                      >
                        <option value="relevance">Relevance</option>
                        <option value="newest">Newest</option>
                      </Select>
                    )}
                  </Field>
                </div>
                {indexMissing && (
                  <p className="text-sm text-ink-2">
                    Semantic index unavailable or rebuilding. Keyword search
                    remains available.
                  </p>
                )}
                <Switch
                  label="Group by document"
                  showLabel
                  checked={group}
                  onChange={setGroup}
                />
                {result.data && (
                  <p role="status" className="font-mono text-xs text-ink-3">
                    {result.data.total} passages in {result.data.tookMs} ms ·{" "}
                    {result.data.mode}
                  </p>
                )}
                <ReadState
                  loading={
                    override === "loading" || (result.isLoading && !cursor)
                  }
                  error={
                    override === "error"
                      ? "Demo error: local library unavailable."
                      : result.error?.message
                  }
                  empty={
                    override === "empty" || (!blocked && unique.length === 0)
                  }
                  retry={result.refetch}
                />
                {!blocked &&
                  (group
                    ? Array.from(new Set(unique.map((h) => h.document.id))).map(
                        (id) => {
                          const grouped = unique.filter(
                            (h) => h.document.id === id,
                          );
                          return (
                            <details
                              key={id}
                              className="rounded-lg border border-line bg-panel"
                            >
                              <summary className="p-4 cursor-pointer min-h-11">
                                {grouped[0].document.title}{" "}
                                <span className="font-mono text-xs text-ink-3">
                                  ({grouped.length} loaded passages)
                                </span>
                              </summary>
                              <div className="p-3 space-y-3">
                                {grouped.map((h) => (
                                  <ResultCard
                                    key={h.chunk.id}
                                    hit={h}
                                    onCite={cite}
                                  />
                                ))}
                              </div>
                            </details>
                          );
                        },
                      )
                    : unique.map((hit) => (
                        <ResultCard
                          key={hit.chunk.id}
                          hit={hit}
                          onCite={cite}
                        />
                      )))}
                {!blocked && result.data?.nextCursor && (
                  <Button
                    loading={result.isLoading}
                    onClick={() => {
                      setPrevious(unique);
                      setCursor(result.data?.nextCursor ?? undefined);
                    }}
                  >
                    Load more
                  </Button>
                )}
              </div>
            </div>
            <aside
              className={`${pane === "ask" ? "block" : "hidden"} min-[1280px]:block sticky top-0 min-w-0`}
            >
              <AskPanel
                params={effective}
                cited={cited}
                clearCited={() => setCited([])}
              />
            </aside>
          </section>
        </div>
      )}
    </>
  );
}

import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button, Card } from "../../../shared/ui";
import { useChunks, useDocument, usePageState } from "../hooks/useEvidence";
import {
  citationText,
  EvidenceLabelBadge,
  ReadState,
  useCopy,
  utc,
} from "./common";
export function DocumentViewerPage({ documentId }: { documentId?: string }) {
  const route = useParams();
  const [query, setQuery] = useSearchParams();
  const id = documentId ?? route.documentId ?? "";
  const doc = useDocument(id);
  const chunks = useChunks(id);
  const state = usePageState();
  const selected = query.get("chunk");
  const [pdf, setPdf] = useState(false);
  const copy = useCopy();
  const focus = (chunkId: string) => {
    const next = new URLSearchParams(query);
    next.set("chunk", chunkId);
    setQuery(next, { replace: true });
  };
  useEffect(() => {
    if (!chunks.data || !selected) return;
    const element = document.getElementById(`passage-${selected}`);
    element?.scrollIntoView({ block: "center", behavior: "instant" });
    element?.focus({ preventScroll: true });
  }, [chunks.data, selected]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest(
          'input,textarea,select,[contenteditable="true"],iframe,[role="dialog"]',
        ) ||
        e.altKey ||
        e.metaKey ||
        e.ctrlKey
      )
        return;
      if ((e.key !== "[" && e.key !== "]") || !chunks.data?.length) return;
      e.preventDefault();
      const index = chunks.data.findIndex((c) => c.id === selected);
      const next = Math.max(
        0,
        Math.min(chunks.data.length - 1, index + (e.key === "]" ? 1 : -1)),
      );
      const p = new URLSearchParams(query);
      p.set("chunk", chunks.data[next].id);
      setQuery(p, { replace: true });
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [chunks.data, selected, query, setQuery]);
  if (state || doc.isLoading || chunks.isLoading || doc.error || chunks.error)
    return (
      <ReadState
        loading={state === "loading" || doc.isLoading || chunks.isLoading}
        error={
          state === "error"
            ? "Demo error: document unavailable."
            : (doc.error?.message ?? chunks.error?.message)
        }
        empty={state === "empty"}
        retry={() => {
          doc.refetch();
          chunks.refetch();
        }}
      />
    );
  if (!doc.data) return <ReadState empty />;
  const d = doc.data;
  return (
    <div className="space-y-5">
      <Link
        className="inline-flex min-h-11 items-center text-accent"
        to="/evidence"
      >
        ← Back to library
      </Link>
      <Card className="p-5 space-y-3">
        <EvidenceLabelBadge label={d.evidenceLabel} />
        <h2 className="text-xl font-semibold">{d.title}</h2>
        <p className="text-sm text-ink-2">
          {d.authors.join(", ")} · {d.venue ?? "Venue unknown"} ·{" "}
          <span className="font-mono">{d.year ?? "—"}</span>
        </p>
        <p className="text-xs text-ink-2">
          License: {d.license ?? "Not specified"} · Added{" "}
          <span className="font-mono">{utc(d.addedAt)}</span> · Import source:
          local document collection
        </p>
        {d.doi && (
          <div className="font-mono text-xs break-all">
            DOI: {d.doi}{" "}
            <Button variant="ghost" onClick={() => void copy(d.doi!)}>
              Copy DOI
            </Button>
          </div>
        )}
        {d.url && (
          <div className="space-y-2">
            <p className="font-mono text-xs break-all">{d.url}</p>
            <Button onClick={() => void copy(d.url!)}>Copy URL</Button>
            {/^https?:\/\//i.test(d.url) && (
              <a
                className="inline-flex min-h-11 items-center text-accent ml-3 underline"
                target="_blank"
                rel="noopener noreferrer"
                href={d.url}
              >
                Opens outside the local network
              </a>
            )}
          </div>
        )}
        {d.hasOriginalPdf ? (
          <Button onClick={() => setPdf((v) => !v)}>
            {pdf ? "Read extracted text" : "View original PDF"}
          </Button>
        ) : (
          <p className="text-sm text-ink-3">
            Original file not stored on this device
          </p>
        )}
      </Card>
      {selected && !chunks.data?.some((c) => c.id === selected) && (
        <p role="alert" className="text-caution">
          The linked passage was not found in this document. Choose a passage
          below.
        </p>
      )}
      {pdf ? (
        <iframe
          title={`Original PDF: ${d.title}`}
          src={`/api/evidence/documents/${encodeURIComponent(id)}/original`}
          className="w-full h-[70vh] border border-line rounded-lg"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] gap-6">
          <nav aria-label="Document outline" className="space-y-3">
            <p className="font-mono text-2xs text-ink-3 uppercase tracking-[0.08em]">
              Document outline
            </p>
            {Array.from(new Set(chunks.data?.map((c) => c.section))).map(
              (section) => (
                <div key={section ?? "none"}>
                  <h3 className="text-sm font-semibold py-2">
                    {section ?? "Unsectioned"}
                  </h3>
                  {chunks.data
                    ?.filter((c) => c.section === section)
                    .map((c) => (
                      <button
                        key={c.id}
                        className={`w-full text-left min-h-11 px-3 font-mono text-xs rounded-md ${selected === c.id ? "bg-accent-tint text-accent" : "text-ink-2 hover:bg-raised"}`}
                        onClick={() => focus(c.id)}
                      >
                        {c.id} · p. {c.page ?? "—"}
                      </button>
                    ))}
                </div>
              ),
            )}
            <p className="text-xs text-ink-3">
              Use [ and ] for previous / next passage.
            </p>
          </nav>
          <article className="max-w-[72ch] min-w-0 space-y-5">
            {chunks.data?.map((c) => (
              <section
                key={c.id}
                id={`passage-${c.id}`}
                tabIndex={-1}
                aria-label={`Passage ${c.id}, page ${c.page ?? "unknown"}`}
                className={`p-5 rounded-md ${selected === c.id ? "bg-accent-tint ring-1 ring-accent" : "bg-panel border border-line"}`}
              >
                <div className="flex justify-between gap-3 items-center mb-3">
                  <span className="font-mono text-xs text-ink-3">
                    {c.id} · p. {c.page ?? "—"}
                  </span>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      void copy(
                        citationText({
                          chunk: c,
                          document: d,
                          score: 0,
                          semanticScore: null,
                          keywordScore: null,
                          highlights: [],
                        }),
                      )
                    }
                  >
                    Copy citation
                  </Button>
                </div>
                <p className="text-md leading-7 whitespace-pre-wrap">
                  {c.text}
                </p>
              </section>
            ))}
          </article>
        </div>
      )}
    </div>
  );
}

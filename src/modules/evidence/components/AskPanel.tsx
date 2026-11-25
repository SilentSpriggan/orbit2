import { useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Button,
  Card,
  Dialog,
  Field,
  Popover,
  Select,
  Switch,
  Textarea,
  useToast,
} from "../../../shared/ui";
import { useSystemStatus } from "../../../shared/context/SystemStatusContext";
import { annotateUnsupported } from "../services/answer";
import { useAsk } from "../hooks/useEvidence";
import type {
  RetrievalTrace as Trace,
  SearchHit,
  SearchParams,
} from "../types";
import {
  citationText,
  EvidenceLabelBadge,
  passageUrl,
  useCopy,
} from "./common";

export function CitationMarker({
  marker,
  hit,
}: {
  marker: number;
  hit: SearchHit;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover
      label={`Citation ${marker}`}
      open={open}
      onOpenChange={setOpen}
      autoFocus={false}
      className="max-w-[360px]"
      trigger={(props) => (
        <button
          {...props}
          onMouseEnter={() => setOpen(true)}
          onFocus={() => setOpen(true)}
          className="inline-flex items-center justify-center min-h-11 min-w-11 font-mono text-2xs font-semibold text-accent"
          aria-label={`Citation ${marker}: ${hit.document.title}`}
        >
          [{marker}]
        </button>
      )}
    >
      {() => (
        <div className="space-y-3">
          <p className="font-semibold">{hit.document.title}</p>
          <p className="text-sm text-ink-2">{hit.chunk.text}</p>
          <p className="font-mono text-xs">
            p. {hit.chunk.page ?? "—"} · {hit.chunk.id}
          </p>
          <Link
            to={passageUrl(hit)}
            className="inline-flex min-h-11 items-center text-accent underline"
          >
            Open passage
          </Link>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Close citation
          </Button>
        </div>
      )}
    </Popover>
  );
}
export function StreamingAnswer({
  answer,
  citations,
  sources,
  unsupported,
}: {
  answer: string;
  citations: Record<number, string>;
  sources: SearchHit[];
  unsupported: [number, number][];
}) {
  const parts: ReactNode[] = [];
  const pattern = /\[(\d+)\]/g;
  let from = 0;
  let match: RegExpExecArray | null;
  const textPart = (start: number, end: number) => {
    const cuts = new Set([start, end]);
    for (const [a, b] of unsupported) {
      if (a > start && a < end) cuts.add(a);
      if (b > start && b < end) cuts.add(b);
    }
    const ordered = [...cuts].sort((a, b) => a - b);
    return ordered.slice(0, -1).map((a, i) => {
      const b = ordered[i + 1];
      const flagged = unsupported.some(([s, e]) => s <= a && e > a);
      return (
        <span
          key={a}
          className={
            flagged
              ? "underline decoration-dotted decoration-caution underline-offset-4"
              : ""
          }
          title={flagged ? "Not supported by a retrieved passage" : undefined}
        >
          {answer.slice(a, b)}
        </span>
      );
    });
  };
  while ((match = pattern.exec(answer))) {
    parts.push(...textPart(from, match.index));
    const marker = Number(match[1]);
    const hit = sources.find((h) => h.chunk.id === citations[marker]);
    parts.push(
      hit ? (
        <CitationMarker key={`cite-${match.index}`} marker={marker} hit={hit} />
      ) : (
        <span
          key={`missing-${match.index}`}
          className="underline decoration-dotted decoration-caution"
          title="Citation passage unavailable"
        >
          {match[0]}
        </span>
      ),
    );
    from = match.index + match[0].length;
  }
  parts.push(...textPart(from, answer.length));
  return (
    <div className="text-base leading-7 whitespace-pre-wrap break-words">
      {parts}
    </div>
  );
}
export function RetrievalTrace({ trace }: { trace: Trace }) {
  return (
    <details className="bg-sunken border border-line rounded-md p-3">
      <summary className="cursor-pointer min-h-11 flex items-center text-sm">
        Retrieval trace
      </summary>
      <div className="font-mono text-2xs space-y-2 overflow-x-auto">
        <p>
          {trace.embeddingModel} · top-k {trace.topK} · {trace.tookMs} ms
        </p>
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left">Chunk</th>
              <th>FAISS</th>
              <th>FTS5</th>
              <th>Final</th>
            </tr>
          </thead>
          <tbody>
            {trace.candidates.map((c) => (
              <tr key={c.chunkId}>
                <td className="py-2">{c.chunkId}</td>
                <td className="text-right">{c.faiss?.toFixed(2) ?? "—"}</td>
                <td className="text-right">{c.fts?.toFixed(2) ?? "—"}</td>
                <td className="text-right">{c.final.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
export function AskPanel({
  params,
  cited,
  clearCited,
}: {
  params: SearchParams;
  cited: SearchHit[];
  clearCited: () => void;
}) {
  const { status, error: systemError } = useSystemStatus();
  const ask = useAsk();
  const [question, setQuestion] = useState("");
  const [topK, setTopK] = useState(4);
  const [restrict, setRestrict] = useState(true);
  const [share, setShare] = useState(false);
  const { toast } = useToast();
  const copy = useCopy();
  const navigate = useNavigate();
  const [url] = useSearchParams();
  const ready =
    status?.ollama.state === "ready" &&
    !systemError &&
    status.network.mode !== "unreachable" &&
    !(import.meta.env.DEV && url.get("model") === "unavailable");
  const running = ask.state === "streaming";
  const textWithSources = () =>
    `${annotateUnsupported(ask.answer, ask.unsupported)}\n\n${Object.entries(
      ask.citations,
    )
      .map(([marker, id]) => {
        const hit = ask.sources.find((s) => s.chunk.id === id);
        return hit ? `[${marker}] ${citationText(hit)}` : "";
      })
      .filter(Boolean)
      .join(
        "\n",
      )}\nAnswers come only from passages in this library. Not medical advice.`;
  const save = () => {
    try {
      const raw: unknown = JSON.parse(
        localStorage.getItem("orbit.evidence.notes") ?? "[]",
      );
      const notes = Array.isArray(raw) ? raw : [];
      localStorage.setItem(
        "orbit.evidence.notes",
        JSON.stringify([
          ...notes,
          {
            question,
            text: textWithSources(),
            savedAt: new Date().toISOString(),
          },
        ]),
      );
      toast({
        title: "Saved to local notes",
        description: "Stored in this browser. Nothing has been sent.",
      });
    } catch {
      toast({
        level: "caution",
        title: "Could not save notes",
        description: "Browser storage is unavailable or full.",
      });
    }
  };
  return (
    <Card className="p-5 space-y-4">
      <div>
        <h2 className="text-md font-semibold">Ask the library</h2>
        <p className="text-xs text-ink-2 mt-1">
          Answers grounded in local passages
        </p>
      </div>
      <Field label="Your question">
        {(p) => (
          <Textarea
            {...p}
            rows={3}
            placeholder="What does the library say about bone loss?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        )}
      </Field>
      <div className="flex flex-wrap gap-3 items-end">
        <Field label="Passages">
          {(p) => (
            <Select
              {...p}
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
            >
              {[4, 8, 12].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </Select>
          )}
        </Field>
        <Switch
          label="Restrict to current filters"
          checked={restrict}
          onChange={setRestrict}
          showLabel
        />
      </div>
      {cited.length > 0 && (
        <div className="bg-sunken p-3 rounded-md text-sm">
          <p>{cited.length} passage(s) attached</p>
          {cited.map((h) => (
            <p key={h.chunk.id} className="font-mono text-xs text-ink-2">
              {h.chunk.id}
            </p>
          ))}
          <Button variant="ghost" onClick={clearCited}>
            Clear attachments
          </Button>
        </div>
      )}
      {!ready && (
        <p className="text-sm text-ink-2">
          Ask is unavailable: the local model is not ready or the server is
          unreachable.{" "}
          <Link className="text-accent underline" to="/evidence/offline">
            Open Offline center
          </Link>
        </p>
      )}
      <div className="flex gap-2">
        <Button
          variant="primary"
          disabled={!ready || !question.trim() || running}
          onClick={() =>
            void ask.ask(question.trim(), {
              topK,
              filters: restrict ? params : undefined,
              chunkIds: cited.map((h) => h.chunk.id),
            })
          }
        >
          Ask
        </Button>
        {running && <Button onClick={ask.cancel}>Stop</Button>}
      </div>
      <p role="status" className="text-xs text-ink-2">
        {running
          ? "Retrieving and composing locally…"
          : ask.state === "cancelled"
            ? "Stopped. This answer is incomplete."
            : ask.state === "done"
              ? "Answer complete."
              : null}
      </p>
      {ask.state === "no-answer" ? (
        <p role="status" className="p-4 bg-sunken rounded-md">
          The library has no source that answers this.
        </p>
      ) : (
        ask.answer && <StreamingAnswer {...ask} />
      )}{" "}
      {ask.state === "error" && (
        <p role="alert" className="text-caution">
          {ask.error || "The answer stream ended before completion. Try again."}
        </p>
      )}
      {ask.sources.length > 0 && (
        <section className="border-t border-line pt-4 space-y-3">
          <h3 className="text-sm font-semibold">Sources</h3>
          {Object.entries(ask.citations).map(([marker, id]) => {
            const hit = ask.sources.find((h) => h.chunk.id === id);
            return (
              hit && (
                <div key={marker} className="space-y-1">
                  <Link
                    className="text-sm text-accent inline-flex min-h-11 items-center"
                    to={passageUrl(hit)}
                  >
                    <span className="font-mono mr-2">[{marker}]</span>
                    {hit.document.title}
                  </Link>
                  <EvidenceLabelBadge label={hit.document.evidenceLabel} />
                  <p className="font-mono text-2xs text-ink-3">
                    {id} · score {hit.score.toFixed(2)}
                  </p>
                </div>
              )
            );
          })}
        </section>
      )}
      {ask.trace && <RetrievalTrace trace={ask.trace} />}
      <footer className="border-t border-line pt-4 space-y-3">
        <p className="text-xs text-ink-2">
          Answers come only from passages in this library. Not medical advice.
        </p>
        {ask.state === "done" && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void copy(textWithSources())}>
              Copy answer with citations
            </Button>
            <Button onClick={save}>Save to notes</Button>
            <Button variant="ghost" onClick={() => setShare(true)}>
              Send to Crew assistant
            </Button>
          </div>
        )}
      </footer>
      <Dialog
        open={share}
        onClose={() => setShare(false)}
        title="Review question for Crew assistant"
        description="Only this question will be prefilled in the local Crew assistant. Nothing has been sent."
        footer={
          <>
            <Button onClick={() => setShare(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() =>
                navigate(`/assistant?question=${encodeURIComponent(question)}`)
              }
            >
              Confirm and open assistant
            </Button>
          </>
        }
      >
        <p className="max-w-[72ch] whitespace-pre-wrap">{question}</p>
      </Dialog>
    </Card>
  );
}

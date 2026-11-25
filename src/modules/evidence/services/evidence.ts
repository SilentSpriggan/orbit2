import { apiGet, apiSend, apiStream } from "../../../shared/api/client";
import { withMock } from "../../../shared/api/mockMode";
import type {
  AskEvent,
  DiagnosticCheck,
  EvidenceChunk,
  EvidenceDocument,
  Facets,
  ImportMetadata,
  IndexJob,
  IndexSettings,
  NetworkInfo,
  SearchParams,
  SearchResponse,
  StorageInfo,
} from "../types";
import { setMockIndexRebuild } from "../../../shared/mocks/systemStatus";
import * as mock from "../mocks/data";

export const search = (params: SearchParams, signal?: AbortSignal) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (Array.isArray(value) ? value.length : value !== undefined)
      query.set(key, Array.isArray(value) ? value.join(",") : String(value));
  return withMock(
    () => apiGet<SearchResponse>(`/api/evidence/search?${query}`, { signal }),
    () => mock.searchMock(params),
    250,
    signal,
  );
};
export const getDocument = (id: string, signal?: AbortSignal) =>
  withMock(
    () =>
      apiGet<EvidenceDocument>(
        `/api/evidence/documents/${encodeURIComponent(id)}`,
        { signal },
      ),
    () => {
      const doc = mock.documents.find((d) => d.id === id);
      if (!doc) throw new Error("Document not found on this device.");
      return doc;
    },
    150,
    signal,
  );
export const getChunks = (id: string, signal?: AbortSignal) =>
  withMock(
    async () => {
      const all: EvidenceChunk[] = [];
      const seen = new Set<string>();
      for (let from = 0; ; from += 200) {
        const batch = await apiGet<EvidenceChunk[]>(
          `/api/evidence/documents/${encodeURIComponent(id)}/chunks?from=${from}&limit=200`,
          { signal },
        );
        for (const chunk of batch) {
          if (seen.has(chunk.id))
            throw new Error(
              "The server returned a repeated chunk page. Reload the document.",
            );
          seen.add(chunk.id);
          all.push(chunk);
        }
        if (batch.length < 200) return all;
      }
    },
    () => mock.chunks.filter((c) => c.documentId === id),
    150,
    signal,
  );
export const getFacets = (signal?: AbortSignal) =>
  withMock(
    () => apiGet<Facets>("/api/evidence/facets", { signal }),
    () => mock.facets,
    150,
    signal,
  );
export const getNetworkInfo = (signal?: AbortSignal) =>
  withMock(
    () => apiGet<NetworkInfo>("/api/system/network", { signal }),
    () => mock.network,
    150,
    signal,
  );
export const getDiagnostics = (signal?: AbortSignal) =>
  withMock(
    () => apiGet<DiagnosticCheck[]>("/api/system/diagnostics", { signal }),
    () => mock.diagnostics,
    150,
    signal,
  );
export const getStorage = (signal?: AbortSignal) =>
  withMock(
    () => apiGet<StorageInfo>("/api/system/storage", { signal }),
    () => ({
      categories: [
        { name: "Database", bytes: 184e6 },
        { name: "Index", bytes: 96e6 },
        { name: "Models", bytes: 6.2e9 },
        { name: "Documents", bytes: 840e6 },
      ],
      capacityBytes: 16e9,
    }),
    150,
    signal,
  );
export const getIndexSettings = (signal?: AbortSignal) =>
  withMock(
    () => apiGet<IndexSettings>("/api/evidence/settings", { signal }),
    () => ({
      chunkSize: 512,
      overlap: 64,
      embeddingModel: "all-MiniLM-L6-v2",
      estimatedRebuildSeconds: 180,
    }),
    150,
    signal,
  );
export const listJobs = (signal?: AbortSignal) =>
  withMock(
    () => apiGet<IndexJob[]>("/api/evidence/jobs", { signal }),
    () => [...mock.jobs],
    150,
    signal,
  );
export const cancelJob = (id: string, signal?: AbortSignal) =>
  withMock(
    () =>
      apiSend<void>(
        "POST",
        `/api/evidence/jobs/${encodeURIComponent(id)}/cancel`,
        undefined,
        { signal },
      ),
    () => {
      if (
        mock.jobs.some(
          (j) => j.id === id && j.fileName === "Library index rebuild",
        )
      )
        setMockIndexRebuild(0);
      mock.setJobs(
        mock.jobs.map((j) => (j.id === id ? { ...j, stage: "cancelled" } : j)),
      );
    },
    150,
    signal,
  );
export const rebuildIndex = (signal?: AbortSignal) =>
  withMock(
    () => apiSend<void>("POST", "/api/evidence/reindex", undefined, { signal }),
    () => {
      setMockIndexRebuild(30_000);
      mock.setJobs([
        ...mock.jobs,
        {
          id: crypto.randomUUID(),
          fileName: "Library index rebuild",
          stage: "queued",
          progress: 0,
          chunks: 192,
          vectors: 0,
          startedAt: new Date().toISOString(),
        },
      ]);
    },
    150,
    signal,
  );
export const importFiles = (
  files: File[],
  meta: ImportMetadata[],
  signal?: AbortSignal,
) =>
  withMock(
    () => {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      form.append("meta", JSON.stringify(meta));
      return apiSend<IndexJob[]>("POST", "/api/evidence/import", form, {
        signal,
      });
    },
    () => {
      const next: IndexJob[] = files.map((f) => ({
        id: crypto.randomUUID(),
        fileName: f.name,
        stage: "queued",
        progress: 0,
        chunks: 0,
        vectors: 0,
        startedAt: new Date().toISOString(),
      }));
      mock.setJobs([...mock.jobs, ...next]);
      return next;
    },
    250,
    signal,
  );
export function pause(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const done = () => {
      signal?.removeEventListener("abort", abort);
      resolve();
    };
    const timer = setTimeout(done, ms);
    const abort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", abort, { once: true });
  });
}
export const runDiagnostics = (
  onCheck: (check: DiagnosticCheck) => void,
  signal?: AbortSignal,
  id?: string,
) =>
  withMock(
    () =>
      apiStream(
        "/api/system/diagnostics/run",
        { id },
        (e) => onCheck(JSON.parse(e.data) as DiagnosticCheck),
        { signal },
      ),
    async () => {
      for (const check of mock.diagnostics.filter((c) => !id || c.id === id)) {
        await pause(120, signal);
        onCheck({ ...check, checkedAt: new Date().toISOString() });
      }
    },
    0,
    signal,
  );
export const streamJobs = (
  onJob: (job: IndexJob) => void,
  signal?: AbortSignal,
) =>
  withMock(
    () =>
      apiStream(
        "/api/evidence/jobs/stream",
        undefined,
        (e) => onJob(JSON.parse(e.data) as IndexJob),
        { signal, method: "GET" },
      ),
    async () => {
      while (!signal?.aborted) {
        await pause(1500, signal);
        mock.setJobs(
          mock.jobs.map((j) => {
            if (["done", "failed", "cancelled"].includes(j.stage)) return j;
            const progress = Math.min(1, j.progress + 0.06);
            const stage =
              progress < 0.2
                ? "extract"
                : progress < 0.4
                  ? "chunk"
                  : progress < 0.85
                    ? "embed"
                    : progress < 1
                      ? "index"
                      : "done";
            return {
              ...j,
              progress,
              stage,
              chunks: 64,
              vectors: Math.round(progress * 64),
            };
          }),
        );
        mock.jobs.forEach(onJob);
      }
    },
    0,
    signal,
  );
export const ask = (
  question: string,
  opts: { topK: number; filters?: SearchParams; chunkIds?: string[] },
  onEvent: (e: AskEvent) => void,
  signal?: AbortSignal,
) =>
  withMock(
    () =>
      apiStream(
        "/api/evidence/ask",
        { question, ...opts },
        (e) => onEvent(JSON.parse(e.data) as AskEvent),
        { signal },
      ),
    async () => {
      const result = mock.searchMock({
        ...(opts.filters ?? mock.emptyParams),
        q: "bone loss",
      });
      const sources = result.hits.slice(0, opts.topK);
      const supported = /bone|mineral/i.test(question) && sources.length > 0;
      onEvent({
        type: "retrieval",
        sources: supported ? sources : [],
        trace: {
          embeddingModel: "Demo: all-MiniLM-L6-v2",
          topK: opts.topK,
          candidates: supported
            ? sources.map((h) => ({
                chunkId: h.chunk.id,
                faiss: h.semanticScore,
                fts: h.keywordScore,
                final: h.score,
              }))
            : [],
          tookMs: 112,
        },
      });
      if (!supported) {
        onEvent({
          type: "done",
          answerId: crypto.randomUUID(),
          noAnswer: true,
        });
        return;
      }
      onEvent({ type: "citation", marker: 1, chunkId: sources[0].chunk.id });
      onEvent({
        type: "citation",
        marker: 2,
        chunkId: sources[1]?.chunk.id ?? sources[0].chunk.id,
      });
      const prefix =
        "The fictional bone loss entry demonstrates how research context is preserved [1]. Its limitations state that it asserts no clinical recommendation [2]. ";
      const unsupported = "A benefit for future missions is not established.";
      onEvent({
        type: "unsupported",
        start: prefix.length,
        end: prefix.length + unsupported.length,
      });
      for (const word of (prefix + unsupported).match(/\S+\s*/g) ?? []) {
        await pause(45, signal);
        onEvent({ type: "token", text: word });
      }
      onEvent({ type: "done", answerId: crypto.randomUUID(), noAnswer: false });
    },
    0,
    signal,
  );

import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import {
  Button,
  Card,
  Dialog,
  Field,
  Input,
  Select,
  StatusBadge,
  useToast,
} from "../../../shared/ui";
import { toApiError } from "../../../shared/api/client";
import { useSystemStatus } from "../../../shared/context/SystemStatusContext";
import { MOCK_MODE } from "../../../shared/api/mockMode";
import { useIndexJobs, usePageState, useRead } from "../hooks/useEvidence";
import {
  cancelJob,
  getIndexSettings,
  importFiles,
  rebuildIndex,
} from "../services/evidence";
import type {
  EvidenceLabel,
  ImportMetadata,
  IndexJob,
  SourceType,
} from "../types";
import { LABELS, TYPES } from "../mocks/data";
import { ReadState } from "./common";
interface PendingFile {
  key: string;
  file: File;
  meta: ImportMetadata;
  labelChosen: boolean;
}
const split = (value: string) =>
  value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
export function IndexJobRow({
  job,
  cancel,
  pending,
}: {
  job: IndexJob;
  cancel: () => void;
  pending: boolean;
}) {
  const [now, setNow] = useState(Date.now());
  const terminal = ["done", "failed", "cancelled"].includes(job.stage);
  useEffect(() => {
    if (terminal) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [terminal]);
  const elapsed = Math.max(
    0,
    Math.floor((now - new Date(job.startedAt).getTime()) / 1000),
  );
  return (
    <div className="p-5 border-t border-line space-y-3">
      <div className="flex justify-between gap-3 items-center">
        <p className="font-mono text-sm break-all">{job.fileName}</p>
        <StatusBadge
          level={
            job.stage === "failed"
              ? "critical"
              : job.stage === "done"
                ? "nominal"
                : job.stage === "cancelled"
                  ? "standby"
                  : "caution"
          }
        >
          {job.stage}
        </StatusBadge>
      </div>
      <p className="font-mono text-xs text-ink-3">
        Extract → Chunk → Embed → Index
      </p>
      <progress
        aria-label={`${job.fileName} progress`}
        value={job.progress}
        max={1}
        className="w-full h-1.5 accent-accent"
      />
      <div className="flex justify-between items-center gap-3">
        <p className="font-mono text-xs text-ink-2">
          {Math.round(job.progress * 100)}% · {job.chunks} chunks ·{" "}
          {job.vectors} vectors{!terminal && ` · ${elapsed}s elapsed`}
        </p>
        {!terminal && (
          <Button disabled={pending} onClick={cancel}>
            Cancel
          </Button>
        )}
      </div>
      {job.error && (
        <p role="alert" className="text-critical text-sm">
          {job.error}
        </p>
      )}
    </div>
  );
}
export function ImportPage() {
  const jobs = useIndexJobs();
  const { refresh } = useSystemStatus();
  const settings = useRead(getIndexSettings);
  const override = usePageState();
  const input = useRef<HTMLInputElement>(null);
  const ctrl = useRef<AbortController | null>(null);
  const [files, setFiles] = useState<PendingFile[]>([]),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false),
    [confirm, setConfirm] = useState(false),
    [drag, setDrag] = useState(false);
  const { toast } = useToast();
  useEffect(() => () => ctrl.current?.abort(), []);
  const add = (list: FileList | null) => {
    if (!list) return;
    const incoming = [...list];
    const invalid = incoming.filter(
      (f) => !/\.(pdf|md|markdown|html?|txt|orbitpack)$/i.test(f.name),
    );
    if (invalid.length) {
      setError(
        `Unsupported file: ${invalid.map((f) => f.name).join(", ")}. Choose PDF, Markdown, HTML, TXT or .orbitpack.`,
      );
      return;
    }
    setError("");
    setFiles((old) => [
      ...old,
      ...incoming.map((file) => ({
        key: crypto.randomUUID(),
        file,
        labelChosen: false,
        meta: {
          title: file.name.replace(/\.[^.]+$/, ""),
          authors: [],
          year: null,
          sourceType: "paper" as const,
          evidenceLabel: "observational" as const,
          topics: [],
          bodySystems: [],
        },
      })),
    ]);
  };
  const update = (key: string, patch: Partial<ImportMetadata>) =>
    setFiles((old) =>
      old.map((f) =>
        f.key === key
          ? {
              ...f,
              meta: { ...f.meta, ...patch },
              labelChosen: patch.evidenceLabel ? true : f.labelChosen,
            }
          : f,
      ),
    );
  const mutate = async (
    action: (signal: AbortSignal) => Promise<unknown>,
    success: string,
  ) => {
    ctrl.current?.abort();
    const controller = new AbortController();
    ctrl.current = controller;
    setPending(true);
    setError("");
    try {
      await action(controller.signal);
      if (!controller.signal.aborted) {
        jobs.refetch();
        refresh();
        toast({
          title: success,
          description: MOCK_MODE
            ? "Simulation only. Files have not been added to a real index."
            : "Processing on the local server.",
        });
        return true;
      }
    } catch (e) {
      if (!controller.signal.aborted) setError(toApiError(e).message);
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
    return false;
  };
  if (override)
    return (
      <ReadState
        loading={override === "loading"}
        empty={override === "empty"}
        error={
          override === "error"
            ? "Demo error: import service unavailable."
            : null
        }
      />
    );
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
      <section className="space-y-4">
        <Card className="p-5 space-y-4">
          <h2 className="text-md font-semibold">
            Add documents to this library
          </h2>
          <p className="text-sm text-ink-2">
            Files stay on the local server. Review metadata and select an
            evidence label before importing.
          </p>
          {MOCK_MODE && (
            <p className="text-sm text-ink-2">
              Demo import simulates indexing; selected file contents are not
              stored or indexed.
            </p>
          )}
          <div
            className={`border border-dashed border-control rounded-lg bg-sunken p-10 text-center space-y-3 ${drag ? "ring-1 ring-accent" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              if (!pending) add(e.dataTransfer.files);
            }}
          >
            <Upload
              size={24}
              className="mx-auto text-ink-3"
              aria-hidden="true"
            />
            <p className="text-md font-semibold">
              Drop research and procedures here
            </p>
            <p className="text-sm text-ink-2">
              PDF, Markdown, HTML, TXT or .orbitpack
            </p>
            <input
              ref={input}
              type="file"
              multiple
              accept=".pdf,.md,.markdown,.html,.htm,.txt,.orbitpack"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => {
                add(e.target.files);
                e.target.value = "";
              }}
            />
            <Button disabled={pending} onClick={() => input.current?.click()}>
              Choose files
            </Button>
          </div>
          {files.map((f) => (
            <fieldset
              disabled={pending}
              key={f.key}
              className="border border-line rounded-md p-4 space-y-3"
            >
              <legend className="font-mono text-xs px-2 break-all">
                {f.file.name}
              </legend>
              <Field label="Title (required)">
                {(p) => (
                  <Input
                    {...p}
                    required
                    value={f.meta.title}
                    onChange={(e) => update(f.key, { title: e.target.value })}
                  />
                )}
              </Field>
              <Field label="Authors (comma separated)">
                {(p) => (
                  <Input
                    {...p}
                    value={f.meta.authors.join(",")}
                    onChange={(e) =>
                      update(f.key, { authors: e.target.value.split(",") })
                    }
                  />
                )}
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Year">
                  {(p) => (
                    <Input
                      {...p}
                      type="number"
                      min="1000"
                      max="2100"
                      value={f.meta.year ?? ""}
                      onChange={(e) =>
                        update(f.key, {
                          year: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  )}
                </Field>
                <Field label="Source type">
                  {(p) => (
                    <Select
                      {...p}
                      value={f.meta.sourceType}
                      onChange={(e) =>
                        update(f.key, {
                          sourceType: e.target.value as SourceType,
                        })
                      }
                    >
                      {Object.entries(TYPES).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>
              <Field label="Evidence label (required)">
                {(p) => (
                  <Select
                    {...p}
                    required
                    value={f.labelChosen ? f.meta.evidenceLabel : ""}
                    onChange={(e) =>
                      update(f.key, {
                        evidenceLabel: e.target.value as EvidenceLabel,
                      })
                    }
                  >
                    <option value="" disabled>
                      Select a label
                    </option>
                    {Object.entries(LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Topic tags (comma separated)">
                {(p) => (
                  <Input
                    {...p}
                    value={f.meta.topics.join(",")}
                    onChange={(e) =>
                      update(f.key, { topics: e.target.value.split(",") })
                    }
                  />
                )}
              </Field>
              <Field label="Body systems (comma separated IDs)">
                {(p) => (
                  <Input
                    {...p}
                    placeholder="musculoskeletal,cardiovascular"
                    value={f.meta.bodySystems.join(",")}
                    onChange={(e) =>
                      update(f.key, { bodySystems: e.target.value.split(",") })
                    }
                  />
                )}
              </Field>
              <Button
                variant="ghost"
                onClick={() =>
                  setFiles((old) => old.filter((v) => v.key !== f.key))
                }
              >
                Remove file
              </Button>
            </fieldset>
          ))}
          {error && (
            <p role="alert" className="text-caution">
              {error}
            </p>
          )}
          <Button
            variant="primary"
            loading={pending}
            disabled={
              !files.length ||
              files.some(
                (f) =>
                  !f.labelChosen ||
                  !f.meta.title.trim() ||
                  (f.meta.year !== null &&
                    (f.meta.year < 1000 ||
                      f.meta.year > 2100 ||
                      !Number.isInteger(f.meta.year))),
              )
            }
            onClick={() =>
              void (async () => {
                const snapshot = files;
                const ok = await mutate(
                  (signal) =>
                    importFiles(
                      snapshot.map((f) => f.file),
                      snapshot.map((f) => ({
                        ...f.meta,
                        title: f.meta.title.trim(),
                        authors: split(f.meta.authors.join(",")),
                        topics: split(f.meta.topics.join(",")),
                        bodySystems: split(f.meta.bodySystems.join(",")),
                      })),
                      signal,
                    ),
                  "Import queued",
                );
                if (ok) setFiles([]);
              })()
            }
          >
            Import {files.length || ""} {files.length === 1 ? "file" : "files"}
          </Button>
        </Card>
        <Card>
          <div className="p-5">
            <h2 className="text-md font-semibold">Indexing jobs</h2>
            <p className="text-sm text-ink-2 mt-1">
              Progress from the local indexing service
            </p>
          </div>
          <ReadState
            loading={jobs.isLoading}
            error={jobs.error?.message}
            empty={jobs.data?.length === 0}
            retry={jobs.refetch}
          />
          {jobs.streamError && (
            <div className="p-4">
              <p role="alert" className="text-caution">
                Live updates disconnected: {jobs.streamError}
              </p>
              <Button onClick={jobs.reconnect}>Reconnect</Button>
            </div>
          )}
          {jobs.data?.map((job) => (
            <IndexJobRow
              key={job.id}
              job={job}
              pending={pending}
              cancel={() =>
                void mutate(
                  (signal) => cancelJob(job.id, signal),
                  "Job cancelled",
                )
              }
            />
          ))}
        </Card>
      </section>
      <aside>
        <Card className="p-5 space-y-4">
          <h2 className="text-md font-semibold">Index configuration</h2>
          <ReadState
            loading={settings.isLoading}
            error={settings.error?.message}
            retry={settings.refetch}
          />
          {settings.data && (
            <dl className="space-y-3 text-sm">
              <dt className="text-ink-2">Chunk size / overlap</dt>
              <dd className="font-mono text-xs">
                {settings.data.chunkSize} / {settings.data.overlap} tokens
              </dd>
              <dt className="text-ink-2">Embedding model</dt>
              <dd className="font-mono text-xs break-words">
                {settings.data.embeddingModel}
              </dd>
            </dl>
          )}
          <p className="text-xs text-ink-3">
            Read-only · configured by the local server
          </p>
          <Button
            disabled={pending || !settings.data}
            onClick={() => setConfirm(true)}
          >
            Rebuild index
          </Button>
        </Card>
      </aside>
      <Dialog
        open={confirm}
        onClose={() => !pending && setConfirm(false)}
        title="Rebuild the local index?"
        description={`Estimated time: ${settings.data?.estimatedRebuildSeconds ?? "unknown"} seconds. Search falls back to keyword-only while embeddings are rebuilt. Original documents are retained.`}
        footer={
          <>
            <Button disabled={pending} onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={pending}
              onClick={() =>
                void (async () => {
                  if (await mutate(rebuildIndex, "Rebuild queued"))
                    setConfirm(false);
                })()
              }
            >
              Rebuild index
            </Button>
          </>
        }
      />
    </div>
  );
}

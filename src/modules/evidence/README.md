# Evidence library

Frontend module for the local FastAPI contract in the supplied Offline Evidence Library brief. It reuses the ORBIT shell and shared UI. It does **not** implement the separate FastAPI, SQLite/FTS5, FAISS, Ollama, document extraction or inference services.

## Screens

- `/evidence` — debounced, abortable search, filters, grouping, pagination and cited Ask answers.
- `/evidence?q=bone+loss` — query link.
- `/evidence?doc=d014&chunk=c4812` — stable citation target; focuses the exact chunk.
- `/evidence/doc/:documentId` — full extracted text, outline, `[` / `]` passage navigation and same-origin original PDF when stored.
- `/evidence/offline` — network QR generated locally, diagnostics, model/index status and storage.
- `/evidence/import` — reviewed per-file metadata, multipart imports, SSE jobs and reindex confirmation.

The module has 24 explicitly fictional demo documents with 192 passages. Mock scores, diagnostics and imports are demonstrations, not local service measurements. The global mock system status retains the foundation's larger illustrative index counts; the library labels its own demo fixture counts explicitly.

## Historical CSVs

`data/ALL_ASTRONAUT_NUMERICAL_DATA.csv` and `data/ALL_NUMERIC_METRICS_LONG.csv` are unchanged copies of the supplied files. `data/historical.json` is a UTF-8/BOM-aware conversion of the long CSV, retaining all fields as strings, including blanks, source PDF names, pages, tables and quality notes. The historical view contains 40 distinct records / 255 metric rows, supports local search and provides the original CSV downloads.

These transcriptions are kept separate from synthetic library papers and current crew data. No source PDFs were supplied; source references are displayed as supplied, without claiming independent verification or converting values into medical thresholds. The production worker caches these bundled historical reference assets, never live `/api` data.

Regenerate the JSON after updating the long CSV:

```sh
python3 scripts/prepare-evidence-data.py
```

## API integration

All services use `withMock`. Production builds default to real same-origin API calls; `.env.development` enables the scripted mock implementation. No automatic fallback to fictional data occurs on a server error.

The supplied search, document, Ask, network, diagnostics, import, jobs and reindex routes are implemented in `services/evidence.ts`. Chunk pagination uses zero-based `from` offsets and `limit=200`; repeated server pages fail explicitly rather than silently looping. Search additionally sends `topics`, `fullText` and `sort`. The server must apply those filters before pagination.

Additional read-only endpoints needed by the specified configuration/storage displays:

- `GET /api/system/storage` → `{ categories: [{ name, bytes }], capacityBytes }`.
- `GET /api/evidence/settings` → `{ chunkSize, overlap, embeddingModel, estimatedRebuildSeconds }`.
- `GET /api/evidence/documents/{id}/original` → stored PDF.

Multipart imports contain repeated `files` fields and one JSON `meta` field. Ask sends `{ question, topK, filters?, chunkIds? }`. The server owns relevance floors, supported-sentence checking and evidence-grounded generation. The client renders the server's citation/unsupported events and clears generated text on `noAnswer`.

Diagnostic SSE frames contain one `DiagnosticCheck`; job SSE frames contain one `IndexJob`. Jobs use a GET stream, while Ask and diagnostics use POST streams. Calls abort on unmount. Shared API changes add multipart bodies and optional GET streams while preserving JSON/POST defaults.

The reviewed assistant handoff prefills `?question=` in the existing composer and never sends automatically. Notes are saved under `orbit.evidence.notes` in browser localStorage; clipboard/storage failures are reported.

## Offline packaging

Workbox `generateSW` precaches the production shell, lazy module bundles, fonts and bundled assets. `/api/**` is NetworkOnly and excluded from navigation fallback. `/models/**` uses a same-origin CacheFirst route in `orbit-models-v1`. Only production registers the worker. Updates prompt via the existing Toast provider. The manifest and icons are local.

An offline shell is not an offline database: when the local server is stopped, the application can render but search, records, models and diagnostics remain unavailable and the shared status poll reports “Local server unreachable.” Clearing the app cache requires confirmation and does not delete server records or browser notes.

## Validation

```sh
npm run typecheck
npm run build
npm run test:evidence
```

Tests execute actual TypeScript services in isolated Node VM contexts; they cover fixture/deep-link integrity, keyword filtering/pagination, Ask citations/refusal, aborts, multipart payloads, GET SSE framing, server errors, chunk pagination, local QR generation, historical data counts and the generated worker's routing rules. Node 22 is supported. Build first because worker tests inspect `dist/sw.js`.

Development state URLs: append `?state=loading`, `?state=empty`, or `?state=error`. Library also supports `?index=missing` and `?model=unavailable` (combine using `&`). These overrides are disabled in production.

Manual acceptance checks still required on a browser/device:

1. Check layouts at 1180×820 and 1440×900 and walk every control by keyboard.
2. Open the stable citation target and verify focus/highlight; test bracket navigation.
3. Ask “bone loss,” inspect both citations and the unsupported underline; ask “What is the capital of France?” and verify refusal.
4. Check missing-index keyword fallback and unavailable-model explanation.
5. Review an import, cancel an active job, run diagnostics and scan the local QR.
6. Serve a production build over local HTTPS (localhost also supports service workers). Wait for installation, reload, stop the server, then reload `/evidence` and `/evidence/offline`. Verify the shell and critical unreachable status, and inspect Cache Storage to ensure API responses were never stored.

Browser automation was unavailable during implementation, so visual, keyboard, QR scanning and actual offline reload behavior have not been verified interactively.

### Workspace path caveat

This checkout's parent directory contains colons. Package scripts invoke their binaries through Node to avoid npm's PATH splitting on macOS. Vite 8's development file guard rejects colons anywhere in a file path even when the directory is allowed. Keep that guard enabled: use a checkout in a path without colons for `npm run dev`, or use `npm run build` followed by `npm run preview` here. Production preview does not provide the development API proxy; FastAPI serves the final build in deployment.

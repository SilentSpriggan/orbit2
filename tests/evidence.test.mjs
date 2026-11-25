import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import QRCode from "qrcode";

// Execute the actual TypeScript modules in isolated contexts with Vite's env contract.
async function load(relative, mocks = true, fetchImpl = fetch) {
  const context = vm.createContext({
    console,
    setTimeout,
    clearTimeout,
    window: { setTimeout, clearTimeout, dispatchEvent() {} },
    Event,
    AbortController,
    DOMException,
    FormData,
    File,
    Blob,
    Response,
    ReadableStream,
    TextDecoder,
    TextEncoder,
    URLSearchParams,
    crypto,
    fetch: fetchImpl,
  });
  const modules = new Map();
  async function get(file) {
    if (modules.has(file)) return modules.get(file);
    const code = ts.transpileModule(await fs.readFile(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    const mod = new vm.SourceTextModule(code, {
      context,
      identifier: file,
      initializeImportMeta(meta) {
        meta.env = { VITE_USE_MOCKS: String(mocks) };
      },
    });
    modules.set(file, mod);
    await mod.link((specifier) =>
      get(
        path.resolve(
          path.dirname(file),
          specifier + (path.extname(specifier) ? "" : ".ts"),
        ),
      ),
    );
    return mod;
  }
  const mod = await get(path.resolve(relative));
  await mod.evaluate();
  return mod.namespace;
}

test("fixture coverage and stable deep-link target", async () => {
  const m = await load("src/modules/evidence/mocks/data.ts");
  assert.equal(m.documents.length, 24);
  assert.equal(new Set(m.documents.map((d) => d.evidenceLabel)).size, 8);
  assert.equal(m.chunks.find((c) => c.id === "c4812").documentId, "d014");
  assert.ok(
    m.documents.every(
      (d) => m.chunks.filter((c) => c.documentId === d.id).length === 8,
    ),
  );
  assert.ok(m.chunks.every((c) => /fictional|synthetic/i.test(c.text)));
});
test("keyword search, combined filters, pagination and no-result query", async () => {
  const m = await load("src/modules/evidence/mocks/data.ts");
  const params = { ...m.emptyParams, q: "bone loss", mode: "keyword" };
  const first = m.searchMock(params);
  assert.equal(first.hits.length, 20);
  assert.equal(first.total, 32);
  assert.ok(first.hits.every((h) => h.semanticScore === null));
  const next = m.searchMock({ ...params, cursor: first.nextCursor });
  assert.equal(next.hits.length, 12);
  assert.equal(
    new Set([...first.hits, ...next.hits].map((h) => h.chunk.id)).size,
    32,
  );
  assert.equal(
    m.searchMock({ ...params, labels: ["agency_guidance"] }).total,
    8,
  );
  assert.equal(m.searchMock({ ...params, from: "2100" }).total, 0);
  assert.equal(m.searchMock({ ...params, q: "capital of France" }).total, 0);
  assert.ok(
    first.hits.every((h) =>
      h.highlights.every(([a, b]) =>
        ["bone", "loss"].includes(h.chunk.text.slice(a, b).toLowerCase()),
      ),
    ),
  );
});
test("Ask cites retrieved passages, flags unsupported span, and refuses unrelated question", async () => {
  const m = await load("src/modules/evidence/services/evidence.ts");
  const events = [];
  await m.ask("bone loss", { topK: 4 }, (e) => events.push(e));
  const retrieved = events.find((e) => e.type === "retrieval");
  const answer = events
    .filter((e) => e.type === "token")
    .map((e) => e.text)
    .join("");
  assert.ok(answer.includes("[1]") && answer.includes("[2]"));
  assert.ok(
    events
      .filter((e) => e.type === "citation")
      .every((e) => retrieved.sources.some((h) => h.chunk.id === e.chunkId)),
  );
  const span = events.find((e) => e.type === "unsupported");
  assert.equal(
    answer.slice(span.start, span.end),
    "A benefit for future missions is not established.",
  );
  const unrelated = [];
  await m.ask("What is the capital of France?", { topK: 4 }, (e) =>
    unrelated.push(e),
  );
  assert.equal(unrelated.filter((e) => e.type === "token").length, 0);
  assert.equal(unrelated.at(-1).noAnswer, true);
});
test("cancelled mock request stops before emitting an answer", async () => {
  const m = await load("src/modules/evidence/services/evidence.ts");
  const ctrl = new AbortController();
  ctrl.abort();
  let count = 0;
  await assert.rejects(
    m.ask("bone loss", { topK: 4 }, () => count++, ctrl.signal),
    { name: "AbortError" },
  );
  assert.equal(count, 0);
});
test("real multipart import preserves file bytes and lets fetch set the boundary", async () => {
  let request;
  const m = await load(
    "src/modules/evidence/services/evidence.ts",
    false,
    async (url, init) => {
      request = { url, init };
      return Response.json([]);
    },
  );
  await m.importFiles(
    [new File(["body text"], "research.txt")],
    [{ title: "Research", evidenceLabel: "observational" }],
  );
  assert.equal(request.url, "/api/evidence/import");
  assert.ok(request.init.body instanceof FormData);
  assert.equal(request.init.headers["Content-Type"], undefined);
  assert.equal(await request.init.body.get("files").text(), "body text");
  assert.equal(JSON.parse(request.init.body.get("meta"))[0].title, "Research");
});
test("job stream uses GET and parser handles CRLF, split frames and trailing event", async () => {
  let method;
  const encoder = new TextEncoder();
  const m = await load(
    "src/modules/evidence/services/evidence.ts",
    false,
    async (_url, init) => {
      method = init.method;
      return new Response(
        new ReadableStream({
          start(controller) {
            for (const chunk of [
              "event: message\r\nda",
              'ta: {"id":"a","stage":"done"}\r\n\r\n',
              'data: {"id":"b","stage":"failed"}',
            ])
              controller.enqueue(encoder.encode(chunk));
            controller.close();
          },
        }),
        { headers: { "Content-Type": "text/event-stream" } },
      );
    },
  );
  const events = [];
  await m.streamJobs((e) => events.push(e));
  assert.equal(method, "GET");
  assert.deepEqual(
    events.map((e) => e.id),
    ["a", "b"],
  );
});
test("server errors are surfaced and never replaced with demo data", async () => {
  const m = await load(
    "src/modules/evidence/services/evidence.ts",
    false,
    async () =>
      Response.json({ message: "Index unavailable" }, { status: 503 }),
  );
  await assert.rejects(
    m.getDocument("d014"),
    (e) => e.status === 503 && e.message === "Index unavailable",
  );
});
test("QR generator works without a network service", async () => {
  const svg = await QRCode.toString("https://orbit.local", {
    type: "svg",
    margin: 4,
  });
  assert.ok(svg.includes("<svg"));
  assert.ok(!svg.includes("href="));
});
test("historical references preserve metric count, source pages and missing values", async () => {
  const rows = JSON.parse(
    await fs.readFile("src/modules/evidence/data/historical.json", "utf8"),
  );
  assert.equal(rows.length, 255);
  assert.equal(new Set(rows.map((r) => r.record_id)).size, 40);
  assert.equal(rows[0].value, "72");
  assert.equal(rows[0].source_pdf_page, "420");
  assert.equal(rows[0].posture, "");
});
test("production worker precaches shell and fonts and keeps APIs NetworkOnly", async () => {
  const source = await fs.readFile("dist/voice/sw.js", "utf8");
  assert.match(source, /NetworkOnly/);
  assert.match(source, /woff2/);
  assert.match(source, /index\.html/);
  assert.match(source, /EvidenceModule/);
  assert.match(source, /orbit-models-v1/);
  const config = await fs.readFile("vite.config.ts", "utf8");
  assert.match(config, /navigateFallbackDenylist/);
  assert.match(config, /handler: "NetworkOnly"/);
});

test("all document pages load and duplicate server pages fail explicitly", async () => {
  const requested = [];
  const m = await load(
    "src/modules/evidence/services/evidence.ts",
    false,
    async (url) => {
      requested.push(url);
      const offset = Number(
        new URL(url, "http://local").searchParams.get("from"),
      );
      return Response.json(
        Array.from({ length: offset === 0 ? 200 : 3 }, (_, i) => ({
          id: `c${offset + i}`,
          documentId: "large",
        })),
      );
    },
  );
  assert.equal((await m.getChunks("large")).length, 203);
  assert.equal(requested.length, 2);
  const broken = await load(
    "src/modules/evidence/services/evidence.ts",
    false,
    async () =>
      Response.json(Array.from({ length: 200 }, (_, i) => ({ id: `c${i}` }))),
  );
  await assert.rejects(broken.getChunks("large"), /repeated chunk page/);
});
test("cancelling an in-progress answer prevents completion", async () => {
  const m = await load("src/modules/evidence/services/evidence.ts");
  const controller = new AbortController();
  const events = [];
  await assert.rejects(
    m.ask(
      "bone loss",
      { topK: 4 },
      (e) => {
        events.push(e);
        if (e.type === "token") controller.abort();
      },
      controller.signal,
    ),
    { name: "AbortError" },
  );
  assert.equal(events.filter((e) => e.type === "token").length, 1);
  assert.ok(!events.some((e) => e.type === "done"));
});
test("generated worker routes exclude APIs from navigation fallback and cache only local models", async () => {
  const routes = [];
  let precache = [];
  const workbox = {
    precacheAndRoute(entries) {
      precache = entries;
    },
    cleanupOutdatedCaches() {},
    createHandlerBoundToURL(url) {
      return url;
    },
    registerRoute(...args) {
      routes.push(args);
    },
    NavigationRoute: class {
      constructor(handler, options) {
        this.handler = handler;
        this.options = options;
      }
    },
    NetworkOnly: class {},
    CacheFirst: class {
      constructor(options) {
        this.options = options;
      }
    },
    ExpirationPlugin: class {},
    CacheableResponsePlugin: class {},
  };
  const define = (_deps, factory) => factory(workbox);
  vm.runInNewContext(await fs.readFile("dist/voice/sw.js", "utf8"), {
    define,
    self: { define, addEventListener() {} },
  });
  assert.ok(precache.some((e) => e.url === "index.html"));
  assert.ok(
    !precache.some((e) => e.url.startsWith("/api") || e.url.endsWith(".map")),
  );
  const navigation = routes.find(
    ([r]) => r instanceof workbox.NavigationRoute,
  )[0];
  assert.ok(
    navigation.options.denylist.some((r) =>
      r.test("/api/evidence/search?q=bone"),
    ),
  );
  assert.ok(
    !navigation.options.denylist.some((r) => r.test("/evidence/offline")),
  );
  assert.ok(
    routes.some(
      ([pattern, handler]) =>
        pattern.test?.("/api/crew") && handler instanceof workbox.NetworkOnly,
    ),
  );
  const models = routes.find(
    ([, handler]) => handler instanceof workbox.CacheFirst,
  );
  assert.equal(
    models[0]({
      url: new URL("https://orbit.local/models/model.bin"),
      sameOrigin: true,
    }),
    true,
  );
  assert.equal(
    models[0]({
      url: new URL("https://other.example/models/model.bin"),
      sameOrigin: false,
    }),
    false,
  );
});

test("copied answers and notes retain unsupported-passage warnings", async () => {
  const { annotateUnsupported } = await load(
    "src/modules/evidence/services/answer.ts",
  );
  assert.equal(
    annotateUnsupported("Supported [1]. Guess.", [[15, 21]]),
    "Supported [1]. [Not supported by a retrieved passage: Guess.]",
  );
  assert.equal(
    annotateUnsupported("abcdef", [
      [1, 4],
      [3, 5],
    ]),
    "a[Not supported by a retrieved passage: bcde]f",
  );
});

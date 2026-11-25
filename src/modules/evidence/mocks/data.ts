import type {
  DiagnosticCheck,
  EvidenceChunk,
  EvidenceDocument,
  EvidenceLabel,
  Facets,
  IndexJob,
  NetworkInfo,
  SearchParams,
  SearchResponse,
  SourceType,
} from "../types";

export const LABELS: Record<EvidenceLabel, string> = {
  systematic_review: "Systematic review",
  randomized_trial: "Randomized trial",
  observational: "Observational study",
  spaceflight_study: "Spaceflight study",
  analog_study: "Analog study",
  agency_guidance: "Agency guidance",
  expert_opinion: "Expert opinion",
  product_rule: "Product rule",
};
export const TYPES: Record<SourceType, string> = {
  paper: "Peer-reviewed paper",
  agency_report: "Agency report",
  guideline: "Guideline",
  crew_procedure: "Crew procedure",
  textbook: "Textbook",
};
const subjects = [
  "Bone loss and mineral density",
  "Orthostatic intolerance",
  "Radiation dose limits",
  "Sleep and circadian timing",
  "Exercise countermeasures",
  "Nutrition and hydration",
  "Stress and team support",
  "ORBIT review band defaults",
];
const systems = [
  "musculoskeletal",
  "cardiovascular",
  "integumentary",
  "nervous",
  "musculoskeletal",
  "digestive",
  "nervous",
  "cardiovascular",
];
const labels = Object.keys(LABELS) as EvidenceLabel[];
const sourceTypes = Object.keys(TYPES) as SourceType[];
export const documents: EvidenceDocument[] = Array.from(
  { length: 24 },
  (_, i) => {
    const topic = i === 13 ? 0 : i % 8;
    return {
      id: `d${String(i + 1).padStart(3, "0")}`,
      title:
        i === 7
          ? subjects[7]
          : `Placeholder: ${subjects[topic]}${i > 7 ? ` — demo ${Math.floor(i / 8) + 1}` : ""}`,
      authors: ["Fictional research team"],
      venue: "Demo dataset",
      year: 2018 + (i % 8),
      doi: null,
      url: null,
      sourceType: sourceTypes[i % 5],
      evidenceLabel: labels[i % 8],
      topics: [subjects[topic].toLowerCase()],
      bodySystems: [systems[topic]],
      license: "Fictional demonstration content",
      addedAt: "2026-11-14T09:12:00Z",
      chunkCount: 8,
      hasOriginalPdf: false,
    };
  },
);
export const chunks: EvidenceChunk[] = documents.flatMap((doc, i) =>
  Array.from({ length: 8 }, (_, j) => ({
    id: i === 13 && j === 0 ? "c4812" : `c${i + 1}_${j + 1}`,
    documentId: doc.id,
    ordinal: j + 1,
    page: j + 7,
    section: ["Overview", "Methods", "Observations", "Limitations"][
      Math.floor(j / 2)
    ],
    text: `Fictional placeholder passage about ${doc.topics[0]}. ${j % 2 === 0 ? "This demonstration describes how a local library preserves the context of a research observation." : "This demonstration describes why study setting, measurement method and limitations must stay attached to an observation."} No numerical result or clinical recommendation is asserted. This text is synthetic and must not be cited as research. Passage ${j + 1} of this demo document.`,
  })),
);
export function searchMock(params: SearchParams): SearchResponse {
  const terms = params.q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  let hits = chunks.flatMap((chunk) => {
    const doc = documents.find((d) => d.id === chunk.documentId)!;
    if (
      (params.labels.length && !params.labels.includes(doc.evidenceLabel)) ||
      (params.systems.length &&
        !params.systems.some((s) => doc.bodySystems.includes(s))) ||
      (params.types.length && !params.types.includes(doc.sourceType)) ||
      (params.topics.length &&
        !params.topics.some((t) => doc.topics.includes(t))) ||
      (params.from && (doc.year ?? 0) < Number(params.from)) ||
      (params.to && (doc.year ?? 9999) > Number(params.to))
    )
      return [];
    const text = chunk.text.toLowerCase();
    const matches = terms.filter((t) =>
      `${doc.title.toLowerCase()} ${text}`.includes(t),
    );
    if (terms.length && matches.length !== terms.length) return [];
    const highlights: [number, number][] = [];
    for (const term of terms) {
      let from = 0;
      let at = text.indexOf(term, from);
      while (at >= 0) {
        highlights.push([at, at + term.length]);
        from = at + term.length;
        at = text.indexOf(term, from);
      }
    }
    const score = terms.length ? 0.82 - (chunk.ordinal - 1) * 0.025 : 0.5;
    return [
      {
        chunk,
        document: doc,
        score,
        semanticScore: params.mode === "keyword" ? null : score,
        keywordScore: params.mode === "semantic" ? null : score + 0.1,
        highlights,
      },
    ];
  });
  hits = hits.sort((a, b) =>
    params.sort === "newest"
      ? (b.document.year ?? 0) - (a.document.year ?? 0)
      : b.score - a.score,
  );
  const offset = Number(params.cursor ?? 0);
  return {
    hits: hits.slice(offset, offset + 20),
    total: hits.length,
    tookMs: 112,
    mode: params.mode,
    nextCursor: offset + 20 < hits.length ? String(offset + 20) : null,
  };
}
export const facets: Facets = {
  labels: {},
  systems: {},
  types: {},
  topics: {},
};
for (const d of documents) {
  for (const [key, values] of [
    ["labels", [d.evidenceLabel]],
    ["systems", d.bodySystems],
    ["types", [d.sourceType]],
    ["topics", d.topics],
  ] as const)
    for (const value of values)
      facets[key][value] = (facets[key][value] ?? 0) + 1;
}
export const network: NetworkInfo = {
  httpsUrl: "https://orbit.local",
  lanIp: "192.168.50.1",
  ssid: "ORBIT-HAB",
  connectedDevices: 3,
  certFingerprintSha256:
    "A18F29D73CC641B899DC5EF72A1364DB2F2E90C52203EE4FA0B84D439C1E7D62",
  certExpiresAt: "2027-11-14T00:00:00Z",
  internetReachable: false,
};
export const diagnostics: DiagnosticCheck[] = [
  "App shell cached",
  "Local HTTPS certificate",
  "FastAPI server reachable",
  "SQLite database integrity",
  "FAISS index and SQLite sync",
  "Embedding model",
  "Ollama and qwen3:8b",
  "Speech-to-text model",
  "Kokoro voices and weights",
  "Silero VAD model",
  "Smart Turn v3 model",
  "Anatomy 3D assets",
  "Free disk space",
].map((label, i) => ({
  id: `check-${i}`,
  label,
  level: i === 12 ? "caution" : "nominal",
  detail: [
    "Demo: v1 · 48 files",
    "Demo: trusted",
    "Demo: 12 ms",
    "Demo: integrity OK · 184 MB",
    "Demo: 12,480 vectors · 384 dimensions · IndexFlatIP · 0 orphans",
    "Demo: all-MiniLM-L6-v2 · 384 dimensions",
    "Demo: ready · qwen3:8b",
    "Demo: present",
    "Demo: present",
    "Demo: present",
    "Demo: present",
    "Demo: 128 MB cached",
    "Free disk space 4.2 GB",
  ][i],
  checkedAt: "2026-11-14T09:12:00Z",
}));
export let jobs: IndexJob[] = [
  {
    id: "job-1",
    fileName: "placeholder-bone-study.pdf",
    stage: "embed",
    progress: 0.64,
    chunks: 64,
    vectors: 41,
    startedAt: new Date().toISOString(),
  },
  {
    id: "job-2",
    fileName: "placeholder-procedure.md",
    stage: "done",
    progress: 1,
    chunks: 18,
    vectors: 18,
    startedAt: new Date().toISOString(),
  },
];
export function setJobs(value: IndexJob[]) {
  jobs = value;
}
export const emptyParams: SearchParams = {
  q: "",
  mode: "hybrid",
  labels: [],
  systems: [],
  types: [],
  topics: [],
  from: "",
  to: "",
  fullText: false,
  sort: "relevance",
};

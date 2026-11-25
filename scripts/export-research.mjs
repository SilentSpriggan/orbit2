// Exports the website's Evidence library (ui/research-library.js) as passages for the
// local server, so the crew voice assistant searches and cites the same entries the
// website shows. Run by `npm run build`; the output is committed so the server works
// without a build. tests/research-export.test.mjs fails if the two drift apart.
import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";

export const OUTPUT = fileURLToPath(new URL("../server/data/research-library.json", import.meta.url));

/** Stable chunk id for an entry; the website resolves it back to the entry (ui/mission.js). */
export function chunkId(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function exportResearch() {
  // A classic browser script, so evaluate it in a sandbox rather than import it.
  const source = readFileSync(new URL("../ui/research-library.js", import.meta.url), "utf8");
  const sandbox = { module: { exports: {} } };
  runInNewContext(source, sandbox, { filename: "ui/research-library.js" });
  const library = sandbox.module.exports;
  const passages = library.allItems().map((item) => {
    const sources = item.sources.map((id) => library.SOURCES[id]);
    return {
      // documentId is the website topic, so a citation opens #research on that topic.
      documentId: item.topic,
      chunkId: chunkId(item.title),
      title: `${item.title} (${sources.map((s) => s.cite).join("; ")})`,
      excerpt: item.text,
      evidence: library.EVIDENCE[item.evidence],
      topic: item.topicTitle,
      tracking: item.watch,
      // apa: the full APA 7 reference, where the library has one (<i> marks italics).
      sources: sources.map((s) => ({ cite: s.cite, title: s.title, journal: s.journal, url: s.url, ...(s.apa ? { apa: s.apa } : {}) })),
    };
  });
  return `${JSON.stringify({ generatedFrom: "ui/research-library.js", passages }, null, 1)}\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await writeFile(OUTPUT, exportResearch(), "utf8");
  console.log(`Exported the Evidence library to ${OUTPUT}.`);
}

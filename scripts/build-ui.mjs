import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { exportResearch, OUTPUT as RESEARCH_OUTPUT } from "./export-research.mjs";

// The voice assistant's server searches the same Evidence library the website shows.
await writeFile(RESEARCH_OUTPUT, exportResearch(), "utf8");

const root = fileURLToPath(new URL("../", import.meta.url));
const output = new URL("../dist/", import.meta.url);

// Remove generated output so deleted screens cannot survive a rebuild.
const outputPath = fileURLToPath(output);
if (relative(root, outputPath) !== "dist" || outputPath === resolve(root)) throw new Error("Invalid build output directory.");
await rm(outputPath, { recursive: true, force: true });
// Keep the React voice workspace available alongside the retained UI.
await build({ root, base: "/voice/", build: { outDir: "dist/voice", emptyOutDir: true } });
await mkdir(output, { recursive: true });
await cp(new URL("../ui/", import.meta.url), output, { recursive: true });
console.log("Built core workspaces at / and voice assistant at /voice/.");

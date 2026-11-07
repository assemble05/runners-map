// node tools/render.mjs <map.png|rows.txt|template.js> [--out preview.png] [--profile two-levels|circuit] [--tile 12] [--split-row N]
// Writes the preview: tiles, surfaces by role (green main route or network, blue branch, red error, orange
// warning), moves (yellow wall climb, grey jump or drop).

import { writeFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { parseArgs } from "./lib/args.mjs";
import { analysisOptions, loadAndAnalyze, printFindings } from "./lib/load.mjs";
import { renderPreview } from "../src/index.js";

const { positionals, options } = parseArgs(process.argv.slice(2));
const [file] = positionals;
if (!file) {
  console.error("usage: node tools/render.mjs <map.png|rows.txt|template.js> [--out preview.png] [--profile two-levels|circuit]");
  process.exit(2);
}
const result = await loadAndAnalyze(file, analysisOptions(options));
printFindings(result);
if (!result.layout.ok) process.exit(1);
const out = options.out ?? `${basename(file, extname(file)).replace(/\.rows$/, "")}.preview.png`;
writeFileSync(out, renderPreview(result.tiles, result.graph, result.validation));
console.log(`wrote ${out}`);

// node tools/convert.mjs <map.png|rows.txt> [--out records] [--name map] [--profile two-levels|circuit]
//   [--tile 12] [--split-row N] [--platform-gray] [--difficulty 0.3] [--weight 1] [--entry-row N] [--exit-row N] [--no-fail]
// Writes <out>/<name>.template.js, <name>.report.json and <name>.preview.png. Exit code 1 when the map is invalid.

import { mkdirSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { parseArgs } from "./lib/args.mjs";
import { analysisOptions, loadAndAnalyze, printFindings } from "./lib/load.mjs";
import { renderPreview, toModule } from "../src/index.js";

const { positionals, options } = parseArgs(process.argv.slice(2));
const [file] = positionals;
if (!file) {
  console.error("usage: node tools/convert.mjs <map.png|rows.txt> [--out dir] [--name map] [--profile two-levels|circuit] [--tile 12] [--split-row N] [--platform-gray] [--no-fail]");
  process.exit(2);
}
const name = options.name ?? basename(file, extname(file)).replace(/\.rows$/, "");
const out = options.out ?? "records";
const result = await loadAndAnalyze(file, {
  ...analysisOptions(options),
  name,
  difficulty: options.difficulty,
  weight: options.weight,
  entryRow: options.entryRow,
  exitRow: options.exitRow,
});
printFindings(result);
mkdirSync(out, { recursive: true });
if (result.layout.ok) {
  const analysis = { ...result.validation.report, ok: result.ok, errors: result.validation.errors, warnings: result.validation.warnings };
  writeFileSync(join(out, `${name}.template.js`), toModule(result.template, analysis, basename(file)));
  writeFileSync(join(out, `${name}.report.json`), JSON.stringify(analysis, null, 2));
  writeFileSync(join(out, `${name}.preview.png`), renderPreview(result.tiles, result.graph, result.validation));
  console.log(`wrote ${join(out, name)}.template.js, .report.json and .preview.png`);
}
if (!result.ok && options.noFail !== true) process.exit(1);

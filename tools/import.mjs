// node tools/import.mjs <drawing.png> [--out records] [--name map] [--tile 8] [--white-is-air]
//   [--profile zerun-circuit|two-levels|circuit] [--dead-ends barrier|fill|keep] [--min-fidelity 0.97]
//   [--min-stub-depth 3] [--platform-gray] [--split-row N] [--no-fail]
// The whole road from an attached drawing to game templates (ADR 0008). For every variant it writes
// <out>/<variant>.template.js, .report.json and .preview.png; for the drawing, <out>/<name>.import.json and
// <name>.diff.png. Exit code 1 when any variant is invalid or the fidelity is under the minimum.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { parseArgs } from "./lib/args.mjs";
import { printFindings } from "./lib/load.mjs";
import { encodePng, importImage, renderPreview, summarizeImport, toModule } from "../src/index.js";

const { positionals, options } = parseArgs(process.argv.slice(2));
const [file] = positionals;
if (!file || extname(file).toLowerCase() !== ".png") {
  console.error("usage: node tools/import.mjs <drawing.png> [--out dir] [--name map] [--tile N] [--white-is-air] [--profile zerun-circuit] [--dead-ends barrier|fill|keep] [--min-fidelity 0.97] [--no-fail]");
  process.exit(2);
}
const name = options.name ?? basename(file, extname(file)).replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
const out = options.out ?? "records";
const imported = importImage(readFileSync(file), {
  name,
  tile: options.tile,
  whiteIsAir: options.whiteIsAir === true,
  platformGray: options.platformGray === true,
  profile: options.profile,
  deadEnds: options.deadEnds,
  minFidelity: options.minFidelity,
  minStubDepth: options.minStubDepth,
  separatorRow: options.splitRow,
});
mkdirSync(out, { recursive: true });
const c = imported.corridors;
console.log(`${imported.topology} drawing, tile ${imported.tile} px: ${imported.tiles.cols}x${imported.tiles.rows} tiles; corridors min ${c.min}, p10 ${c.p10}, median ${c.median} tiles; fidelity ${pct(imported.fidelity.fidelity)}; openings left ${imported.openings.left.length}, right ${imported.openings.right.length}`);
for (const variant of imported.variants) {
  console.log(`--- ${variant.name}` + (variant.entry ? ` (entry row ${variant.entry.floorRow}, exit row ${variant.exit.floorRow}, closed ${variant.closed.length} other opening(s))` : " (closed circuit: no entry or exit of its own)"));
  for (const stub of variant.stubs) console.log(`stub ${stub.direction} at col ${stub.mouth.col}, row ${stub.mouth.row}: ${stub.depth} tiles deep, ${stub.width} wide, ${stub.cells} tiles of air, ${stub.sealed ? stub.treatment : "unsealed, kept"}`);
  printFindings(variant.result);
  const { result } = variant;
  const analysis = { ...result.validation.report, ok: result.ok, errors: result.validation.errors, warnings: result.validation.warnings, fidelity: variant.fidelity.fidelity, stubs: variant.stubs, entry: variant.entry, exit: variant.exit, closed: variant.closed, source: basename(file), tile: imported.tile };
  writeFileSync(join(out, `${variant.name}.template.js`), toModule(result.template, analysis, basename(file)));
  writeFileSync(join(out, `${variant.name}.report.json`), JSON.stringify(analysis, null, 2));
  if (result.graph) writeFileSync(join(out, `${variant.name}.preview.png`), renderPreview(result.tiles, result.graph, result.validation, { stubCells: variant.stubCells }));
}
writeFileSync(join(out, `${name}.import.json`), JSON.stringify(summarizeImport(imported), null, 2));
writeFileSync(join(out, `${name}.diff.png`), encodePng(imported.fidelity.diff));
console.log(`wrote ${imported.variants.length} variant(s) under ${out}/: template .js, report .json, preview .png; plus ${name}.import.json and ${name}.diff.png`);
if (!imported.ok && options.noFail !== true) process.exit(1);

function pct(ratio) {
  return `${Math.round(ratio * 1000) / 10}%`;
}

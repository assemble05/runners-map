// node tools/compare.mjs <drawing.png> <rows.txt|template.js> --tile N [--white-is-air] [--out diff.png]
// Draws the rows back at the drawing's pixel size and compares: the share kept (fidelity), the pixels that
// differ, their bounding box, and a diff picture (red: drawn but lost; blue: added by the tiles). Exit code 1
// under --min-fidelity (default 0.97).

import { readFileSync, writeFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "./lib/args.mjs";
import { compareToSource, decodePng, encodePng, fromRows, IMPORT, toCells } from "../src/index.js";

const { positionals, options } = parseArgs(process.argv.slice(2));
const [drawing, mapFile] = positionals;
if (!drawing || !mapFile || typeof options.tile !== "number") {
  console.error("usage: node tools/compare.mjs <drawing.png> <rows.txt|template.js> --tile N [--white-is-air] [--out diff.png] [--min-fidelity 0.97]");
  process.exit(2);
}
const cells = toCells(decodePng(readFileSync(drawing)), { whiteIsAir: options.whiteIsAir === true, platformGray: options.platformGray === true });
let rows;
if (extname(mapFile).toLowerCase() === ".txt") {
  rows = readFileSync(mapFile, "utf8").split(/\r?\n/).filter((line) => line.length > 0);
} else {
  const mod = await import(pathToFileURL(mapFile).href);
  rows = (mod.template ?? mod.default).rows;
}
const result = compareToSource(cells, fromRows(rows), options.tile);
const out = options.out ?? `${basename(drawing, extname(drawing))}.diff.png`;
writeFileSync(out, encodePng(result.diff));
const box = result.box ? `rows ${result.box.top}-${result.box.bottom}, cols ${result.box.left}-${result.box.right} (px)` : "none";
console.log(`fidelity ${Math.round(result.fidelity * 1000) / 10}%: ${result.mismatched} of ${result.compared} pixels differ, ${result.cropped} cropped; box ${box}; wrote ${out}`);
const minimum = options.minFidelity ?? IMPORT.minFidelity;
if (result.fidelity < minimum) process.exit(1);

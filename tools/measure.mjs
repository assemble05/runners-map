// node tools/measure.mjs <drawing.png> [--white-is-air] [--profile zerun-circuit] [--tiles 4,8,12,16]
// For each tile size: the grid, the corridor heights against the runner, the rows against the game's world,
// and the fidelity. Ends with the tile sizes that fit both, or what to change when none does (ADR 0008).

import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { parseArgs } from "./lib/args.mjs";
import { decodePng, IMPORT, toCells, measureTile } from "../src/index.js";

const { positionals, options } = parseArgs(process.argv.slice(2));
const [file] = positionals;
if (!file || extname(file).toLowerCase() !== ".png") {
  console.error("usage: node tools/measure.mjs <drawing.png> [--white-is-air] [--profile zerun-circuit] [--tiles 4,8,12,16]");
  process.exit(2);
}
const image = decodePng(readFileSync(file));
const cells = toCells(image, { whiteIsAir: options.whiteIsAir === true, platformGray: options.platformGray === true });
const candidates = typeof options.tiles === "string" ? options.tiles.split(",").map(Number) : typeof options.tiles === "number" ? [options.tiles] : IMPORT.tileCandidates;
const rows = candidates.filter((tile) => tile > 0 && tile <= Math.min(image.width, image.height) / 4).map((tile) => measureTile(cells, tile, { profile: options.profile }));
console.log(`${image.width}x${image.height} px; runner needs ${rows[0]?.standRows ?? 3} tiles of air to stand; world is ${rows[0]?.worldRows ?? "any"} rows`);
console.log(["tile", "grid", "corridor min/p10/median", "runner", "world", "fidelity"].join("\t"));
for (const r of rows) {
  console.log([r.tile, `${r.cols}x${r.rows}`, `${r.corridors.min}/${r.corridors.p10}/${r.corridors.median}`, r.fitsRunner ? "ok" : "too thin", r.fitsWorld ? "ok" : "too tall", `${Math.round(r.fidelity * 1000) / 10}%`].join("\t"));
}
const both = rows.filter((r) => r.fitsRunner && r.fitsWorld);
if (both.length) {
  console.log(`fits both: tile ${both.map((r) => r.tile).join(", ")}; the largest keeps the map smallest, the smallest keeps the drawing best`);
} else {
  const tallest = rows.filter((r) => r.fitsRunner).sort((a, b) => a.rows - b.rows)[0];
  const thinnest = rows.filter((r) => r.fitsWorld).sort((a, b) => a.tile - b.tile)[0];
  const parts = [];
  if (tallest) parts.push(`at tile ${tallest.tile} the corridors fit the runner but the map is ${tallest.rows} rows (world ${tallest.worldRows})`);
  if (thinnest) parts.push(`at tile ${thinnest.tile} the map fits the world but the corridors are ${thinnest.corridors.p10} tile(s) at p10 (runner ${thinnest.standRows}); redraw them at least ${thinnest.standRows * thinnest.tile} px thick`);
  console.log(`no tile fits both. ${parts.join("; ")}.`);
}

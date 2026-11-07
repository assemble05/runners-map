// node tools/rows-to-png.mjs <rows.txt> <out.png> [--tile 12]
// Draws a map image from template rows: white solid, grey platform, black empty.

import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "./lib/args.mjs";
import { encodePng, fromRows, rowsToImage } from "../src/index.js";

const { positionals, options } = parseArgs(process.argv.slice(2));
const [file, out] = positionals;
if (!file || !out) {
  console.error("usage: node tools/rows-to-png.mjs <rows.txt> <out.png> [--tile 12]");
  process.exit(2);
}
const tile = options.tile ?? 12;
const tiles = fromRows(readFileSync(file, "utf8").split(/\r?\n/).filter((line) => line.length > 0));
writeFileSync(out, encodePng(rowsToImage(tiles, tile)));
console.log(`wrote ${out} (${tiles.cols * tile}x${tiles.rows * tile})`);

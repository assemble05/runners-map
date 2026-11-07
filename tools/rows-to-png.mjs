// node tools/rows-to-png.mjs <rows.txt> <out.png> [--tile 12]
// Draws a map image from template rows: white solid, grey platform, black empty. The same picture an editor
// would save, so a map sketched in text can go through the image path.

import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "./lib/args.mjs";
import { encodePng, fromRows } from "../src/index.js";

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

export function rowsToImage(tilesGrid, size) {
  const width = tilesGrid.cols * size;
  const height = tilesGrid.rows * size;
  const rgba = new Uint8Array(width * height * 4);
  const shade = { empty: 0, solid: 255, platform: 128 };
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const v = shade[tilesGrid.kinds[Math.floor(y / size)][Math.floor(x / size)]];
      rgba.set([v, v, v, 255], (y * width + x) * 4);
    }
  }
  return { width, height, rgba };
}

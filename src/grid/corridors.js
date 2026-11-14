// How tall the corridors of a map are, column by column: the vertical runs of passable air inside the world
// region. The runner needs `headroom.stand` tiles to stand and `headroom.slide` to slide (config.js), so these
// numbers say whether a drawing was scaled right (ADR 0008).

import { isPassable } from "./tiles.js";
import { findWorldAir } from "../graph/surfaces.js";

function quantile(sorted, p) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

/** Corridor heights in tiles: { count, min, p10, median, p90, max }. */
export function corridorStats(tiles) {
  const { world } = findWorldAir(tiles);
  const heights = [];
  for (let col = 0; col < tiles.cols; col += 1) {
    let run = 0;
    for (let row = 0; row <= tiles.rows; row += 1) {
      const air = row < tiles.rows && world[row * tiles.cols + col] === 1 && isPassable(tiles, col, row);
      if (air) run += 1;
      else if (run > 0) {
        heights.push(run);
        run = 0;
      }
    }
  }
  heights.sort((a, b) => a - b);
  return {
    count: heights.length,
    min: heights[0] ?? 0,
    p10: quantile(heights, 0.1),
    median: quantile(heights, 0.5),
    p90: quantile(heights, 0.9),
    max: heights[heights.length - 1] ?? 0,
  };
}

// Ramps (the owner, 09/11): every rise and every descent of one tile is a ramp, not a step. A diagonal drawn as stacked
// squares is a staircase, and the runner should walk it, not jump every step. The riser of each 1-tile step becomes a
// ramp tile: '/' when the floor rises to the right (solid lower-right triangle), '\' when it rises to the left (solid
// lower-left triangle). The air cells do not change, so corridors, gates and routes stay as they were.
//
// A riser is a solid tile with air beside it (the lower standing cell), air above it (the upper standing cell), and solid
// under both. Every riser is a ramp; a rise of two or more tiles is not a ramp and is a jump, judged by surfaces.js.

import { KIND, cloneTiles, isAir, isSolid, isStandable } from "./tiles.js";

/** A riser rising to `dir` (+1: the floor rises to the right): the lower standing cell is at col - dir, the upper above it. */
function isRiser(tiles, col, row, dir) {
  const lower = col - dir;
  return isSolid(tiles, col, row) && isStandable(tiles, col, row + 1) && isAir(tiles, lower, row) && isStandable(tiles, lower, row + 1) && isAir(tiles, col, row - 1);
}

/** The ramp tiles of a grid: [{ col, row, dir }] with dir +1 for '/' and -1 for '\'. Every 1-tile riser is one. */
export function findRamps(tiles) {
  const ramps = [];
  for (let row = 1; row < tiles.rows - 1; row += 1) {
    for (let col = 1; col < tiles.cols - 1; col += 1) {
      for (const dir of [1, -1]) if (isRiser(tiles, col, row, dir)) ramps.push({ col, row, dir });
    }
  }
  return ramps;
}

/** A copy of the grid with its risers turned into ramp tiles. Returns { tiles, ramps }. */
export function applyRamps(tiles) {
  const ramps = findRamps(tiles);
  const out = cloneTiles(tiles);
  for (const { col, row, dir } of ramps) out.kinds[row][col] = dir > 0 ? KIND.RAMP_RIGHT : KIND.RAMP_LEFT;
  return { tiles: out, ramps };
}

/** Whether the tile is a ramp of either kind. */
export function isRamp(tiles, col, row) {
  const kind = tiles.kinds[row]?.[col];
  return kind === KIND.RAMP_RIGHT || kind === KIND.RAMP_LEFT;
}

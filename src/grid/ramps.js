// Ramps (the owner, 09/11): a diagonal drawn as stacked squares is a staircase of 1-tile steps, and Zerun's runner cannot
// climb a 1-tile step under a low ceiling (the body is 30 px and must rise 12 px under it). The drawing meant a slope, so
// the riser of each step becomes a ramp tile: '/' when the floor rises to the right (solid lower-right triangle), '\'
// when it rises to the left (solid lower-left triangle). The runner walks up and down without a jump, and the air cells
// do not change, so corridors, gates and routes stay as they were.
//
// A riser is a solid tile with air beside it (the lower standing cell), air above it (the upper standing cell), and solid
// under both. It becomes a ramp when it is part of a staircase (another riser one tile up and over, or one tile down and
// back) or when the lower standing cell has less than 4 tiles of air above its floor, where a jump cannot make the step.

import { KIND, cloneTiles, isAir, isSolid, isStandable } from "./tiles.js";

const STEP_CLEARANCE = 4;

function heightAbove(tiles, col, row) {
  let top = row;
  while (isAir(tiles, col, top - 1)) top -= 1;
  return row - top + 1;
}

/** A riser rising to `dir` (+1: the floor rises to the right): the lower standing cell is at col - dir, the upper above it. */
function isRiser(tiles, col, row, dir) {
  const lower = col - dir;
  return isSolid(tiles, col, row) && isStandable(tiles, col, row + 1) && isAir(tiles, lower, row) && isStandable(tiles, lower, row + 1) && isAir(tiles, col, row - 1);
}

/**
 * The ramp tiles of a grid: [{ col, row, dir }] with dir +1 for '/' and -1 for '\'. A riser qualifies when it continues
 * a staircase (a riser at (col + dir, row - 1) or (col - dir, row + 1)) or when the lower standing cell has less than
 * STEP_CLEARANCE tiles of air.
 */
export function findRamps(tiles) {
  const ramps = [];
  for (let row = 1; row < tiles.rows - 1; row += 1) {
    for (let col = 1; col < tiles.cols - 1; col += 1) {
      for (const dir of [1, -1]) {
        if (!isRiser(tiles, col, row, dir)) continue;
        const stair = isRiser(tiles, col + dir, row - 1, dir) || isRiser(tiles, col - dir, row + 1, dir);
        const low = heightAbove(tiles, col - dir, row) < STEP_CLEARANCE;
        if (stair || low) ramps.push({ col, row, dir });
      }
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

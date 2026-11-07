// Where the two levels are and where the two climbable walls are.
//
// A map is two levels stacked: the lower one on the floor, the upper one on a slab. The slab leaves a shaft open
// at each end, next to the outer walls; those two walls are the only way between the levels. The separator is the
// slab: the interior row with the most solid tiles that is neither the floor nor the ceiling. A level is told by
// the row of its floor: a surface whose floor tile is on or above the slab is upper, below it is lower.

import { isSolid, isStandable } from "./tiles.js";
import { RULES } from "../config.js";

function solidRun(tiles, col) {
  let best = { top: -1, bottom: -1 };
  let start = -1;
  for (let row = 0; row <= tiles.rows; row += 1) {
    const solid = row < tiles.rows && isSolid(tiles, col, row);
    if (solid && start < 0) start = row;
    if (!solid && start >= 0) {
      if (row - start > best.bottom - best.top) best = { top: start, bottom: row - 1 };
      start = -1;
    }
  }
  return best;
}

function firstSolidColumn(tiles, order) {
  for (const col of order) {
    for (let row = 0; row < tiles.rows; row += 1) if (isSolid(tiles, col, row)) return col;
  }
  return -1;
}

/** Finds the outer walls: the longest solid run in the leftmost and rightmost solid columns. */
export function findWalls(tiles) {
  const cols = Array.from({ length: tiles.cols }, (_unused, i) => i);
  const leftCol = firstSolidColumn(tiles, cols);
  const rightCol = firstSolidColumn(tiles, [...cols].reverse());
  if (leftCol < 0 || rightCol < 0 || leftCol === rightCol) return null;
  return {
    left: { col: leftCol, ...solidRun(tiles, leftCol) },
    right: { col: rightCol, ...solidRun(tiles, rightCol) },
  };
}

/** Finds the row of the slab that separates the levels. Returns { row, fill } or null. */
export function findSeparator(tiles, walls, options = {}) {
  const minFill = options.separatorFill ?? RULES.separatorFill;
  const inner = walls.right.col - walls.left.col - 1;
  if (inner <= 0) return null;
  const floorRow = lastStandingRow(tiles, walls);
  const ceilingRow = firstSolidRow(tiles, walls);
  const candidates = [];
  for (let row = ceilingRow + 1; row < floorRow; row += 1) {
    let filled = 0;
    for (let col = walls.left.col + 1; col < walls.right.col; col += 1) if (isStandable(tiles, col, row)) filled += 1;
    const fill = filled / inner;
    if (fill >= minFill) candidates.push({ row, fill });
  }
  if (candidates.length === 0) return null;
  const middle = (ceilingRow + floorRow) / 2;
  candidates.sort((a, b) => b.fill - a.fill || Math.abs(a.row - middle) - Math.abs(b.row - middle));
  return candidates[0];
}

function lastStandingRow(tiles, walls) {
  for (let row = tiles.rows - 1; row >= 0; row -= 1) {
    for (let col = walls.left.col + 1; col < walls.right.col; col += 1) if (isStandable(tiles, col, row)) return row;
  }
  return tiles.rows - 1;
}

function firstSolidRow(tiles, walls) {
  for (let row = 0; row < tiles.rows; row += 1) {
    let filled = 0;
    for (let col = walls.left.col + 1; col < walls.right.col; col += 1) if (isSolid(tiles, col, row)) filled += 1;
    if (filled === walls.right.col - walls.left.col - 1) return row;
  }
  return -1;
}

/** Describes the two levels and the extremity zones. `separatorRow` may be forced by the caller. */
export function describeLevels(tiles, options = {}) {
  const walls = findWalls(tiles);
  if (!walls) return { ok: false, error: "no outer walls: the map needs a solid column at each side" };
  const separator = options.separatorRow !== undefined ? { row: options.separatorRow, fill: null } : findSeparator(tiles, walls, options);
  if (!separator) return { ok: false, error: "no separator: no interior row is at least half solid between the ceiling and the floor; pass --split-row" };
  const extremityCols = options.extremityCols ?? RULES.extremityCols;
  const width = walls.right.col - walls.left.col - 1;
  return {
    ok: true,
    walls,
    separatorRow: separator.row,
    separatorFill: separator.fill,
    width,
    leftZoneMax: walls.left.col + extremityCols,
    rightZoneMin: walls.right.col - extremityCols,
    levels: [
      { name: "lower", floorRows: [separator.row + 1, tiles.rows - 1] },
      { name: "upper", floorRows: [0, separator.row] },
    ],
  };
}

/** The level of a surface, by the row of the tile it stands on. */
export function levelOfFloorRow(layout, floorRow) {
  return floorRow <= layout.separatorRow ? "upper" : "lower";
}

export function zoneOfColumn(layout, col) {
  if (col <= layout.leftZoneMax) return "left";
  if (col >= layout.rightZoneMin) return "right";
  return "middle";
}

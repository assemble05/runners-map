// Where a map opens to the outside, and the variants that follow from it (ADR 0008).
//
// An opening is a run of world air on the left or right border of the grid: a corridor that reaches the edge.
// A piece with at least one opening on each side is a stretch: it enters on the left and leaves on the right,
// and the engine stitches it into the course at those floors. A piece with none is a circuit: a closed loop.
// A stretch with several openings on a side becomes one variant per (entry, exit) pair; in each variant the
// other openings are closed with a solid tile on the border, which leaves a stub for the stub treatment.

import { cloneTiles, isPassable, isStandable, KIND } from "./tiles.js";
import { findWorldAir } from "../graph/surfaces.js";

function runsOnColumn(tiles, world, col, side) {
  const openings = [];
  let start = -1;
  for (let row = 0; row <= tiles.rows; row += 1) {
    const air = row < tiles.rows && isPassable(tiles, col, row) && world[row * tiles.cols + col] === 1;
    if (air && start < 0) start = row;
    if (!air && start >= 0) {
      const bottom = row - 1;
      const floorRow = bottom + 1 < tiles.rows && isStandable(tiles, col, bottom + 1) ? bottom + 1 : null;
      openings.push({ side, col, top: start, bottom, floorRow });
      start = -1;
    }
  }
  return openings;
}

/** Lists the openings of a grid by side and names its topology: "stretch" or "circuit". */
export function findOpenings(tiles) {
  const { world } = findWorldAir(tiles);
  const left = runsOnColumn(tiles, world, 0, "left");
  const right = runsOnColumn(tiles, world, tiles.cols - 1, "right");
  const topology = left.length > 0 && right.length > 0 ? "stretch" : "circuit";
  return { left, right, topology };
}

function closeOpening(tiles, opening) {
  for (let row = opening.top; row <= opening.bottom; row += 1) tiles.kinds[row][opening.col] = KIND.SOLID;
}

/** The variants of a stretch: one per (entry, exit) pair of openings with a floor. A circuit has one variant,
 * itself, with no entry or exit of its own. */
export function listVariants(tiles, openings, name) {
  if (openings.topology !== "stretch") return [{ name, entry: null, exit: null, tiles: cloneTiles(tiles), closed: [] }];
  const entries = openings.left.filter((opening) => opening.floorRow !== null);
  const exits = openings.right.filter((opening) => opening.floorRow !== null);
  const single = entries.length === 1 && exits.length === 1;
  const variants = [];
  for (const entry of entries) {
    for (const exit of exits) {
      const copy = cloneTiles(tiles);
      const closed = [];
      for (const other of [...openings.left, ...openings.right]) {
        if (other === entry || other === exit) continue;
        closeOpening(copy, other);
        closed.push({ side: other.side, top: other.top, bottom: other.bottom });
      }
      variants.push({ name: single ? name : `${name}-e${entry.floorRow}-x${exit.floorRow}`, entry, exit, tiles: copy, closed });
    }
  }
  return variants;
}

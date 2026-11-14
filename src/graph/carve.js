// Declared passages (the owner, 09/11): where the body cannot make a rise the drawing has, the rock above the takeoff and
// along the jump is opened, so the runner can pass. Only solid rock is opened, never a ramp (a ramp is the floor). Every
// cell opened is returned, so the report names each one and the fidelity loss is measured, not hidden. The drawing stays
// the source; this is the one change the tool makes to it, and only for the zerun profiles and only where the body
// is blocked.

import { KIND, cloneTiles } from "../grid/tiles.js";
import { blockedRises, buildGraph } from "./surfaces.js";

/**
 * Opens the rock a blocked rise needs, round by round (opening one rise can unblock another), up to `rounds`. Returns
 * { tiles, carved: [{ col, row }] } with the cells in the order they were opened.
 */
export function carveRises(tiles, physics, rounds = 4) {
  let current = tiles;
  const carved = [];
  for (let round = 0; round < rounds; round += 1) {
    const graph = buildGraph(current, physics);
    const blocked = blockedRises(current, graph, physics);
    if (!blocked.length) break;
    const next = cloneTiles(current);
    let opened = 0;
    for (const { from, to, needed } of blocked) {
      const lo = Math.min(from.col, to.col), hi = Math.max(from.col, to.col);
      for (let col = lo; col <= hi; col += 1) {
        // the rows above the takeoff's standing row, never that row: it is the air the runner stands in, and in the
        // columns of the landing it is the top of the floor it lands on
        for (let k = 1; k < needed; k += 1) {
          const row = from.row - k;
          if (row < 0 || next.kinds[row][col] !== KIND.SOLID) continue;
          next.kinds[row][col] = KIND.EMPTY;
          carved.push({ col, row });
          opened += 1;
        }
      }
    }
    if (!opened) break;
    current = next;
  }
  return { tiles: current, carved };
}

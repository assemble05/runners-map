// The running height (the zerun-laps profile, decided 08/11 by the owner): a part that is run through needs 1.5 x the
// double jump's apex as air above it. Every floor tile of the track is such a part, so the air above each one is counted
// in tiles, up to the first solid tile. A platform is passed through, so it is not a ceiling.

import { isPassable, isStandable } from "../grid/tiles.js";

/**
 * The clearance above every floor tile: how many of its tiles are air, and how many of those fall short of minTiles.
 * `exempt` is a set of "col,row" floor tiles that are slid over (a slide tunnel), where the running height does not apply.
 */
export function runHeightOf(tiles, minTiles, exempt = null) {
  const clearances = [];
  let low = 0;
  for (let row = 1; row < tiles.rows; row += 1) {
    for (let col = 0; col < tiles.cols; col += 1) {
      if (!isStandable(tiles, col, row) || !isPassable(tiles, col, row - 1)) continue;
      if (exempt && exempt.has(`${col},${row}`)) continue;
      let height = 0;
      for (let r = row - 1; r >= 0 && isPassable(tiles, col, r); r -= 1) height += 1;
      clearances.push(height);
      if (height < minTiles) low += 1;
    }
  }
  clearances.sort((a, b) => a - b);
  const floors = clearances.length;
  return {
    minTiles,
    floors,
    low,
    share: floors === 0 ? 0 : Math.round((low / floors) * 1000) / 1000,
    lowest: floors === 0 ? null : clearances[0],
    median: floors === 0 ? null : clearances[Math.floor(floors / 2)],
    highest: floors === 0 ? null : clearances[floors - 1],
  };
}

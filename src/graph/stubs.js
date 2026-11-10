// Dead-end corridors (stubs) and what to do with them (ADR 0008).
//
// The surface graph sees a dead end only when the stub's floor is a separate surface. A corridor that just
// stops, at the same height as the lane it leaves, is the same surface, so the graph is silent; the player
// still runs into a wall and comes back. Stubs are found on the shape instead: the world air is thinned to a
// one-tile skeleton (Zhang-Suen), an endpoint of the skeleton is a corridor that stops, and the path from it
// back to the first junction is the stub. Its depth is that path's length in tiles; spurs shorter than
// `minDepth` are corners, not corridors. The mouth is the corridor's cross-section where the stub meets the
// junction; the stub's air is what the mouth seals off.
//
// Treatments: `barrier` puts a barrier ('W') on every tile of the mouth, so the pocket becomes decoration the
// runner cannot enter (geometry unchanged, fidelity unchanged); `fill` turns the stub's air to solid (fidelity
// drops, reported); `keep` only reports.

import { cloneTiles, isAir, isPassable, isSolid, KIND, setMark } from "../grid/tiles.js";
import { findWorldAir } from "./surfaces.js";

const NEIGHBOURS8 = Object.freeze([[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]]);

function at(mask, cols, rows, x, y) {
  if (x < 0 || y < 0 || x >= cols || y >= rows) return 0;
  return mask[y * cols + x];
}

/** Zhang-Suen thinning of a binary mask to a one-tile, 8-connected skeleton. Pure; returns a new mask. */
export function thin(mask, cols, rows) {
  const skeleton = Uint8Array.from(mask);
  let changed = true;
  while (changed) {
    changed = false;
    for (const pass of [0, 1]) {
      const remove = [];
      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
          if (skeleton[y * cols + x] !== 1) continue;
          const p = NEIGHBOURS8.map(([dx, dy]) => at(skeleton, cols, rows, x + dx, y + dy));
          const black = p.reduce((sum, v) => sum + v, 0);
          if (black < 2 || black > 6) continue;
          let transitions = 0;
          for (let i = 0; i < 8; i += 1) if (p[i] === 0 && p[(i + 1) % 8] === 1) transitions += 1;
          if (transitions !== 1) continue;
          const [p2, , p4, , p6, , p8] = p;
          const first = pass === 0 ? p2 * p4 * p6 : p2 * p4 * p8;
          const second = pass === 0 ? p4 * p6 * p8 : p2 * p6 * p8;
          if (first !== 0 || second !== 0) continue;
          remove.push(y * cols + x);
        }
      }
      for (const i of remove) skeleton[i] = 0;
      if (remove.length) changed = true;
    }
  }
  return skeleton;
}

function skeletonNeighbours(skeleton, cols, rows, x, y) {
  const found = [];
  for (const [dx, dy] of NEIGHBOURS8) if (at(skeleton, cols, rows, x + dx, y + dy) === 1) found.push([x + dx, y + dy]);
  return found;
}

/** Walks a skeleton from an endpoint to the first junction. Returns the path (endpoint first) and whether a
 * junction was reached; a path that ends at another endpoint is a whole line, not a stub. */
function walkStub(skeleton, cols, rows, endpoint) {
  const path = [endpoint];
  const visited = new Set([`${endpoint[0]},${endpoint[1]}`]);
  let current = endpoint;
  while (true) {
    const next = skeletonNeighbours(skeleton, cols, rows, current[0], current[1]).filter(([x, y]) => !visited.has(`${x},${y}`));
    if (next.length === 0) return { path, junction: null };
    const degree = skeletonNeighbours(skeleton, cols, rows, next[0][0], next[0][1]).length;
    if (next.length > 1 || degree >= 3) return { path, junction: next[0] };
    current = next[0];
    path.push(current);
    visited.add(`${current[0]},${current[1]}`);
  }
}

/** The corridor cross-section through `cell`, perpendicular to the stub's direction. */
function crossSection(tiles, world, cell, horizontal) {
  const cells = [];
  const [cx, cy] = cell;
  const inWorld = (x, y) => isPassable(tiles, x, y) && world[y * tiles.cols + x] === 1;
  if (horizontal) {
    let top = cy;
    while (inWorld(cx, top - 1)) top -= 1;
    let bottom = cy;
    while (inWorld(cx, bottom + 1)) bottom += 1;
    for (let y = top; y <= bottom; y += 1) cells.push([cx, y]);
  } else {
    let left = cx;
    while (inWorld(left - 1, cy)) left -= 1;
    let right = cx;
    while (inWorld(right + 1, cy)) right += 1;
    for (let x = left; x <= right; x += 1) cells.push([x, cy]);
  }
  return cells;
}

/** The air sealed off by the mouth: what the runner could reach from the endpoint without crossing it. */
function sealedRegion(tiles, world, mouth, endpoint) {
  const blocked = new Set(mouth.map(([x, y]) => `${x},${y}`));
  const seen = new Set();
  const stack = [endpoint];
  const region = [];
  while (stack.length) {
    const [x, y] = stack.pop();
    const key = `${x},${y}`;
    if (seen.has(key) || blocked.has(key)) continue;
    if (!isPassable(tiles, x, y) || world[y * tiles.cols + x] !== 1) continue;
    seen.add(key);
    region.push([x, y]);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) stack.push([x + dx, y + dy]);
  }
  return region;
}

/** Finds the stubs of a tile grid. Options: minDepth (tiles). */
export function findStubs(tiles, options = {}) {
  const minDepth = options.minDepth ?? 3;
  const { cols, rows } = tiles;
  const { world } = findWorldAir(tiles);
  const mask = new Uint8Array(cols * rows);
  let airCount = 0;
  for (let i = 0; i < mask.length; i += 1) {
    if (world[i] === 1) {
      mask[i] = 1;
      airCount += 1;
    }
  }
  const skeleton = thin(mask, cols, rows);
  const stubs = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (skeleton[y * cols + x] !== 1 || skeletonNeighbours(skeleton, cols, rows, x, y).length !== 1) continue;
      const { path, junction } = walkStub(skeleton, cols, rows, [x, y]);
      if (junction === null) continue;
      const depth = path.length;
      if (depth < minDepth) continue;
      const mouthCell = path[path.length - 1];
      const dx = Math.abs(mouthCell[0] - junction[0]);
      const dy = Math.abs(mouthCell[1] - junction[1]);
      const horizontal = Math.abs(path[0][0] - junction[0]) >= Math.abs(path[0][1] - junction[1]);
      const mouth = crossSection(tiles, world, mouthCell, horizontal);
      const region = sealedRegion(tiles, world, mouth, path[0]);
      const sealed = region.length > 0 && region.length < airCount / 2;
      stubs.push({
        id: stubs.length,
        end: { col: path[0][0], row: path[0][1] },
        mouth: { col: mouthCell[0], row: mouthCell[1] },
        junction: { col: junction[0], row: junction[1] },
        direction: horizontal ? (path[0][0] < junction[0] ? "left" : "right") : path[0][1] < junction[1] ? "up" : "down",
        depth,
        width: mouth.length,
        cells: region.length,
        sealed,
        mouthCells: mouth,
        regionCells: region,
        step: { dx, dy },
      });
    }
  }
  stubs.sort((a, b) => a.mouth.col - b.mouth.col || a.mouth.row - b.mouth.row);
  return stubs.map((stub, id) => ({ ...stub, id }));
}

/** Applies a treatment to the sealed stubs: "barrier", "fill" or "keep". Returns new tiles and the stubs with
 * their treatment. Unsealed stubs (the mouth did not close them off) are kept and reported. */
export function treatStubs(tiles, stubs, treatment) {
  const next = cloneTiles(tiles);
  const treated = stubs.map((stub) => {
    if (!stub.sealed || treatment === "keep") return { ...stub, treatment: "keep" };
    if (treatment === "barrier") {
      for (const [x, y] of stub.mouthCells) if (isAir(next, x, y)) setMark(next, x, y, "W");
      return { ...stub, treatment: "barrier" };
    }
    if (treatment === "fill") {
      for (const [x, y] of [...stub.regionCells, ...stub.mouthCells]) if (!isSolid(next, x, y)) next.kinds[y][x] = KIND.SOLID;
      return { ...stub, treatment: "fill" };
    }
    throw new Error(`unknown dead-end treatment "${treatment}"; use barrier, fill or keep`);
  });
  return { tiles: next, stubs: treated };
}

/** What the report keeps of a stub: no cell lists. */
export function describeStub(stub) {
  const { mouthCells, regionCells, step, ...rest } = stub;
  return rest;
}

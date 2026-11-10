// The map as a graph the runner can be asked about.
//
// A node is a surface: a maximal horizontal run of tiles the runner can stand in (an air tile over a solid or
// platform tile, with enough headroom). An edge is a move between two surfaces: a jump, a drop or a wall climb.
// A pair of surfaces can have several edges when the move leaves from different sides (the left end and the
// right end of a platform over a floor are two different ways on and off it), so degrees and bridges mean what a
// player feels.
//
// A jump or drop is an L: horizontal then vertical, or vertical then horizontal, through tiles that are not
// solid (thin platforms are passed through). It is an approximation of the arc; the reach numbers are in config.js.

import { isAir, isPassable, isSolid, isStandable } from "../grid/tiles.js";
import { isRamp } from "../grid/ramps.js";
import { PHYSICS } from "../config.js";

export const EDGE = Object.freeze({ JUMP: "jump", DROP: "drop", WALL: "wall" });

/** The air the runner can be in: the region of passable tiles (4-connected) that holds the most standing tiles.
 * Air sealed away from it (a cavity, a decorative hole, a sky above a closed ceiling, a pocket behind a barrier)
 * is a pocket; nothing stands there. Returns { world, pockets }: a mask of the world air and the count of other
 * regions. */
export function findWorldAir(tiles) {
  const label = new Int32Array(tiles.cols * tiles.rows).fill(-1);
  const sizes = [];
  for (let row = 0; row < tiles.rows; row += 1) {
    for (let col = 0; col < tiles.cols; col += 1) {
      if (!isPassable(tiles, col, row) || label[row * tiles.cols + col] >= 0) continue;
      const id = sizes.length;
      let size = 0;
      const stack = [[col, row]];
      label[row * tiles.cols + col] = id;
      while (stack.length) {
        const [x, y] = stack.pop();
        size += 1;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx;
          const ny = y + dy;
          if (!isPassable(tiles, nx, ny) || label[ny * tiles.cols + nx] >= 0) continue;
          label[ny * tiles.cols + nx] = id;
          stack.push([nx, ny]);
        }
      }
      sizes.push(size);
    }
  }
  const standing = new Int32Array(sizes.length);
  for (let row = 0; row < tiles.rows - 1; row += 1) {
    for (let col = 0; col < tiles.cols; col += 1) {
      const id = label[row * tiles.cols + col];
      if (id >= 0 && isAir(tiles, col, row) && isStandable(tiles, col, row + 1)) standing[id] += 1;
    }
  }
  let best = 0;
  for (let id = 1; id < sizes.length; id += 1) if (standing[id] > standing[best]) best = id;
  const world = new Uint8Array(tiles.cols * tiles.rows);
  if (sizes.length > 0) for (let i = 0; i < label.length; i += 1) if (label[i] === best) world[i] = 1;
  return { world, pockets: Math.max(0, sizes.length - 1) };
}

/** Passable tiles from `row` upward, `row` included: how tall a runner standing in it may be. */
export function headroomAt(tiles, col, row) {
  let count = 0;
  for (let y = row; y >= 0 && isPassable(tiles, col, y); y -= 1) count += 1;
  return count;
}

/** Lists the surfaces of a tile grid, in the world air only. A cell with less headroom than the runner needs
 * to slide is not a place to stand; a cell with less than it needs to stand is counted in `lowCells`. */
export function findSurfaces(tiles, physics = PHYSICS) {
  const headroom = physics.headroom ?? PHYSICS.headroom;
  const { world, pockets } = findWorldAir(tiles);
  const surfaces = [];
  const at = new Map();
  let lowCells = 0;
  let crushedCells = 0;
  for (let row = 0; row < tiles.rows - 1; row += 1) {
    let start = -1;
    let low = 0;
    for (let col = 0; col <= tiles.cols; col += 1) {
      let standing = col < tiles.cols && world[row * tiles.cols + col] === 1 && isAir(tiles, col, row) && isStandable(tiles, col, row + 1);
      if (standing) {
        const room = headroomAt(tiles, col, row);
        if (room < headroom.slide) {
          standing = false;
          crushedCells += 1;
        } else if (room < headroom.stand) {
          low += 1;
        }
      }
      if (standing && start < 0) start = col;
      if (!standing && start >= 0) {
        const id = surfaces.length;
        surfaces.push({ id, row, floorRow: row + 1, x0: start, x1: col - 1, lowCells: low });
        for (let c = start; c < col; c += 1) at.set(`${c},${row}`, id);
        lowCells += low;
        start = -1;
        low = 0;
      }
    }
  }
  return { surfaces, at, pockets, lowCells, crushedCells };
}

export function surfaceAt(graph, col, row) {
  const id = graph.at.get(`${col},${row}`);
  return id === undefined ? null : graph.surfaces[id];
}

function clearColumn(tiles, col, fromRow, toRow) {
  const [a, b] = fromRow < toRow ? [fromRow, toRow] : [toRow, fromRow];
  for (let row = a; row <= b; row += 1) if (!isPassable(tiles, col, row)) return false;
  return true;
}

function clearRow(tiles, row, fromCol, toCol) {
  const [a, b] = fromCol < toCol ? [fromCol, toCol] : [toCol, fromCol];
  for (let col = a; col <= b; col += 1) if (!isPassable(tiles, col, row)) return false;
  return true;
}

/**
 * A fall is free: the runner drops and steers in the air, so its path is the straight line from takeoff to landing, not an
 * L. Clear when every tile on the line is passable (the cells are walked with a DDA, both ends included).
 */
export function clearLine(tiles, from, to) {
  const steps = Math.max(Math.abs(to.col - from.col), Math.abs(to.row - from.row));
  if (steps === 0) return isPassable(tiles, from.col, from.row);
  for (let i = 0; i <= steps; i += 1) {
    const col = Math.round(from.col + ((to.col - from.col) * i) / steps);
    const row = Math.round(from.row + ((to.row - from.row) * i) / steps);
    if (!isPassable(tiles, col, row)) return false;
  }
  return true;
}

/** An L-shaped path between two tiles is clear when one of its two corners is free of solid or blocking tiles. */
export function clearL(tiles, from, to) {
  const viaCorner1 = clearRow(tiles, from.row, from.col, to.col) && clearColumn(tiles, to.col, from.row, to.row);
  const viaCorner2 = clearColumn(tiles, from.col, from.row, to.row) && clearRow(tiles, to.row, from.col, to.col);
  return viaCorner1 || viaCorner2;
}

function reachable(from, to, physics) {
  const dx = Math.abs(to.col - from.col);
  const up = from.row - to.row;
  if (up > physics.maxJumpUp) return false;
  if (up > 0) return (dx / physics.maxJumpAcross) ** 2 + (up / physics.maxJumpUp) ** 2 <= 1;
  return dx <= physics.maxJumpAcross;
}

function landing(b, col) {
  return Math.min(b.x1, Math.max(b.x0, col));
}

/** Columns of `a` a move to `b` can leave from, nearest to `b` first, so the move kept for a side is the one
 * a player would make: from the end of the floor just beside the platform, not from the far end of the floor. */
function takeoffs(a, b) {
  const cols = new Set([a.x0, a.x1]);
  if (b.x0 - 1 >= a.x0 && b.x0 - 1 <= a.x1) cols.add(b.x0 - 1);
  if (b.x1 + 1 >= a.x0 && b.x1 + 1 <= a.x1) cols.add(b.x1 + 1);
  for (let col = Math.max(a.x0, b.x0); col <= Math.min(a.x1, b.x1); col += 1) cols.add(col);
  const distance = (col) => Math.abs(col - landing(b, col));
  return [...cols].sort((p, q) => distance(p) - distance(q) || p - q);
}

function sideOf(fromCol, toCol) {
  return Math.sign(toCol - fromCol);
}

function addEdge(edges, seen, edge) {
  const key = `${edge.a}:${edge.b}:${edge.type}:${edge.side}`;
  if (seen.has(key)) return;
  seen.add(key);
  edges.push({ id: edges.length, ...edge });
}

const BUCKET = 16;

/** Surfaces by column bucket, so a surface only meets the ones within reach of it. */
function columnIndex(surfaces) {
  const buckets = new Map();
  for (const surface of surfaces) {
    for (let bucket = Math.floor(surface.x0 / BUCKET); bucket <= Math.floor(surface.x1 / BUCKET); bucket += 1) {
      if (!buckets.has(bucket)) buckets.set(bucket, []);
      buckets.get(bucket).push(surface);
    }
  }
  return (a, reach) => {
    const found = new Set();
    for (let bucket = Math.floor((a.x0 - reach) / BUCKET); bucket <= Math.floor((a.x1 + reach) / BUCKET); bucket += 1) {
      for (const surface of buckets.get(bucket) ?? []) found.add(surface);
    }
    return found;
  };
}

/**
 * The air a rise needs above its takeoff: ceil(body + rise) cells, the body measured on the engine (config.js, 09/11).
 * A rise of one tile that a ramp carries is a walk: the ramp is under the landing, and the surface already has the stand
 * headroom. Drops and level moves need nothing here.
 */
export function riseClears(tiles, physics, from, to) {
  if (!physics.body) return true;
  const rise = from.row - to.row;
  if (rise <= 0) return true;
  if (rise === 1 && isRamp(tiles, to.col, to.row + 1)) return true;
  return headroomAt(tiles, from.col, from.row) >= Math.ceil(physics.body + rise);
}

/** The jumps a runner can make on geometry but cannot make with its body: the rise fails riseClears. */
export function blockedRises(tiles, graph, physics) {
  const blocked = [];
  if (!physics.body) return blocked;
  const near = columnIndex(graph.surfaces);
  for (const a of graph.surfaces) {
    for (const b of [...near(a, physics.maxJumpAcross + 1)]) {
      if (a.id === b.id) continue;
      for (const col of takeoffs(a, b)) {
        const from = { col, row: a.row };
        const to = { col: landing(b, col), row: b.row };
        if (!reachable(from, to, physics) || !clearL(tiles, from, to)) continue;
        if (!riseClears(tiles, physics, from, to)) blocked.push({ from, to, rise: from.row - to.row, needed: Math.ceil(physics.body + from.row - to.row) });
      }
    }
  }
  return blocked;
}

/** Jumps and drops. A drop off an end starts one tile past the end, then falls straight down. */
function jumpEdges(tiles, graph, physics, edges, seen) {
  const { surfaces } = graph;
  const near = columnIndex(surfaces);
  for (const a of surfaces) {
    const candidates = [...near(a, physics.maxJumpAcross + 1)].sort((p, q) => p.id - q.id);
    for (const b of candidates) {
      if (a.id === b.id) continue;
      for (const col of takeoffs(a, b)) {
        const from = { col, row: a.row };
        const to = { col: landing(b, col), row: b.row };
        if (!reachable(from, to, physics)) continue;
        // a rise is an arc (up, then across: the L); a fall is free (the straight line)
        if (!(to.row > from.row && physics.body ? clearLine(tiles, from, to) : clearL(tiles, from, to))) continue;
        if (!riseClears(tiles, physics, from, to)) continue;
        const type = to.row > from.row ? EDGE.DROP : EDGE.JUMP;
        addEdge(edges, seen, { a: a.id, b: b.id, type, side: sideOf(from.col, to.col), from, to });
      }
      for (const step of [-1, 1]) {
        const col = step < 0 ? a.x0 - 1 : a.x1 + 1;
        if (col < 0 || col >= tiles.cols || !isAir(tiles, col, a.row)) continue;
        const from = { col, row: a.row };
        let row = a.row;
        while (row + 1 < tiles.rows && isPassable(tiles, col, row + 1) && !surfaceAt(graph, col, row)) row += 1;
        const hit = surfaceAt(graph, col, row);
        if (!hit || hit.id !== b.id) continue;
        addEdge(edges, seen, { a: a.id, b: b.id, type: EDGE.DROP, side: step, from, to: { col, row } });
      }
    }
  }
}

/** Wall climbs: along a solid column of at least minWallHeight, the air column beside it links every surface
 * that touches that column, or the column beyond it, from the base up. The runner wall-jumps up the solid side. */
function wallEdges(tiles, graph, physics, edges, seen) {
  for (let wallCol = 0; wallCol < tiles.cols; wallCol += 1) {
    for (const side of [-1, 1]) {
      const shaftCol = wallCol + side;
      const awayCol = shaftCol + side;
      if (shaftCol < 0 || shaftCol >= tiles.cols) continue;
      let top = -1;
      for (let row = 0; row <= tiles.rows; row += 1) {
        const open = row < tiles.rows && isSolid(tiles, wallCol, row) && isAir(tiles, shaftCol, row);
        if (open && top < 0) top = row;
        if (!open && top >= 0) {
          const bottom = row - 1;
          if (bottom - top + 1 >= physics.minWallHeight) linkShaft(graph, edges, seen, { shaftCol, awayCol, top, bottom, side });
          top = -1;
        }
      }
    }
  }
}

function linkShaft(graph, edges, seen, shaft) {
  const stops = new Map();
  for (let row = shaft.top - 1; row <= shaft.bottom + 1; row += 1) {
    for (const col of [shaft.shaftCol, shaft.awayCol]) {
      const surface = surfaceAt(graph, col, row);
      if (surface && !stops.has(surface.id)) stops.set(surface.id, { col, row });
    }
  }
  const ordered = [...stops.entries()].sort((p, q) => q[1].row - p[1].row);
  for (let i = 0; i < ordered.length; i += 1) {
    for (let j = i + 1; j < ordered.length; j += 1) {
      const [lowId, low] = ordered[i];
      const [highId, high] = ordered[j];
      if (low.row <= high.row) continue;
      addEdge(edges, seen, { a: lowId, b: highId, type: EDGE.WALL, side: -shaft.side, from: low, to: high });
    }
  }
}

/** Links: the edges between a pair of surfaces that leave and land within a tile of each other are one link.
 * Jumping into a pocket and dropping back out at the same column is one way in and out, not two; the left end
 * and the right end of a platform are two. Degrees, bridges and attachments count links. */
export function reduceEdges(edges) {
  const links = [];
  for (const edge of edges) {
    const flipped = edge.a > edge.b;
    const lo = flipped ? edge.b : edge.a;
    const hi = flipped ? edge.a : edge.b;
    const colAtLo = flipped ? edge.to.col : edge.from.col;
    const colAtHi = flipped ? edge.from.col : edge.to.col;
    const link = links.find((candidate) => candidate.lo === lo && candidate.hi === hi && Math.abs(candidate.colAtLo - colAtLo) <= 1 && Math.abs(candidate.colAtHi - colAtHi) <= 1);
    if (link) {
      link.edges.push(edge.id);
      if (edge.type === EDGE.WALL) link.wall = true;
    } else {
      links.push({ id: links.length, lo, hi, colAtLo, colAtHi, edges: [edge.id], wall: edge.type === EDGE.WALL });
    }
  }
  return links;
}

/** Builds the graph: surfaces, edges, links and an adjacency list of links keyed by surface id. */
export function buildGraph(tiles, physics = PHYSICS) {
  const graph = findSurfaces(tiles, physics);
  const edges = [];
  const seen = new Set();
  jumpEdges(tiles, graph, physics, edges, seen);
  wallEdges(tiles, graph, physics, edges, seen);
  const links = reduceEdges(edges);
  const adjacency = graph.surfaces.map(() => []);
  for (const link of links) {
    adjacency[link.lo].push({ to: link.hi, link });
    adjacency[link.hi].push({ to: link.lo, link });
  }
  return { ...graph, edges, links, adjacency };
}

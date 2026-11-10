// The routes of a lap (zerun-laps), as data the game plays in place: the circuit stays where it is, and the lap changes
// what is open, not where the runner is (the owner's decision of 08/11, after chained copies of the laps overlapped).
// For each way round the track through the spawn: its centreline cells in travel order, each with a heading (the
// camera follows the leader's heading, ADR 0007 of Zerun); its corridor, every air cell nearer to this route than to any
// other part of the track, as row runs; and its gates, the air cells just outside the corridor, which close the other
// branches for this lap. The lap line is the corridor's cross-section at the start, crossed in the lap heading.

import { isRamp } from "../grid/ramps.js";
import { isAir } from "../grid/tiles.js";
import { SIDES, cellOf, coreOf, nearestCentreline, trackOf } from "./laps.js";

export const HEADINGS = Object.freeze(["right", "down", "left", "up"]);
const STEP_LIMIT = 2_000_000;

function incidenceOf(core) {
  const inc = Array.from({ length: core.count }, () => []);
  core.edges.forEach((edge, id) => {
    if (edge.a === edge.b) return;
    inc[edge.a].push([edge.b, id]);
    inc[edge.b].push([edge.a, id]);
  });
  return inc;
}

/** Simple cycles through a node, as edge sequences, each cycle once (the orientation whose first edge id is the smaller), up to limit. */
function cyclesThroughNode(core, node, limit) {
  const inc = incidenceOf(core);
  const onPath = new Uint8Array(core.count);
  const used = new Uint8Array(core.edges.length);
  const path = [];
  const cycles = [];
  let steps = 0;
  let over = false;
  const walk = (at) => {
    for (const [to, id] of inc[at]) {
      if (over) return;
      if (used[id]) continue;
      steps += 1;
      if (steps > STEP_LIMIT) {
        over = true;
        return;
      }
      if (to === node) {
        if (path.length >= 1 && path[0] < id) {
          cycles.push([...path, id]);
          if (cycles.length > limit) {
            over = true;
            return;
          }
        }
        continue;
      }
      if (onPath[to]) continue;
      used[id] = 1;
      onPath[to] = 1;
      path.push(id);
      walk(to);
      path.pop();
      onPath[to] = 0;
      used[id] = 0;
    }
  };
  onPath[node] = 1;
  walk(node);
  core.edges.forEach((edge, id) => {
    if (edge.a === node && edge.b === node) cycles.push([id]);
  });
  return { cycles, over };
}

/** Cycles through one edge, as edge sequences that start with it: the simple paths from its far end back to its near end. */
function cyclesThroughEdge(core, edgeId, limit) {
  const { a, b } = core.edges[edgeId];
  if (a === b) return { cycles: [[edgeId]], over: false };
  const inc = incidenceOf(core);
  const onPath = new Uint8Array(core.count);
  const used = new Uint8Array(core.edges.length);
  const path = [edgeId];
  const cycles = [];
  let steps = 0;
  let over = false;
  used[edgeId] = 1;
  const walk = (at) => {
    for (const [to, id] of inc[at]) {
      if (over) return;
      if (used[id]) continue;
      steps += 1;
      if (steps > STEP_LIMIT) {
        over = true;
        return;
      }
      if (to === a) {
        cycles.push([...path, id]);
        if (cycles.length > limit) {
          over = true;
          return;
        }
        continue;
      }
      if (onPath[to]) continue;
      used[id] = 1;
      onPath[to] = 1;
      path.push(id);
      walk(to);
      path.pop();
      onPath[to] = 0;
      used[id] = 0;
    }
  };
  onPath[b] = 1;
  walk(b);
  return { cycles, over };
}

/** The core's nodes and edges back in the track: trackNode[coreNode], corridor[coreEdge]. */
function inverseOf(track, core) {
  const trackNode = new Int32Array(core.count);
  track.nodes.forEach((_cells, v) => {
    if (core.index[v] !== -1) trackNode[core.index[v]] = v;
  });
  const corridor = new Int32Array(core.edges.length);
  track.corridors.forEach((_c, e) => {
    if (core.edgeOf[e] !== -1) corridor[core.edgeOf[e]] = e;
  });
  return { trackNode, corridor };
}

/** The cells from `from` to `to` inside one node's cluster, both included, along the centreline links. */
function pathInNode(track, node, from, to) {
  if (from === to) return [from];
  const prev = new Map([[from, -1]]);
  const queue = [from];
  for (let head = 0; head < queue.length; head += 1) {
    const p = queue[head];
    if (p === to) break;
    for (const q of track.links[p]) {
      if (track.nodeOf[q] !== node || prev.has(q)) continue;
      prev.set(q, p);
      queue.push(q);
    }
  }
  if (!prev.has(to)) throw new Error(`the node's cells ${from} and ${to} are not linked`);
  const path = [];
  for (let p = to; p !== -1; p = prev.get(p)) path.push(p);
  return path.reverse();
}

/** Walks corridors from a node cell: the cells from `at` (included) along every edge, ending at the arrival cell of the last one. */
function walkEdges(track, inverse, node, at, edgeIds) {
  const cells = [];
  for (const eid of edgeIds) {
    const corridor = track.corridors[inverse.corridor[eid]];
    let tiles = corridor.tiles;
    let next;
    if (corridor.a === node) next = corridor.b;
    else {
      tiles = [...corridor.tiles].reverse();
      next = corridor.a;
    }
    const depart = track.links[tiles[0]].find((q) => track.nodeOf[q] === node);
    cells.push(...pathInNode(track, node, at, depart));
    cells.push(...tiles);
    at = track.links[tiles[tiles.length - 1]].find((q) => track.nodeOf[q] === next);
    node = next;
  }
  return { cells, node, at };
}

/** The route leaves the start to the right when it can, else upward: how far right its first steps go, then how far up, then its first step up. */
function orientationScore(cells, cols) {
  const m = Math.min(6, cells.length - 1);
  const a = cellOf(cells[0], cols);
  const b = cellOf(cells[m], cols);
  const first = cellOf(cells[1], cols);
  return [b.col - a.col, a.row - b.row, a.row - first.row];
}

function orient(cells, cols) {
  if (cells.length < 3) return cells;
  const reversed = [cells[0], ...cells.slice(1).reverse()];
  const forward = orientationScore(cells, cols);
  const backward = orientationScore(reversed, cols);
  for (let i = 0; i < forward.length; i += 1) {
    if (backward[i] !== forward[i]) return backward[i] > forward[i] ? reversed : cells;
  }
  return cells;
}

/** The heading of each cell: the dominant axis of the displacement a few cells ahead minus a few cells behind. */
function headingsOf(cells, cols) {
  const n = cells.length;
  const k = Math.max(1, Math.min(3, Math.floor(n / 8)));
  return cells.map((_p, i) => {
    const ahead = cellOf(cells[(i + k) % n], cols);
    const behind = cellOf(cells[(i - k + n) % n], cols);
    const dx = ahead.col - behind.col;
    const dy = ahead.row - behind.row;
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 0 : 2;
    return dy > 0 ? 1 : 3;
  });
}

/** The corridor of a route (air nearer to it than to the rest of the centreline) and its gates (the air just outside). */
function corridorOf(tiles, track, routeCells) {
  const { cols, rows } = tiles;
  const size = cols * rows;
  const label = new Int8Array(size).fill(-1);
  const queue = [];
  for (const p of routeCells) {
    label[p] = 1;
    queue.push(p);
  }
  for (let p = 0; p < size; p += 1) {
    if (track.line[p] === 1 && label[p] === -1) {
      label[p] = 0;
      queue.push(p);
    }
  }
  for (let head = 0; head < queue.length; head += 1) {
    const p = queue[head];
    const { col, row } = cellOf(p, cols);
    for (const [dc, dr] of SIDES) {
      const c = col + dc;
      const r = row + dr;
      if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
      const q = r * cols + c;
      if (label[q] !== -1 || !isAir(tiles, c, r)) continue;
      label[q] = label[p];
      queue.push(q);
    }
  }
  const corridor = [];
  const gates = [];
  for (let p = 0; p < size; p += 1) {
    if (label[p] === 1) corridor.push(p);
    if (label[p] !== 0) continue;
    const { col, row } = cellOf(p, cols);
    const touches = SIDES.some(([dc, dr]) => {
      const c = col + dc;
      const r = row + dr;
      return c >= 0 && r >= 0 && c < cols && r < rows && label[r * cols + c] === 1;
    });
    if (touches) gates.push(p);
  }
  return { corridor, gates };
}

/** The air reached from `start` without crossing the gates: the lap is sealed when that is exactly the corridor. */
function sealed(tiles, start, corridor, gates) {
  const { cols, rows } = tiles;
  const closed = new Set(gates);
  const inside = new Set(corridor);
  const seen = new Set([start]);
  const queue = [start];
  for (let head = 0; head < queue.length; head += 1) {
    const p = queue[head];
    if (!inside.has(p)) return false;
    const { col, row } = cellOf(p, cols);
    for (const [dc, dr] of SIDES) {
      const c = col + dc;
      const r = row + dr;
      if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
      const q = r * cols + c;
      if (seen.has(q) || closed.has(q) || !isAir(tiles, c, r)) continue;
      seen.add(q);
      queue.push(q);
    }
  }
  return seen.size === inside.size;
}

/**
 * The clearance along a route: for each cell, the height of the air column through it (floor to ceiling). Zerun's runner
 * stands in 3 tiles, slides through 2 and cannot pass 1. stand is the share of cells with 3 or more; slide and crushed
 * count the cells with 2 and with 1; min is the lowest column.
 */
function clearanceOf(tiles, cells, cols) {
  const heightAt = (col, row) => {
    let top = row;
    while (isAir(tiles, col, top - 1)) top -= 1;
    let bottom = row;
    while (isAir(tiles, col, bottom + 1)) bottom += 1;
    return bottom - top + 1;
  };
  const heights = cells.map((p) => heightAt(p % cols, Math.floor(p / cols)));
  const stand = heights.filter((h) => h >= 3).length;
  return {
    stand: Math.round((stand / heights.length) * 1000) / 1000,
    slide: heights.filter((h) => h === 2).length,
    crushed: heights.filter((h) => h <= 1).length,
    min: Math.min(...heights),
    lowClimbs: lowClimbsOf(tiles, cells, cols),
  };
}

/** The standing row under a cell: the lowest air cell of its column run. */
function standingRowAt(tiles, col, row) {
  let bottom = row;
  while (isAir(tiles, col, bottom + 1)) bottom += 1;
  return bottom;
}

/**
 * One-tile steps up along the route that the runner's body cannot make: the body is 30 px (2.5 tiles) and must rise one
 * tile under the lower cell's ceiling, so the air column at the lower standing cell must be 4 tiles or more, and the upper
 * cell needs 3 to stand. A step whose riser is a ramp tile is walked, not jumped, so it is not a climb. Longer climbs
 * (shafts, wall jumps) are the physics graph's matter. Each entry: { at, from: [col,row], to: [col,row], column, need: 4 }.
 */
function lowClimbsOf(tiles, cells, cols) {
  const heightAt = (col, row) => {
    let top = row;
    while (isAir(tiles, col, top - 1)) top -= 1;
    let bottom = row;
    while (isAir(tiles, col, bottom + 1)) bottom += 1;
    return bottom - top + 1;
  };
  const low = [];
  const n = cells.length;
  for (let i = 0; i < n; i += 1) {
    const c0 = cells[i] % cols;
    const r0 = Math.floor(cells[i] / cols);
    const c1 = cells[(i + 1) % n] % cols;
    const r1 = Math.floor(cells[(i + 1) % n] / cols);
    const s0 = standingRowAt(tiles, c0, r0);
    const s1 = standingRowAt(tiles, c1, r1);
    if (s0 - s1 !== 1) continue;
    if (isRamp(tiles, c1, s0)) continue;
    const column = heightAt(c0, s0);
    if (column < 4 || heightAt(c1, s1) < 3) low.push({ at: i, from: [c0, s0], to: [c1, s1], column, need: 4 });
  }
  return low;
}

/** Cells as row runs [row, firstCol, lastCol], in row order. */
function runsOf(cells, cols) {
  const byRow = new Map();
  for (const p of cells) {
    const { col, row } = cellOf(p, cols);
    if (!byRow.has(row)) byRow.set(row, []);
    byRow.get(row).push(col);
  }
  const runs = [];
  for (const row of [...byRow.keys()].sort((a, b) => a - b)) {
    const sorted = byRow.get(row).sort((a, b) => a - b);
    let start = sorted[0];
    let last = sorted[0];
    for (const col of sorted.slice(1)) {
      if (col === last + 1) {
        last = col;
        continue;
      }
      runs.push([row, start, last]);
      start = col;
      last = col;
    }
    runs.push([row, start, last]);
  }
  return runs;
}

/** The corridor's cross-section at the start, perpendicular to the lap heading: the cells of the lap line. */
function lapLineOf(tiles, start, heading) {
  const { cols, rows } = tiles;
  const { col, row } = cellOf(start, cols);
  const [dc, dr] = heading === 0 || heading === 2 ? [0, 1] : [1, 0];
  const line = [[col, row]];
  for (const sign of [1, -1]) {
    let c = col + sign * dc;
    let r = row + sign * dr;
    while (c >= 0 && r >= 0 && c < cols && r < rows && isAir(tiles, c, r)) {
      line.push([c, r]);
      c += sign * dc;
      r += sign * dr;
    }
  }
  return line.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

/**
 * The routes of the laps through a spawn point ({ col, row }), up to routeLimit:
 * { spawn, start, exact, lapHeading, lapLine, routes: [{ id, length, junctions, sealed, clearance, cells: [[col,row,heading]...],
 *   corridor: [[row, c0, c1]...], gates: [[col,row]...] }] }, headings as indices into HEADINGS. Routes are ordered by
 * length, then by their cells; clearance is { stand, slide, crushed, min } along the route (clearanceOf). Nothing when the
 * spawn is off the track (routes: []).
 */
export function routesOf(tiles, spawn, { routeLimit = 64 } = {}) {
  const { cols } = tiles;
  const track = trackOf(tiles);
  const core = coreOf(track);
  const inverse = inverseOf(track, core);
  const near = nearestCentreline(tiles, track.line, spawn.col, spawn.row);
  const empty = { spawn: [spawn.col, spawn.row], start: null, exact: true, lapHeading: null, lapLine: [], routes: [] };
  if (near === -1) return empty;
  const start = cellOf(near, cols);
  let cycles = [];
  let over = false;
  const node = track.nodeOf[near];
  if (track.loopOf[near] !== -1) {
    // a closed loop with no junction: one route, the loop's cells walked from the start
    const loopCells = new Set(track.loops[track.loopOf[near]]);
    const path = [near];
    let prev = -1;
    let cur = near;
    for (;;) {
      const next = track.links[cur].find((q) => q !== prev && loopCells.has(q));
      if (next === undefined || next === near) break;
      path.push(next);
      prev = cur;
      cur = next;
    }
    cycles = [{ cells: path }];
  } else if (node !== -1) {
    const id = core.index[node];
    if (id === -1) return empty;
    const found = cyclesThroughNode(core, id, routeLimit);
    over = found.over;
    cycles = found.cycles.slice(0, routeLimit).map((edgeIds) => {
      const walked = walkEdges(track, inverse, node, near, edgeIds);
      const closing = pathInNode(track, node, walked.at, near);
      return { cells: [...walked.cells, ...closing.slice(0, -1)] };
    });
  } else {
    const corridorIndex = track.corridorOf[near];
    const edge = corridorIndex === -1 ? -1 : core.edgeOf[corridorIndex];
    if (edge === -1) return empty;
    const found = cyclesThroughEdge(core, edge, routeLimit);
    over = found.over;
    const corridor = track.corridors[corridorIndex];
    const i = corridor.tiles.indexOf(near);
    cycles = found.cycles.slice(0, routeLimit).map((edgeIds) => {
      // from the start along the corridor to its b end, round the other edges to its a end, back along the corridor
      const toB = corridor.tiles.slice(i);
      const arriveB = track.links[toB[toB.length - 1]].find((q) => track.nodeOf[q] === corridor.b);
      const walked = walkEdges(track, inverse, corridor.b, arriveB, edgeIds.slice(1));
      const departA = track.links[corridor.tiles[0]].find((q) => track.nodeOf[q] === corridor.a);
      const inA = pathInNode(track, corridor.a, walked.at, departA);
      return { cells: [...toB, ...walked.cells, ...inA, ...corridor.tiles.slice(0, i)] };
    });
  }
  const routes = cycles.map(({ cells }) => {
    const oriented = orient(cells, cols);
    const headings = headingsOf(oriented, cols);
    const { corridor, gates } = corridorOf(tiles, track, oriented);
    const junctions = new Set(oriented.map((p) => track.nodeOf[p]).filter((n) => n !== -1 && core.index[n] !== -1 && core.degree[core.index[n]] >= 3)).size;
    return {
      length: oriented.length,
      junctions,
      sealed: sealed(tiles, near, corridor, gates),
      clearance: clearanceOf(tiles, oriented, cols),
      cells: oriented.map((p, k) => [p % cols, Math.floor(p / cols), headings[k]]),
      corridor: runsOf(corridor, cols),
      gates: gates.map((p) => [p % cols, Math.floor(p / cols)]),
    };
  });
  routes.sort((a, b) => a.length - b.length || JSON.stringify(a.cells).localeCompare(JSON.stringify(b.cells)));
  routes.forEach((route, id) => {
    route.id = id;
  });
  const lapHeading = routes.length ? routes[0].cells[0][2] : null;
  return {
    spawn: [spawn.col, spawn.row],
    start: [start.col, start.row],
    exact: !over,
    lapHeading,
    lapLine: lapHeading === null ? [] : lapLineOf(tiles, near, lapHeading),
    routes,
  };
}

// The laps of a closed circuit (profile zerun-laps). A lap is one trip round the track back to the start line. Where
// the track splits, the game alternates between the ways round from lap to lap, so a map is checked for two things
// only: how many ways round it has (routes), and whether each split fits on the screen, so the runner sees both ways
// at once. Holes are not judged here.
//
// The track is read off its centreline: the passable air is thinned to one tile (Zhang-Suen, as stubs do) and linked
// so that a diagonal step is one link, not a loop. Junctions and ends are the nodes. Dead ends are pruned first, since
// a branch that stops is not a way round. A route is a simple cycle of what is left. The count is an upper bound on the
// laps from any start line (a lap through the start is one of these cycles), and it stops at a limit.
// A split is a pocket of rock that the track goes round with two or more junctions on its edge: the two ways round it
// are the choice. The pocket and one tile of corridor round it is the box, and the box must fit the screen.

import { corridorStats } from "../grid/corridors.js";
import { thin } from "../graph/stubs.js";
import { isAir } from "../grid/tiles.js";

const STEP_LIMIT = 2_000_000;
export const SIDES = Object.freeze([[1, 0], [-1, 0], [0, 1], [0, -1]]);

export function cellOf(p, cols) {
  return { col: p % cols, row: Math.floor(p / cols) };
}

/** The passable air thinned to a one-tile centreline: 1 on the line, 0 elsewhere. */
function centrelineOf(tiles) {
  const { cols, rows } = tiles;
  const mask = new Uint8Array(cols * rows);
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) if (isAir(tiles, col, row)) mask[row * cols + col] = 1;
  }
  return thin(mask, cols, rows);
}

/** Links between centreline cells: side by side always; diagonally only when neither shared side cell is on the line. */
function linksOf(line, cols, rows) {
  const on = (col, row) => col >= 0 && row >= 0 && col < cols && row < rows && line[row * cols + col] === 1;
  const links = Array.from({ length: cols * rows }, () => []);
  const join = (a, b) => {
    links[a].push(b);
    links[b].push(a);
  };
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (!on(col, row)) continue;
      const p = row * cols + col;
      if (on(col + 1, row)) join(p, p + 1);
      if (on(col, row + 1)) join(p, p + cols);
      if (on(col + 1, row + 1) && !on(col + 1, row) && !on(col, row + 1)) join(p, p + cols + 1);
      if (on(col - 1, row + 1) && !on(col - 1, row) && !on(col, row + 1)) join(p, p + cols - 1);
    }
  }
  return links;
}

/** The track as a graph: nodes are the junctions and ends (linked cells share a node), corridors run between nodes. */
export function trackOf(tiles) {
  const { cols, rows } = tiles;
  const line = centrelineOf(tiles);
  const links = linksOf(line, cols, rows);
  const size = cols * rows;
  const isNode = (p) => line[p] === 1 && links[p].length !== 2 && links[p].length > 0;
  const nodeOf = new Int32Array(size).fill(-1);
  const nodes = [];
  for (let p = 0; p < size; p += 1) {
    if (nodeOf[p] !== -1 || !isNode(p)) continue;
    const id = nodes.length;
    const cells = [];
    const stack = [p];
    nodeOf[p] = id;
    while (stack.length) {
      const q = stack.pop();
      cells.push(q);
      for (const s of links[q]) {
        if (nodeOf[s] === -1 && isNode(s)) {
          nodeOf[s] = id;
          stack.push(s);
        }
      }
    }
    nodes.push(cells);
  }
  const corridors = [];
  const seen = new Uint8Array(size);
  nodes.forEach((cells, id) => {
    for (const x of cells) {
      for (const y of links[x]) {
        if (nodeOf[y] !== -1 || seen[y]) continue;
        const path = [];
        let prev = x;
        let cur = y;
        let end = -1;
        for (;;) {
          seen[cur] = 1;
          path.push(cur);
          const next = links[cur].find((q) => q !== prev);
          if (next === undefined) break;
          if (nodeOf[next] !== -1) {
            end = nodeOf[next];
            break;
          }
          if (seen[next]) break;
          prev = cur;
          cur = next;
        }
        if (end !== -1) corridors.push({ a: id, b: end, tiles: path });
      }
    }
  });
  // a closed loop with no junction on it is a way round of its own
  const loops = [];
  for (let p = 0; p < size; p += 1) {
    if (line[p] !== 1 || seen[p] || nodeOf[p] !== -1 || links[p].length !== 2) continue;
    const cells = [];
    const stack = [p];
    seen[p] = 1;
    while (stack.length) {
      const q = stack.pop();
      cells.push(q);
      for (const s of links[q]) {
        if (!seen[s] && nodeOf[s] === -1) {
          seen[s] = 1;
          stack.push(s);
        }
      }
    }
    loops.push(cells);
  }
  const corridorOf = new Int32Array(size).fill(-1);
  corridors.forEach((corridor, e) => {
    for (const p of corridor.tiles) corridorOf[p] = e;
  });
  const loopOf = new Int32Array(size).fill(-1);
  loops.forEach((cells, k) => {
    for (const p of cells) loopOf[p] = k;
  });
  return { cols, rows, line, links, nodeOf, nodes, corridors, loops, corridorOf, loopOf };
}

/** Dead ends pruned again and again: a branch that stops is not a way round. Returns the core, with its own indices. */
export function coreOf(track) {
  const { nodes, corridors } = track;
  const count = nodes.length;
  const degree = new Int32Array(count);
  const incident = Array.from({ length: count }, () => []);
  corridors.forEach((corridor, e) => {
    degree[corridor.a] += 1;
    degree[corridor.b] += 1;
    incident[corridor.a].push(e);
    if (corridor.b !== corridor.a) incident[corridor.b].push(e);
  });
  const gone = new Uint8Array(count);
  const goneCorridor = new Uint8Array(corridors.length);
  const queue = [];
  for (let v = 0; v < count; v += 1) if (degree[v] <= 1) queue.push(v);
  let stubs = 0;
  while (queue.length) {
    const v = queue.pop();
    if (gone[v] || degree[v] > 1) continue;
    gone[v] = 1;
    stubs += 1;
    for (const e of incident[v]) {
      if (goneCorridor[e]) continue;
      goneCorridor[e] = 1;
      const { a, b } = corridors[e];
      const other = a === v ? b : a;
      degree[v] -= 1;
      degree[other] -= 1;
      if (!gone[other] && degree[other] <= 1) queue.push(other);
    }
  }
  const index = new Int32Array(count).fill(-1);
  let m = 0;
  for (let v = 0; v < count; v += 1) if (!gone[v]) index[v] = m++;
  const edges = [];
  const edgeOf = new Int32Array(corridors.length).fill(-1);
  corridors.forEach((corridor, e) => {
    if (goneCorridor[e]) return;
    edgeOf[e] = edges.length;
    edges.push({ a: index[corridor.a], b: index[corridor.b] });
  });
  const coreDegree = new Int32Array(m);
  for (const edge of edges) {
    coreDegree[edge.a] += 1;
    coreDegree[edge.b] += 1;
  }
  const junctions = [...coreDegree].filter((d) => d >= 3).length;
  return { count: m, index, degree: coreDegree, edges, stubs, junctions, edgeOf };
}

/** Simple cycles of the core that use two or more corridors, each counted once, up to `limit` (then exact is false). */
function countCycles(core, limit) {
  const inc = Array.from({ length: core.count }, () => []);
  core.edges.forEach((edge, id) => {
    if (edge.a === edge.b) return;
    inc[edge.a].push([edge.b, id]);
    inc[edge.b].push([edge.a, id]);
  });
  const onPath = new Uint8Array(core.count);
  const used = new Uint8Array(core.edges.length);
  let directed = 0;
  let steps = 0;
  let truncated = false;
  const enough = () => directed / 2 > limit;
  // every cycle is walked twice, once each way, from its lowest node
  const walk = (start, at) => {
    for (const [to, id] of inc[at]) {
      if (used[id]) continue;
      steps += 1;
      if (steps > STEP_LIMIT) {
        truncated = true;
        return;
      }
      if (to === start) {
        directed += 1;
        if (enough()) return;
        continue;
      }
      if (to < start || onPath[to]) continue;
      used[id] = 1;
      onPath[to] = 1;
      walk(start, to);
      used[id] = 0;
      onPath[to] = 0;
      if (truncated || enough()) return;
    }
  };
  for (let start = 0; start < core.count && !truncated && !enough(); start += 1) {
    onPath[start] = 1;
    walk(start, start);
    onPath[start] = 0;
  }
  return { cycles: Math.floor(directed / 2), over: enough(), truncated };
}

/** Simple cycles through one node of the core, each counted once, up to `limit`. */
function cyclesThroughNode(core, node, limit) {
  const inc = Array.from({ length: core.count }, () => []);
  core.edges.forEach((edge, id) => {
    if (edge.a === edge.b) return;
    inc[edge.a].push([edge.b, id]);
    inc[edge.b].push([edge.a, id]);
  });
  const onPath = new Uint8Array(core.count);
  const used = new Uint8Array(core.edges.length);
  let directed = 0;
  let steps = 0;
  let truncated = false;
  const enough = () => directed / 2 > limit;
  // every cycle is walked once each way, so the walks back to the node are counted twice
  const walk = (at) => {
    for (const [to, id] of inc[at]) {
      if (used[id]) continue;
      steps += 1;
      if (steps > STEP_LIMIT) {
        truncated = true;
        return;
      }
      if (to === node) {
        directed += 1;
        if (enough()) return;
        continue;
      }
      if (onPath[to]) continue;
      used[id] = 1;
      onPath[to] = 1;
      walk(to);
      used[id] = 0;
      onPath[to] = 0;
      if (truncated || enough()) return;
    }
  };
  onPath[node] = 1;
  walk(node);
  return { cycles: Math.floor(directed / 2), over: enough(), truncated };
}

/** Cycles through one edge of the core: the simple paths from its far end back to its near end that avoid it. */
function cyclesThroughEdge(core, edgeId, limit) {
  const { a, b } = core.edges[edgeId];
  if (a === b) return { cycles: 1, over: limit < 1, truncated: false };
  const inc = Array.from({ length: core.count }, () => []);
  core.edges.forEach((edge, id) => {
    if (edge.a === edge.b) return;
    inc[edge.a].push([edge.b, id]);
    inc[edge.b].push([edge.a, id]);
  });
  const onPath = new Uint8Array(core.count);
  const used = new Uint8Array(core.edges.length);
  used[edgeId] = 1;
  let found = 0;
  let steps = 0;
  let truncated = false;
  const enough = () => found > limit;
  const walk = (at) => {
    for (const [to, id] of inc[at]) {
      if (used[id]) continue;
      steps += 1;
      if (steps > STEP_LIMIT) {
        truncated = true;
        return;
      }
      if (to === a) {
        found += 1;
        if (enough()) return;
        continue;
      }
      if (onPath[to]) continue;
      used[id] = 1;
      onPath[to] = 1;
      walk(to);
      used[id] = 0;
      onPath[to] = 0;
      if (truncated || enough()) return;
    }
  };
  onPath[b] = 1;
  walk(b);
  return { cycles: found, over: enough(), truncated };
}

/** The centreline tile nearest to a point, reached through air; -1 when there is none near it. */
export function nearestCentreline(tiles, line, col, row) {
  const { cols, rows } = tiles;
  if (col < 0 || row < 0 || col >= cols || row >= rows) return -1;
  const seen = new Uint8Array(cols * rows);
  const queue = [row * cols + col];
  seen[queue[0]] = 1;
  for (let head = 0; head < queue.length; head += 1) {
    const p = queue[head];
    if (line[p] === 1) return p;
    const { col: c, row: r } = cellOf(p, cols);
    for (const [dc, dr] of SIDES) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const q = nr * cols + nc;
      if (seen[q] || !isAir(tiles, nc, nr)) continue;
      seen[q] = 1;
      queue.push(q);
    }
  }
  return -1;
}

/**
 * The laps through the spawn point: the simple cycles that pass the centreline tile nearest to it, up to routeLimit.
 * A spawn off the track (on a dead end, or with no air near it) has none.
 */
function lapsThroughStart(tiles, track, core, start, routeLimit) {
  const { cols } = tiles;
  const near = nearestCentreline(tiles, track.line, start.col, start.row);
  const at = { col: start.col, row: start.row, on: near === -1 ? null : [near % cols, Math.floor(near / cols)] };
  const offTrack = { routes: 0, exact: true, start: { ...at, offTrack: true } };
  if (near === -1) return offTrack;
  if (track.loopOf[near] !== -1) return { routes: 1, exact: true, start: { ...at, offTrack: false } };
  const node = track.nodeOf[near];
  let found;
  let over;
  let truncated;
  if (node !== -1) {
    const id = core.index[node];
    if (id === -1) return offTrack;
    const loops = core.edges.filter((edge) => edge.a === id && edge.b === id).length;
    const room = routeLimit - loops;
    const counted = room < 0 ? { cycles: 0, over: true, truncated: false } : cyclesThroughNode(core, id, room);
    found = loops + counted.cycles;
    over = counted.over || room < 0;
    truncated = counted.truncated;
  } else {
    const corridor = track.corridorOf[near];
    const edge = corridor === -1 ? -1 : core.edgeOf[corridor];
    if (edge === -1) return offTrack;
    const counted = cyclesThroughEdge(core, edge, routeLimit);
    found = counted.cycles;
    over = counted.over;
    truncated = counted.truncated;
  }
  return { routes: over ? Math.max(routeLimit + 1, found) : found, exact: !over && !truncated, start: { ...at, offTrack: false } };
}

/** The rock not reached from the edge of the map: each region of it is a pocket the track can go round. */
function pocketsOf(tiles) {
  const { cols, rows } = tiles;
  const reached = new Uint8Array(cols * rows);
  const isRock = (col, row) => !isAir(tiles, col, row);
  const flood = (start, pocket) => {
    const stack = [start];
    reached[start] = 1;
    while (stack.length) {
      const p = stack.pop();
      if (pocket) pocket.push(p);
      const { col, row } = cellOf(p, cols);
      for (const [dc, dr] of SIDES) {
        const c = col + dc;
        const r = row + dr;
        if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
        const q = r * cols + c;
        if (reached[q] || !isRock(c, r)) continue;
        reached[q] = 1;
        stack.push(q);
      }
    }
  };
  for (let p = 0; p < cols * rows; p += 1) {
    const { col, row } = cellOf(p, cols);
    const onEdge = col === 0 || row === 0 || col === cols - 1 || row === rows - 1;
    if (onEdge && isRock(col, row) && !reached[p]) flood(p, null);
  }
  const pockets = [];
  for (let p = 0; p < cols * rows; p += 1) {
    const { col, row } = cellOf(p, cols);
    if (isRock(col, row) && !reached[p]) {
      const pocket = [];
      flood(p, pocket);
      pockets.push(pocket);
    }
  }
  return pockets;
}

/** The air within `reach` steps of a pocket: the band of corridor that goes round it, down to its centreline. */
function airWithin(tiles, pocket, reach) {
  const { cols, rows } = tiles;
  const reached = new Set();
  let frontier = pocket;
  for (let depth = 0; depth < reach && frontier.length; depth += 1) {
    const next = [];
    for (const p of frontier) {
      const { col, row } = cellOf(p, cols);
      for (const [dc, dr] of SIDES) {
        const c = col + dc;
        const r = row + dr;
        if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
        const q = r * cols + c;
        if (reached.has(q) || !isAir(tiles, c, r)) continue;
        reached.add(q);
        next.push(q);
      }
    }
    frontier = next;
  }
  return reached;
}

/**
 * The splits: pockets with two or more junctions of the core in the corridor that goes round them, each with its box
 * and whether it fits the screen.
 */
function splitsOf(tiles, track, core, screen, reach) {
  const { cols, rows } = tiles;
  const splits = [];
  for (const pocket of pocketsOf(tiles)) {
    const junctions = new Set();
    for (const p of airWithin(tiles, pocket, reach)) {
      const full = track.nodeOf[p];
      if (full === -1) continue;
      const id = core.index[full];
      if (id !== -1 && core.degree[id] >= 3) junctions.add(id);
    }
    if (junctions.size < 2) continue;
    let c0 = cols;
    let r0 = rows;
    let c1 = -1;
    let r1 = -1;
    for (const p of pocket) {
      const { col, row } = cellOf(p, cols);
      c0 = Math.min(c0, col);
      r0 = Math.min(r0, row);
      c1 = Math.max(c1, col);
      r1 = Math.max(r1, row);
    }
    const box = [Math.max(0, c0 - 1), Math.max(0, r0 - 1), Math.min(cols - 1, c1 + 1), Math.min(rows - 1, r1 + 1)];
    const width = box[2] - box[0] + 1;
    const height = box[3] - box[1] + 1;
    splits.push({ box, cols: width, rows: height, junctions: junctions.size, fits: width <= screen.cols && height <= screen.rows });
  }
  return splits;
}

/**
 * The laps of a circuit: routes (simple cycles of the core, plus closed loops and self-loops; an upper bound on the
 * laps from any start, counted up to routeLimit), the dead ends pruned, the junctions, and the splits with their boxes.
 * screen is { cols, rows } in tiles: the part of the track the runner sees at once. With a start ({ col, row }, the
 * spawn point) the routes are the laps through it, exact up to routeLimit; without one, every way round the track.
 */
export function lapsOf(tiles, { routeLimit = 64, screen = { cols: 26, rows: 15 }, reach, start = null } = {}) {
  const track = trackOf(tiles);
  const core = coreOf(track);
  // the centreline lies about half a corridor from its rim, and one tile past it: the median corridor, plus one
  const band = reach ?? corridorStats(tiles).median + 1;
  const selfLoops = core.edges.filter((edge) => edge.a === edge.b).length;
  const fixed = track.loops.length + selfLoops;
  const room = routeLimit - fixed;
  const counted = room < 0 ? { cycles: 0, over: true, truncated: false } : countCycles(core, room);
  const over = counted.over || room < 0;
  const found = fixed + counted.cycles;
  // past the limit the count is "more than routeLimit", reported as routeLimit + 1 and not exact
  const network = { routes: over ? Math.max(routeLimit + 1, found) : found, exact: !over && !counted.truncated };
  const shared = { network, junctions: core.junctions, stubs: core.stubs, splits: splitsOf(tiles, track, core, screen, band) };
  if (!start) return { ...network, start: null, ...shared };
  return { ...lapsThroughStart(tiles, track, core, start, routeLimit), ...shared };
}

// The rules of the circuit profiles: a race track that is one network with parallel lanes (ADR 0007).
//
// Errors: no surface at all; the main network holds less than minNetworkShare of the surfaces; fewer than
// minTwoLaneShare of the columns offer a choice of two surfaces; the piece does not fit the game's world.
// Warnings: surfaces outside the main network, dead ends, bridges, few three-lane columns, sealed air regions
// ignored, low ceilings. The reference maps pass the errors and carry some of the warnings, so a warning is
// information, not a verdict.

import { bridges, components, degree } from "../graph/analysis.js";
import { checkWorld } from "./rules.js";
import { CIRCUIT_RULES } from "../config.js";
import { lapsOf } from "./laps.js";
import { runHeightOf } from "./run.js";

function pct(ratio) {
  return `${Math.round(ratio * 1000) / 10}%`;
}

function round(value) {
  return Math.round(value * 10000) / 10000;
}

/** Share of the used columns with at least `n` surfaces stacked. */
export function laneShare(graph, cols, n) {
  const perColumn = new Int32Array(cols);
  for (const surface of graph.surfaces) for (let col = surface.x0; col <= surface.x1; col += 1) perColumn[col] += 1;
  let used = 0;
  let stacked = 0;
  for (const count of perColumn) {
    if (count === 0) continue;
    used += 1;
    if (count >= n) stacked += 1;
  }
  return used === 0 ? 0 : stacked / used;
}

/** The spawn point of a circuit: the air above the floor at the left end of the track (the lowest one if several share that column). */
export function spawnOf(graph) {
  let entry = null;
  for (const surface of graph.surfaces) {
    if (!entry || surface.x0 < entry.x0 || (surface.x0 === entry.x0 && surface.floorRow > entry.floorRow)) entry = surface;
  }
  return entry ? { col: entry.x0, row: entry.floorRow - 1 } : null;
}

export function validateCircuit({ tiles, graph }, rules = CIRCUIT_RULES) {
  const errors = [];
  const warnings = [];
  if (graph.surfaces.length === 0) {
    errors.push({ code: "NO_SURFACES", message: "no tile to stand on: nothing is white over black, or the tile size is wrong" });
    return { ok: false, errors, warnings, report: { profile: "circuit", surfaces: 0, edges: 0, links: 0, pockets: graph.pockets, networkShare: 0, network: [], deadEnds: [], bridges: [], lanes: { two: 0, three: 0 } } };
  }
  checkWorld(tiles, graph, rules, errors, warnings);
  const parts = components(graph);
  const sizes = new Map();
  for (const [, part] of parts.of) sizes.set(part, (sizes.get(part) ?? 0) + 1);
  const main = [...sizes.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
  const network = graph.surfaces.filter((surface) => parts.of.get(surface.id) === main).map((surface) => surface.id);
  const networkShare = network.length / graph.surfaces.length;
  if (networkShare < rules.minNetworkShare) {
    errors.push({ code: "FRAGMENTED", message: `the main network holds ${pct(networkShare)} of the surfaces; the minimum is ${pct(rules.minNetworkShare)}` });
  }
  const isolated = graph.surfaces.filter((surface) => parts.of.get(surface.id) !== main).map((surface) => surface.id);
  if (isolated.length) warnings.push({ code: "ISOLATED", message: `${isolated.length} surface(s) cannot be reached from the main network`, surfaces: isolated });
  const deadEnds = graph.surfaces.filter((surface) => degree(graph, surface.id) < 2).map((surface) => surface.id);
  if (deadEnds.length) warnings.push({ code: "DEAD_END", message: `${deadEnds.length} surface(s) have one way in or out`, surfaces: deadEnds });
  const bridgeEdges = bridges(graph).map((link) => link.edges[0]);
  if (bridgeEdges.length) warnings.push({ code: "BRIDGE", message: `${bridgeEdges.length} move(s) are the only link between two parts`, edges: bridgeEdges });
  const two = laneShare(graph, tiles.cols, 2);
  const three = laneShare(graph, tiles.cols, 3);
  if (two < rules.minTwoLaneShare) errors.push({ code: "SINGLE_LANE", message: `only ${pct(two)} of the columns offer two or more surfaces; the minimum is ${pct(rules.minTwoLaneShare)}` });
  if (three < rules.minThreeLaneShare) warnings.push({ code: "FEW_LANES", message: `only ${pct(three)} of the columns offer three or more surfaces; the reference maps have at least ${pct(rules.minThreeLaneShare)}` });
  if (graph.pockets > 0) warnings.push({ code: "POCKETS", message: `${graph.pockets} sealed air region(s) were ignored` });
  // the laps rule (zerun-laps): few enough ways round the track, and every split fits the screen; holes are not judged
  let laps = null;
  if (rules.laps) {
    const { maxRoutes, screenCols, screenRows } = rules.laps;
    const start = rules.laps.start ?? spawnOf(graph);
    laps = lapsOf(tiles, { routeLimit: maxRoutes, screen: { cols: screenCols, rows: screenRows }, start });
    if (laps.start?.offTrack) errors.push({ code: "START", message: `the spawn point (col ${start.col}, row ${start.row}) is not on a way round the track` });
    if (laps.routes > maxRoutes) {
      errors.push({ code: "ROUTES", message: `the spawn point lies on ${laps.exact ? laps.routes : `more than ${maxRoutes}`} ways round the track; the game alternates between at most ${maxRoutes}` });
    }
    for (const split of laps.splits) {
      if (!split.fits) {
        const [c0, r0, c1, r1] = split.box;
        errors.push({ code: "SCREEN", message: `the way splits at cols ${c0}-${c1}, rows ${r0}-${r1} (${split.cols}x${split.rows} tiles); the screen shows ${screenCols}x${screenRows}, so the runner cannot see both ways at once` });
      }
    }
  }
  // the running height (zerun-laps): the air above every floor tile reaches 1.5 x the double jump's apex
  let run = null;
  if (rules.runHeight) {
    const { minTiles, factor, apexTiles } = rules.runHeight;
    run = runHeightOf(tiles, minTiles, rules.runHeight.exempt ?? null);
    if (run.low > 0) {
      errors.push({ code: "RUN_HEIGHT", message: `${run.low} of ${run.floors} floor tiles (${Math.round(run.share * 1000) / 10}%) have less than ${minTiles} tiles of air above them; a part run through needs ${factor} x the ${apexTiles}-tile double jump` });
    }
  }
  const report = {
    profile: rules.laps ? "zerun-laps" : "circuit",
    surfaces: graph.surfaces.length,
    edges: graph.edges.length,
    links: graph.links.length,
    pockets: graph.pockets,
    networkShare: round(networkShare),
    network,
    deadEnds,
    bridges: bridgeEdges,
    lanes: { two: round(two), three: round(three) },
    ...(laps ? { laps: { routes: laps.routes, exact: laps.exact, network: laps.network, junctions: laps.junctions, stubs: laps.stubs, splits: laps.splits, start: laps.start } } : {}),
    ...(run ? { run } : {}),
  };
  return { ok: errors.length === 0, errors, warnings, report };
}

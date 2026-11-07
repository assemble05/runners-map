// The rules a map must pass, each one a finding with a code the docs explain (docs/rules.md).
//
// Hard rules are errors: one network, no dead end, no bridge, exactly two ways between the levels and both are
// the extremity walls, each level crossable on its own, every branch inside its level with a length between
// 5% and 40% of the level, at least one branch per level. Soft rules are warnings: branches spread out, lengths
// varied, no climb on a main route.

import { bridges, components, degree, lowestRoute } from "../graph/analysis.js";
import { EDGE } from "../graph/surfaces.js";
import { levelOfFloorRow, zoneOfColumn } from "../grid/levels.js";
import { RULES } from "../config.js";

function where(surface) {
  return `row ${surface.row}, cols ${surface.x0}-${surface.x1}`;
}

function edgeWhere(graph, edge) {
  return `${graph.surfaces[edge.a].row}:${edge.from.col} -> ${graph.surfaces[edge.b].row}:${edge.to.col} (${edge.type})`;
}

function moveColumn(edge) {
  return edge.type === EDGE.WALL ? edge.from.col : edge.to.col;
}

function levelOf(layout, surface) {
  return levelOfFloorRow(layout, surface.floorRow);
}

function crossLevelEdges(graph, layout) {
  return graph.edges.filter((edge) => levelOf(layout, graph.surfaces[edge.a]) !== levelOf(layout, graph.surfaces[edge.b]));
}

function checkNetwork(graph, errors) {
  const parts = components(graph);
  if (parts.count > 1) {
    const sizes = new Map();
    for (const [, part] of parts.of) sizes.set(part, (sizes.get(part) ?? 0) + 1);
    const largest = [...sizes.entries()].sort((a, b) => b[1] - a[1])[0][0];
    for (const surface of graph.surfaces) {
      if (parts.of.get(surface.id) !== largest) errors.push({ code: "ISOLATED", message: `surface at ${where(surface)} cannot be reached from the rest`, surface: surface.id });
    }
  }
  for (const surface of graph.surfaces) {
    if (degree(graph, surface.id) < 2) errors.push({ code: "DEAD_END", message: `surface at ${where(surface)} has ${degree(graph, surface.id)} way in or out; it needs two`, surface: surface.id });
  }
  for (const link of bridges(graph)) {
    const edge = graph.edges[link.edges[0]];
    errors.push({ code: "BRIDGE", message: `the move ${edgeWhere(graph, edge)} is the only link between two parts; the player would have to come back the same way`, edge: edge.id });
  }
}

function checkConnections(graph, layout, errors) {
  const crossing = crossLevelEdges(graph, layout);
  const zones = { left: [], middle: [], right: [] };
  for (const edge of crossing) zones[zoneOfColumn(layout, moveColumn(edge))].push(edge);
  for (const edge of zones.middle) {
    errors.push({ code: "LEAK", message: `extra connection between the levels at ${edgeWhere(graph, edge)}; only the two extremity walls may join them`, edge: edge.id });
  }
  for (const zone of ["left", "right"]) {
    if (!zones[zone].some((edge) => edge.type === EDGE.WALL)) {
      errors.push({ code: "NO_WALL", message: `no climbable wall joins the levels at the ${zone} extremity` });
    }
  }
  return zones;
}

function levelSurfaces(graph, layout, level) {
  return graph.surfaces.filter((surface) => levelOf(layout, surface) === level.name);
}

/** The level's surfaces at one extremity: those joined to the other level there, or, when nothing joins the
 * levels there, those that reach into the extremity zone, so the level is still checked end to end. */
function connectors(graph, layout, level, zones, zone) {
  const ids = new Set();
  for (const edge of zones[zone]) {
    for (const id of [edge.a, edge.b]) if (levelOf(layout, graph.surfaces[id]) === level.name) ids.add(id);
  }
  if (ids.size === 0) {
    for (const surface of levelSurfaces(graph, layout, level)) {
      const inZone = zone === "left" ? surface.x0 <= layout.leftZoneMax : surface.x1 >= layout.rightZoneMin;
      if (inZone) ids.add(surface.id);
    }
  }
  return [...ids];
}

function attachmentLinks(graph, memberSet, mainSet) {
  return graph.links.filter((link) => (memberSet.has(link.lo) && mainSet.has(link.hi)) || (memberSet.has(link.hi) && mainSet.has(link.lo)));
}

function extentOf(graph, surfaces, attachments, mainSet) {
  let min = Infinity;
  let max = -Infinity;
  for (const surface of surfaces) {
    min = Math.min(min, surface.x0);
    max = Math.max(max, surface.x1);
  }
  for (const edge of attachments) {
    const mainEnd = mainSet.has(edge.a) ? edge.from : edge.to;
    min = Math.min(min, mainEnd.col);
    max = Math.max(max, mainEnd.col);
  }
  return { min, max, length: max - min + 1 };
}

function checkLevel(graph, layout, level, zones, errors, warnings, rules) {
  const inLevel = (surface) => levelOf(layout, surface) === level.name;
  const surfaces = levelSurfaces(graph, layout, level);
  const height = Math.max(1, level.floorRows[1] - level.floorRows[0]);
  const altitude = (surface) => (level.floorRows[1] - surface.floorRow) / height;
  const left = connectors(graph, layout, level, zones, "left");
  const right = connectors(graph, layout, level, zones, "right");
  const main = left.length && right.length ? lowestRoute(graph, left, right, inLevel, altitude) : null;
  if (!main) {
    errors.push({ code: "LEVEL_CUT", message: `the ${level.name} level cannot be crossed from its left wall to its right wall without leaving it` });
    return { name: level.name, main: [], branches: [] };
  }
  const mainSet = new Set(main);
  for (const edge of graph.edges) {
    if (mainSet.has(edge.a) && mainSet.has(edge.b) && edge.type === EDGE.WALL) {
      warnings.push({ code: "MAIN_CLIMB", message: `the main route of the ${level.name} level climbs a wall at ${edgeWhere(graph, edge)}`, edge: edge.id });
    }
  }
  const rest = components(graph, (surface) => inLevel(surface) && !mainSet.has(surface.id));
  const branches = [];
  for (let part = 0; part < rest.count; part += 1) {
    const members = surfaces.filter((surface) => rest.of.get(surface.id) === part);
    const memberSet = new Set(members.map((surface) => surface.id));
    const links = attachmentLinks(graph, memberSet, mainSet);
    const attachments = links.flatMap((link) => link.edges.map((id) => graph.edges[id]));
    const label = `branch at ${where(members[0])}`;
    if (links.length < 2) errors.push({ code: "BRANCH_DEAD_END", message: `${label} joins the main route at ${links.length} place(s); it must leave it at one and come back at another`, surfaces: [...memberSet] });
    for (const edge of graph.edges) {
      if (!memberSet.has(edge.a) && !memberSet.has(edge.b)) continue;
      if (edge.type === EDGE.WALL) errors.push({ code: "BRANCH_WALL", message: `${label} uses a wall climb at ${edgeWhere(graph, edge)}`, edge: edge.id });
      if (levelOf(layout, graph.surfaces[edge.a]) !== levelOf(layout, graph.surfaces[edge.b])) {
        errors.push({ code: "BRANCH_CROSSES", message: `${label} touches the other level at ${edgeWhere(graph, edge)}`, edge: edge.id });
      }
    }
    const extent = extentOf(graph, members, attachments, mainSet);
    const ratio = extent.length / layout.width;
    if (ratio < rules.minBranchRatio) errors.push({ code: "BRANCH_SHORT", message: `${label} spans ${extent.length} of ${layout.width} tiles (${pct(ratio)}); the minimum is ${pct(rules.minBranchRatio)}`, surfaces: [...memberSet] });
    if (ratio > rules.maxBranchRatio) errors.push({ code: "BRANCH_LONG", message: `${label} spans ${extent.length} of ${layout.width} tiles (${pct(ratio)}); the maximum is ${pct(rules.maxBranchRatio)}`, surfaces: [...memberSet] });
    branches.push({ surfaces: [...memberSet], attachments: links.map((link) => link.id), min: extent.min, max: extent.max, length: extent.length, ratio });
  }
  if (branches.length < rules.minBranchesPerLevel) errors.push({ code: "NO_BRANCH", message: `the ${level.name} level has no branch; it needs at least ${rules.minBranchesPerLevel}` });
  if (branches.length >= 2) {
    const thirds = new Set(branches.map((branch) => Math.min(2, Math.floor(((branch.min + branch.max) / 2 - layout.walls.left.col) / (layout.width / 3)))));
    if (thirds.size === 1) warnings.push({ code: "BRANCHES_CLUSTERED", message: `all branches of the ${level.name} level sit in the same third of it` });
    if (new Set(branches.map((branch) => branch.length)).size === 1) warnings.push({ code: "BRANCHES_SAME_LENGTH", message: `all branches of the ${level.name} level have the same length` });
  }
  return { name: level.name, floorRows: level.floorRows, main, branches };
}

function pct(ratio) {
  return `${Math.round(ratio * 1000) / 10}%`;
}

/** Validates a map. `graph` is built with the conservative reach, `fullGraph` with the full-speed reach. */
export function validate({ layout, graph, fullGraph }, rules = RULES) {
  const errors = [];
  const warnings = [];
  checkNetwork(graph, errors);
  const zones = checkConnections(fullGraph, layout, errors);
  const conservativeZones = checkConnections(graph, layout, []);
  const levels = layout.levels.map((level) => checkLevel(graph, layout, level, conservativeZones, errors, warnings, rules));
  const report = {
    width: layout.width,
    separatorRow: layout.separatorRow,
    walls: layout.walls,
    surfaces: graph.surfaces.length,
    edges: graph.edges.length,
    crossLevel: Object.fromEntries(Object.entries(zones).map(([zone, edges]) => [zone, edges.map((edge) => edge.id)])),
    levels,
  };
  return { ok: errors.length === 0, errors, warnings, report };
}

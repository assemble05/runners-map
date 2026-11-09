#!/usr/bin/env node
// The routes of the laps of a circuit, as data the game plays in place (docs/rules.md, "The routes of a lap").
//   node tools/routes.mjs <template.js|rows.txt> [--out routes.json] [--limit 64]
// The spawn is the circuit's own: the air above the floor at the left end of the track (the zerun-laps profile).

import { readFileSync, writeFileSync } from "node:fs";
import { basename, extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PHYSICS } from "../src/config.js";
import { buildGraph } from "../src/graph/surfaces.js";
import { fromRows } from "../src/grid/tiles.js";
import { spawnOf } from "../src/validate/circuit.js";
import { HEADINGS, routesOf } from "../src/validate/routes.js";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const file = args.find((arg, i) => !arg.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
if (!file) {
  console.error("usage: node tools/routes.mjs <template.js|rows.txt> [--out routes.json] [--limit 64]");
  process.exit(2);
}

let rows;
let name;
if (extname(file) === ".js" || extname(file) === ".mjs") {
  const { template } = await import(pathToFileURL(resolve(file)).href);
  rows = template.rows;
  name = template.name;
} else {
  rows = readFileSync(resolve(file), "utf8").split(/\r?\n/).filter((line) => line.length > 0);
  name = basename(file).replace(/\..*$/, "");
}
const tiles = fromRows(rows);
const spawn = spawnOf(buildGraph(tiles, PHYSICS));
if (!spawn) {
  console.error(`${file}: no floor to spawn on`);
  process.exit(1);
}
const limit = flag("--limit") !== undefined ? Number(flag("--limit")) : 64;
const result = routesOf(tiles, spawn, { routeLimit: limit });
const out = {
  map: name,
  source: `runners-map tools/routes.mjs from ${basename(file)}`,
  coordinates: "[col, row] in tiles; col 0 at the left, row 0 at the top",
  headings: HEADINGS,
  rules: [
    "The circuit stays in place. Lap n is played on route n mod count: its corridor is open, its gates are closed, the rest of the map is as drawn.",
    "A route's cells are its centreline in travel order; the last joins the first. Each cell carries the index of its heading in `headings`.",
    "The heading of any open cell is the heading of its nearest route cell (straight-line distance; the earlier cell on a tie).",
    "The corridor is given as row runs [row, firstCol, lastCol]; it holds every air cell nearer to the route than to the rest of the track.",
    "The gates are the air cells just outside the corridor: closing them seals the lap (sealed says whether it does).",
    "A lap is counted when a runner crosses the lap line in the lap heading; the lap line is the corridor's cross-section at the start.",
    "The route leaves the start to the right when it can, else upward.",
    "clearance is the air column through each route cell: stand is the share with 3 tiles or more (the runner stands), slide counts the cells with 2 (slide only), crushed the cells with 1 (the runner cannot pass). A route with crushed cells is not runnable.",
    "clearance.lowClimbs lists the steps up the body cannot make: a step of h tiles needs an air column of 2.5 + h tiles at the lower standing cell (4 for a 1-tile step). A route with low climbs is not runnable as drawn.",
  ],
  spawn: { entry: result.spawn, on: result.start },
  count: result.routes.length,
  exact: result.exact,
  lapHeading: result.lapHeading === null ? null : HEADINGS[result.lapHeading],
  lapLine: result.lapLine,
  routes: result.routes,
};
const target = resolve(flag("--out") ?? `${name}.routes.json`);
writeFileSync(target, JSON.stringify(out) + "\n");

const lengths = result.routes.map((route) => route.length).sort((a, b) => a - b);
const gates = result.routes.map((route) => route.gates.length);
const unsealed = result.routes.filter((route) => !route.sealed).length;
const passable = result.routes.filter((route) => route.clearance.crushed === 0);
const best = [...passable].sort((a, b) => b.clearance.stand - a.clearance.stand || a.length - b.length)[0];
const runnable = passable.filter((route) => route.clearance.lowClimbs.length === 0);
console.log(`${name}: ${result.routes.length} route(s) through the spawn${result.exact ? "" : " (more than the limit)"}, spawn ${JSON.stringify(result.spawn)} on ${JSON.stringify(result.start)}, lap heading ${out.lapHeading}, lap line ${result.lapLine.length} cell(s)`);
if (lengths.length) {
  console.log(`  length ${lengths[0]}-${lengths[lengths.length - 1]} cells (median ${lengths[Math.floor(lengths.length / 2)]}); gates ${Math.min(...gates)}-${Math.max(...gates)} per route; ${unsealed} route(s) not sealed by their gates`);
}
console.log(`  clearance: ${passable.length} route(s) with no 1-tile cell (passable); best standing share ${best ? `${Math.round(best.clearance.stand * 100)}% on route ${best.id} (${best.length} cells, ${best.clearance.slide} slide cell(s))` : "none"}`);
console.log(`  climbs: ${runnable.length} passable route(s) with no step up under a low ceiling (a 1-tile step needs a 4-tile column); low climbs per passable route ${passable.length ? `${Math.min(...passable.map((r) => r.clearance.lowClimbs.length))}-${Math.max(...passable.map((r) => r.clearance.lowClimbs.length))}` : "n/a"}`);
console.log(`  wrote ${target}`);
process.exitCode = unsealed ? 1 : 0;

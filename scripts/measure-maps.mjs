// Probe: what the real SpeedRunners maps look like as graphs under a reach profile, plus lane statistics.
// node scripts/measure-maps.mjs <fixtures dir> [up] [across]
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildGraph, decodePng, toCells, toTiles } from "../src/index.js";
import { bridges, components, degree } from "../src/graph/analysis.js";

const root = process.argv[2];
const up = Number(process.argv[3] ?? 6);
const across = Number(process.argv[4] ?? 8);
const physics = { maxJumpUp: up, maxJumpAcross: across, fullSpeedJumpAcross: across, minWallHeight: 2 };
console.log(`profile up=${up} across=${across}`);
console.log(["map", "cols", "surf", "pockets", "parts", "largest%", "deadEnds", "bridges", "lanes2%", "lanes3%", "ms"].join("\t"));
const summary = { current: [], legacy: [] };
for (const dir of ["legacy", "current"]) {
  for (const name of readdirSync(join(root, dir)).filter((n) => n.endsWith(".png")).sort()) {
    const tiles = toTiles(toCells(decodePng(readFileSync(join(root, dir, name)))), { tile: 2 });
    const started = Date.now();
    const graph = buildGraph(tiles, physics);
    const parts = components(graph);
    const sizes = new Map();
    for (const [, part] of parts.of) sizes.set(part, (sizes.get(part) ?? 0) + 1);
    const largest = Math.max(0, ...sizes.values());
    const largestShare = Math.round((100 * largest) / Math.max(1, graph.surfaces.length));
    const deadEnds = graph.surfaces.filter((s) => degree(graph, s.id) < 2).length;
    const perColumn = new Int32Array(tiles.cols);
    for (const s of graph.surfaces) for (let c = s.x0; c <= s.x1; c += 1) perColumn[c] += 1;
    const used = [...perColumn].filter((n) => n > 0);
    const lanes2 = Math.round((100 * used.filter((n) => n >= 2).length) / Math.max(1, used.length));
    const lanes3 = Math.round((100 * used.filter((n) => n >= 3).length) / Math.max(1, used.length));
    summary[dir].push({ largestShare, deadEnds, bridgesCount: bridges(graph).length, lanes2, lanes3 });
    console.log([`${dir}/${name.replace(".png", "")}`, tiles.cols, graph.surfaces.length, graph.pockets, parts.count, largestShare, deadEnds, bridges(graph).length, lanes2, lanes3, Date.now() - started].join("\t"));
  }
}
for (const dir of ["current", "legacy"]) {
  const rows = summary[dir];
  const min = (key) => Math.min(...rows.map((r) => r[key]));
  const max = (key) => Math.max(...rows.map((r) => r[key]));
  console.log(`${dir}: largest% min=${min("largestShare")}  deadEnds max=${max("deadEnds")}  bridges max=${max("bridgesCount")}  lanes2% min=${min("lanes2")}  lanes3% min=${min("lanes3")}`);
}

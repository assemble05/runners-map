// The pipeline: image -> cells -> tiles -> (levels) -> graph -> validation -> template.
// `analyzeTiles` is the pure core; `analyzeImage` adds the PNG step; `importImage` is the whole road from an
// attached drawing to game templates (ADR 0008): fidelity, dead-end stubs, openings and variants, validation
// with the target game's physics. A profile picks the physics and the rules (ADR 0007): "two-levels" (the
// owner's course piece), "circuit" (a race track with SpeedRunners' reach) or "zerun-circuit" (a race track
// with Zerun's reach and world).

import { decodePng } from "./image/png.js";
import { toCells } from "./image/binarize.js";
import { compareToSource } from "./image/compare.js";
import { fromRows, toRows, toTiles } from "./grid/tiles.js";
import { applyRamps } from "./grid/ramps.js";
import { describeLevels } from "./grid/levels.js";
import { corridorStats } from "./grid/corridors.js";
import { findOpenings, listVariants } from "./grid/openings.js";
import { buildGraph } from "./graph/surfaces.js";
import { describeStub, findStubs, treatStubs } from "./graph/stubs.js";
import { validate } from "./validate/rules.js";
import { validateCircuit } from "./validate/circuit.js";
import { endFloorRows, lowerFloorRow, toTemplate } from "./template/emit.js";
import { IMAGE, IMPORT, PROFILES } from "./config.js";

export { decodePng, encodePng } from "./image/png.js";
export { toCells } from "./image/binarize.js";
export { compareToSource } from "./image/compare.js";
export { rowsToImage } from "./image/draw.js";
export { cloneTiles, fromRows, toRows, toTiles } from "./grid/tiles.js";
export { describeLevels } from "./grid/levels.js";
export { corridorStats } from "./grid/corridors.js";
export { findOpenings, listVariants } from "./grid/openings.js";
export { buildGraph } from "./graph/surfaces.js";
export { findStubs, treatStubs } from "./graph/stubs.js";
export { validate } from "./validate/rules.js";
export { validateCircuit } from "./validate/circuit.js";
export { summarize, summarizeImport } from "./validate/summary.js";
export { toModule, toTemplate } from "./template/emit.js";
export { renderPreview } from "./render/preview.js";
export { IMPORT, PROFILES, WORLD } from "./config.js";

function presetFor(options) {
  const profile = options.profile ?? "two-levels";
  const preset = PROFILES[profile];
  if (!preset) throw new Error(`unknown profile "${profile}"; use ${Object.keys(PROFILES).join(", ")}`);
  return { profile, physics: { ...preset.physics, ...options.physics }, rules: { ...preset.rules, ...options.rules } };
}

function analyzeCircuit(tiles, options, profile, physics, rules) {
  const graph = buildGraph(tiles, physics);
  const validation = validateCircuit({ tiles, graph }, rules);
  const ends = endFloorRows(graph);
  const template = toTemplate(tiles, { ...options, defaultEntryRow: ends.entry, defaultExitRow: ends.exit });
  return { ok: validation.ok, profile, tiles, layout: { ok: true }, graph, fullGraph: graph, validation, template };
}

function analyzeTwoLevels(tiles, options, profile, physics, rules) {
  const layout = describeLevels(tiles, options);
  if (!layout.ok) {
    return { ok: false, profile, tiles, layout, validation: { ok: false, errors: [{ code: "LAYOUT", message: layout.error }], warnings: [], report: null } };
  }
  const graph = buildGraph(tiles, physics);
  const fullGraph = buildGraph(tiles, { ...physics, maxJumpAcross: physics.fullSpeedJumpAcross });
  const validation = validate({ tiles, layout, graph, fullGraph }, rules);
  const template = toTemplate(tiles, { ...options, defaultEntryRow: lowerFloorRow(tiles, layout) });
  return { ok: validation.ok, profile, tiles, layout, graph, fullGraph, validation, template };
}

/** Analyzes a tile grid. Options: profile, separatorRow, extremityCols, physics, rules, name, difficulty,
 * weight, entryRow, exitRow. */
export function analyzeTiles(tiles, options = {}) {
  const { profile, physics, rules } = presetFor(options);
  if (profile === "circuit" || profile === "zerun-circuit" || profile === "zerun-laps") return analyzeCircuit(tiles, options, profile, physics, rules);
  return analyzeTwoLevels(tiles, options, profile, physics, rules);
}

function imageToTiles(bytes, options) {
  const image = decodePng(bytes);
  const cells = toCells(image, { threshold: options.threshold ?? IMAGE.threshold, platformGray: options.platformGray, whiteIsAir: options.whiteIsAir });
  const tile = options.tile ?? IMAGE.tile;
  const tiles = toTiles(cells, { tile, coverage: options.coverage ?? IMAGE.coverage });
  return { image, cells, tile, tiles };
}

/** Analyzes a PNG. Options as analyzeTiles plus tile, coverage, threshold, platformGray and whiteIsAir
 * (a corridor drawing: white is the open path, black is rock; the default is white rock on black air). */
export function analyzeImage(bytes, options = {}) {
  const { tiles } = imageToTiles(bytes, options);
  const result = analyzeTiles(tiles, options);
  result.validation.warnings = [...tiles.warnings.map((message) => ({ code: "IMAGE", message })), ...result.validation.warnings];
  return result;
}

/** Analyzes template rows (the text form), for round trips and tests. */
export function analyzeRows(rows, options = {}) {
  return analyzeTiles(fromRows(rows), options);
}

/** What `measure` prints for one tile size: the grid, the corridors against the runner, the rows against the
 * world, the fidelity. */
export function measureTile(cells, tile, options = {}) {
  const { physics, rules } = presetFor({ profile: options.profile ?? IMPORT.profile });
  const tiles = toTiles(cells, { tile, coverage: options.coverage ?? IMAGE.coverage });
  const corridors = corridorStats(tiles);
  const fidelity = compareToSource(cells, tiles, tile).fidelity;
  const standRows = physics.headroom.stand;
  return {
    tile,
    cols: tiles.cols,
    rows: tiles.rows,
    corridors,
    fidelity,
    fitsWorld: rules.worldRows ? tiles.rows <= rules.worldRows : true,
    fitsRunner: corridors.p10 >= standRows,
    worldRows: rules.worldRows,
    standRows,
  };
}

/** The whole road from a drawing to templates. Options as analyzeImage plus name, deadEnds (barrier, fill,
 * keep), minStubDepth and minFidelity. The profile defaults to zerun-circuit. */
export function importImage(bytes, options = {}) {
  const profile = options.profile ?? IMPORT.profile;
  const { cells, tile, tiles } = imageToTiles(bytes, { ...options, profile });
  const name = options.name ?? "map";
  const minFidelity = options.minFidelity ?? IMPORT.minFidelity;
  const treatment = options.deadEnds ?? IMPORT.deadEnds;
  const corridors = corridorStats(tiles);
  const minStubDepth = Math.max(options.minStubDepth ?? IMPORT.minStubDepth, corridors.median);
  const raw = compareToSource(cells, tiles, tile);
  const openings = findOpenings(tiles);
  const variants = listVariants(tiles, openings, name).map((variant) => {
    const found = findStubs(variant.tiles, { minDepth: minStubDepth });
    const treated = treatStubs(variant.tiles, found, treatment);
    const result = analyzeTiles(treated.tiles, { ...options, profile, name: variant.name, entryRow: variant.entry?.floorRow, exitRow: variant.exit?.floorRow });
    // the template the game loads carries ramps where the drawing's diagonals were stairs (grid/ramps.js); the analysis
    // and the fidelity stay on the tiles as converted, since a ramp is still solid for them and the air does not change
    const ramped = applyRamps(treated.tiles);
    result.template = { ...result.template, rows: toRows(ramped.tiles) };
    result.rampedTiles = ramped.tiles;
    const fidelity = compareToSource(cells, treated.tiles, tile);
    const stubs = treated.stubs.map(describeStub);
    const warnings = [...tiles.warnings.map((message) => ({ code: "IMAGE", message })), ...result.validation.warnings];
    if (stubs.some((stub) => stub.treatment === "keep")) {
      const kept = stubs.filter((stub) => stub.treatment === "keep");
      warnings.push({ code: "STUB", message: `${kept.length} dead-end corridor(s) left as drawn`, cells: kept.flatMap((stub) => []) });
    }
    const errors = [...result.validation.errors];
    if (fidelity.fidelity < minFidelity) {
      errors.push({ code: "LOW_FIDELITY", message: `the tiles keep ${pct(fidelity.fidelity)} of the drawing; the minimum is ${pct(minFidelity)}; use a smaller tile or a cleaner drawing` });
    }
    result.validation = { ...result.validation, ok: errors.length === 0, errors, warnings };
    result.ok = errors.length === 0;
    return { name: variant.name, entry: variant.entry, exit: variant.exit, closed: variant.closed, stubs, stubCells: treated.stubs.flatMap((stub) => (stub.treatment === "keep" ? [] : stub.regionCells)), fidelity, ramps: ramped.ramps.length, result };
  });
  return {
    name,
    profile,
    tile,
    cells,
    tiles,
    corridors,
    minStubDepth,
    treatment,
    openings,
    topology: openings.topology,
    fidelity: raw,
    variants,
    ok: variants.every((variant) => variant.result.ok),
  };
}

function pct(ratio) {
  return `${Math.round(ratio * 1000) / 10}%`;
}

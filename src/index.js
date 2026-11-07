// The pipeline: image -> cells -> tiles -> (levels) -> graph -> validation -> template.
// `analyzeTiles` is the pure core; `analyzeImage` adds the PNG step. Both return everything a tool needs.
// A profile picks the physics and the rules (ADR 0007): "two-levels" (the owner's course piece) or "circuit"
// (a race track like SpeedRunners').

import { decodePng } from "./image/png.js";
import { toCells } from "./image/binarize.js";
import { fromRows, toTiles } from "./grid/tiles.js";
import { describeLevels } from "./grid/levels.js";
import { buildGraph } from "./graph/surfaces.js";
import { validate } from "./validate/rules.js";
import { validateCircuit } from "./validate/circuit.js";
import { endFloorRows, lowerFloorRow, toTemplate } from "./template/emit.js";
import { IMAGE, PROFILES } from "./config.js";

export { decodePng, encodePng } from "./image/png.js";
export { toCells } from "./image/binarize.js";
export { rowsToImage } from "./image/draw.js";
export { fromRows, toRows, toTiles } from "./grid/tiles.js";
export { describeLevels } from "./grid/levels.js";
export { buildGraph } from "./graph/surfaces.js";
export { validate } from "./validate/rules.js";
export { validateCircuit } from "./validate/circuit.js";
export { summarize } from "./validate/summary.js";
export { toModule, toTemplate } from "./template/emit.js";
export { renderPreview } from "./render/preview.js";
export { PROFILES } from "./config.js";

function presetFor(options) {
  const profile = options.profile ?? "two-levels";
  const preset = PROFILES[profile];
  if (!preset) throw new Error(`unknown profile "${profile}"; use ${Object.keys(PROFILES).join(" or ")}`);
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
  const validation = validate({ layout, graph, fullGraph }, rules);
  const template = toTemplate(tiles, { ...options, defaultEntryRow: lowerFloorRow(tiles, layout) });
  return { ok: validation.ok, profile, tiles, layout, graph, fullGraph, validation, template };
}

/** Analyzes a tile grid. Options: profile, separatorRow, extremityCols, physics, rules, name, difficulty,
 * weight, entryRow, exitRow. */
export function analyzeTiles(tiles, options = {}) {
  const { profile, physics, rules } = presetFor(options);
  if (profile === "circuit") return analyzeCircuit(tiles, options, profile, physics, rules);
  return analyzeTwoLevels(tiles, options, profile, physics, rules);
}

/** Analyzes a PNG. Options as analyzeTiles plus tile, coverage, threshold, platformGray and whiteIsAir
 * (a corridor drawing: white is the open path, black is rock; the default is white rock on black air). */
export function analyzeImage(bytes, options = {}) {
  const image = decodePng(bytes);
  const cells = toCells(image, { threshold: options.threshold ?? IMAGE.threshold, platformGray: options.platformGray, whiteIsAir: options.whiteIsAir });
  const tiles = toTiles(cells, { tile: options.tile ?? IMAGE.tile, coverage: options.coverage ?? IMAGE.coverage });
  const result = analyzeTiles(tiles, options);
  result.validation.warnings = [...tiles.warnings.map((message) => ({ code: "IMAGE", message })), ...result.validation.warnings];
  return result;
}

/** Analyzes template rows (the text form), for round trips and tests. */
export function analyzeRows(rows, options = {}) {
  return analyzeTiles(fromRows(rows), options);
}

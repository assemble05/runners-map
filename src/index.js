// The pipeline: image -> cells -> tiles -> levels -> graph -> validation -> template.
// `analyzeTiles` is the pure core; `analyzeImage` adds the PNG step. Both return everything a tool needs.

import { decodePng } from "./image/png.js";
import { toCells } from "./image/binarize.js";
import { fromRows, toTiles } from "./grid/tiles.js";
import { describeLevels } from "./grid/levels.js";
import { buildGraph } from "./graph/surfaces.js";
import { validate } from "./validate/rules.js";
import { toTemplate } from "./template/emit.js";
import { IMAGE, PHYSICS, RULES } from "./config.js";

export { decodePng, encodePng } from "./image/png.js";
export { toCells } from "./image/binarize.js";
export { fromRows, toRows, toTiles } from "./grid/tiles.js";
export { describeLevels } from "./grid/levels.js";
export { buildGraph } from "./graph/surfaces.js";
export { validate } from "./validate/rules.js";
export { toModule, toTemplate } from "./template/emit.js";
export { renderPreview } from "./render/preview.js";

/** Analyzes a tile grid. Options: separatorRow, extremityCols, physics, rules, name, difficulty, weight, entryRow, exitRow. */
export function analyzeTiles(tiles, options = {}) {
  const layout = describeLevels(tiles, options);
  if (!layout.ok) {
    return { ok: false, tiles, layout, validation: { ok: false, errors: [{ code: "LAYOUT", message: layout.error }], warnings: [], report: null } };
  }
  const physics = { ...PHYSICS, ...options.physics };
  const graph = buildGraph(tiles, physics);
  const fullGraph = buildGraph(tiles, { ...physics, maxJumpAcross: physics.fullSpeedJumpAcross });
  const validation = validate({ layout, graph, fullGraph }, { ...RULES, ...options.rules });
  const template = toTemplate(tiles, layout, options);
  return { ok: validation.ok, tiles, layout, graph, fullGraph, validation, template };
}

/** Analyzes a PNG. Options as analyzeTiles plus tile, coverage, threshold, platformGray. */
export function analyzeImage(bytes, options = {}) {
  const image = decodePng(bytes);
  const cells = toCells(image, { threshold: options.threshold ?? IMAGE.threshold, platformGray: options.platformGray });
  const tiles = toTiles(cells, { tile: options.tile ?? IMAGE.tile, coverage: options.coverage ?? IMAGE.coverage });
  const result = analyzeTiles(tiles, options);
  result.validation.warnings = [...tiles.warnings.map((message) => ({ code: "IMAGE", message })), ...result.validation.warnings];
  return result;
}

/** Analyzes template rows (the text form), for round trips and tests. */
export function analyzeRows(rows, options = {}) {
  return analyzeTiles(fromRows(rows), options);
}

// A picture of what the validator saw: tiles, surfaces by role (main route or network, branch, problem), moves
// by type. Green is a main route, blue a branch, red an error, orange a warning, yellow a wall climb, grey a jump
// or drop.

import { encodePng } from "../image/png.js";
import { EDGE } from "../graph/surfaces.js";

const COLORS = Object.freeze({
  empty: [20, 17, 32],
  solid: [58, 52, 80],
  platform: [133, 122, 176],
  main: [76, 175, 80],
  branch: [66, 133, 244],
  problem: [229, 57, 53],
  warning: [255, 152, 0],
  wall: [242, 193, 78],
  move: [150, 150, 150],
});

const SCALE = 6;

function painter(width, height) {
  const rgba = new Uint8Array(width * height * 4);
  const put = (x, y, [r, g, b]) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    rgba.set([r, g, b, 255], (y * width + x) * 4);
  };
  const box = (x, y, w, h, color) => {
    for (let j = 0; j < h; j += 1) for (let i = 0; i < w; i += 1) put(x + i, y + j, color);
  };
  const line = (x0, y0, x1, y1, color) => {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0;
    let y = y0;
    while (true) {
      put(x, y, color);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  };
  return { rgba, box, line };
}

function roles(validation) {
  const role = new Map();
  const report = validation.report ?? {};
  for (const level of report.levels ?? []) {
    for (const id of level.main) role.set(id, COLORS.main);
    for (const branch of level.branches) for (const id of branch.surfaces) role.set(id, COLORS.branch);
  }
  for (const id of report.network ?? []) role.set(id, COLORS.main);
  const mark = (findings, color) => {
    for (const finding of findings) {
      if (finding.surface !== undefined) role.set(finding.surface, color);
      for (const id of finding.surfaces ?? []) role.set(id, color);
    }
  };
  mark(validation.warnings, COLORS.warning);
  mark(validation.errors, COLORS.problem);
  return role;
}

function edgeColors(validation) {
  const colors = new Map();
  for (const finding of validation.warnings) {
    if (finding.edge !== undefined) colors.set(finding.edge, COLORS.warning);
    for (const id of finding.edges ?? []) colors.set(id, COLORS.warning);
  }
  for (const finding of validation.errors) {
    if (finding.edge !== undefined) colors.set(finding.edge, COLORS.problem);
    for (const id of finding.edges ?? []) colors.set(id, COLORS.problem);
  }
  return colors;
}

/** Renders the tiles, the graph and the validation into a PNG byte array. */
export function renderPreview(tiles, graph, validation) {
  const width = tiles.cols * SCALE;
  const height = tiles.rows * SCALE;
  const paint = painter(width, height);
  for (let row = 0; row < tiles.rows; row += 1) {
    for (let col = 0; col < tiles.cols; col += 1) {
      paint.box(col * SCALE, row * SCALE, SCALE, SCALE, COLORS[tiles.kinds[row][col]]);
    }
  }
  const role = roles(validation);
  for (const surface of graph.surfaces) {
    const color = role.get(surface.id) ?? COLORS.move;
    paint.box(surface.x0 * SCALE, surface.row * SCALE + SCALE - 2, (surface.x1 - surface.x0 + 1) * SCALE, 2, color);
  }
  const colors = edgeColors(validation);
  const half = Math.floor(SCALE / 2);
  for (const edge of graph.edges) {
    const color = colors.get(edge.id) ?? (edge.type === EDGE.WALL ? COLORS.wall : COLORS.move);
    paint.line(edge.from.col * SCALE + half, edge.from.row * SCALE + half, edge.to.col * SCALE + half, edge.to.row * SCALE + half, color);
  }
  return encodePng({ width, height, rgba: paint.rgba });
}

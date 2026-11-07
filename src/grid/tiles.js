// Cells to tiles. A tile is a 12 x 12 px cell of the course (Zerun GLOSSARY). A tile is solid or platform when
// at least `coverage` of its pixels are, which forgives antialiasing and a brush that is a pixel off the grid.
// Rows use the characters of Zerun's TemplateUtil: '#' solid, '=' platform, '.' empty.

import { CELL } from "../image/binarize.js";

export const KIND = Object.freeze({ EMPTY: "empty", SOLID: "solid", PLATFORM: "platform" });

export const CHAR_TO_KIND = Object.freeze({ ".": KIND.EMPTY, "#": KIND.SOLID, "=": KIND.PLATFORM });
export const KIND_TO_CHAR = Object.freeze({ [KIND.EMPTY]: ".", [KIND.SOLID]: "#", [KIND.PLATFORM]: "=" });

const DEFAULTS = Object.freeze({ tile: 12, coverage: 0.5 });

/** Converts a cell grid into a tile grid: { cols, rows, kinds, warnings }. */
export function toTiles(grid, options = {}) {
  const { tile, coverage } = { ...DEFAULTS, ...options };
  const cols = Math.floor(grid.width / tile);
  const rows = Math.floor(grid.height / tile);
  const warnings = [];
  if (cols * tile !== grid.width || rows * tile !== grid.height) {
    warnings.push(`image is ${grid.width}x${grid.height} px, not a multiple of ${tile}; the remainder on the right and bottom was dropped`);
  }
  const kinds = [];
  for (let row = 0; row < rows; row += 1) {
    const line = [];
    for (let col = 0; col < cols; col += 1) {
      let solid = 0;
      let platform = 0;
      for (let y = row * tile; y < (row + 1) * tile; y += 1) {
        for (let x = col * tile; x < (col + 1) * tile; x += 1) {
          const cell = grid.cells[y * grid.width + x];
          if (cell === CELL.SOLID) solid += 1;
          else if (cell === CELL.PLATFORM) platform += 1;
        }
      }
      const filled = (solid + platform) / (tile * tile);
      if (filled < coverage) line.push(KIND.EMPTY);
      else line.push(solid >= platform ? KIND.SOLID : KIND.PLATFORM);
    }
    kinds.push(line);
  }
  return { cols, rows, kinds, warnings };
}

/** Parses template rows ('#', '=', '.'; other characters count as empty) into a tile grid. */
export function fromRows(rowsText) {
  const kinds = rowsText.map((line) => Array.from(line, (ch) => CHAR_TO_KIND[ch] ?? KIND.EMPTY));
  const cols = Math.max(0, ...kinds.map((line) => line.length));
  for (const line of kinds) while (line.length < cols) line.push(KIND.EMPTY);
  return { cols, rows: kinds.length, kinds, warnings: [] };
}

/** Serializes a tile grid as template rows. */
export function toRows(tiles) {
  return tiles.kinds.map((line) => line.map((kind) => KIND_TO_CHAR[kind]).join(""));
}

export function isSolid(tiles, col, row) {
  return tiles.kinds[row]?.[col] === KIND.SOLID;
}

export function isStandable(tiles, col, row) {
  const kind = tiles.kinds[row]?.[col];
  return kind === KIND.SOLID || kind === KIND.PLATFORM;
}

export function isEmpty(tiles, col, row) {
  return tiles.kinds[row]?.[col] === KIND.EMPTY;
}

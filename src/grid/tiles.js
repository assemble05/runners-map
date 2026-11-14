// Cells to tiles. A tile is a square cell of the course (12 x 12 px in Zerun, GLOSSARY). A tile is solid or
// platform when at least `coverage` of its pixels are, which forgives antialiasing and a brush a pixel off the
// grid. Rows use the characters of Zerun's TemplateUtil: '#' solid, '=' platform, '.' empty, and the entity and
// hazard characters as marks on a tile ('W' barrier, 'B' box, 'c' coin, 'P' power, 's' skull, 'N' npc,
// 'K' skeleton, 't' torch, '^' 'v' spikes, '-' laser, '>' boost). A barrier or a box blocks the runner.

import { CELL } from "../image/binarize.js";

// Ramps (grid/ramps.js): '/' is a floor rising to the right (solid lower-right triangle), '\' a floor rising to the left
// (solid lower-left triangle). For the analysis they are solid and standable; the runner walks over them without a jump.
export const KIND = Object.freeze({ EMPTY: "empty", SOLID: "solid", PLATFORM: "platform", RAMP_RIGHT: "ramp-right", RAMP_LEFT: "ramp-left" });

export const CHAR_TO_KIND = Object.freeze({ ".": KIND.EMPTY, "#": KIND.SOLID, "=": KIND.PLATFORM, "/": KIND.RAMP_RIGHT, "\\": KIND.RAMP_LEFT });
export const KIND_TO_CHAR = Object.freeze({ [KIND.EMPTY]: ".", [KIND.SOLID]: "#", [KIND.PLATFORM]: "=", [KIND.RAMP_RIGHT]: "/", [KIND.RAMP_LEFT]: "\\" });

/** Characters Zerun's TemplateUtil accepts on top of a tile, and the kind of tile they sit on. */
export const MARK_KINDS = Object.freeze({ W: KIND.EMPTY, B: KIND.EMPTY, c: KIND.EMPTY, P: KIND.EMPTY, s: KIND.EMPTY, N: KIND.EMPTY, K: KIND.EMPTY, t: KIND.EMPTY, "^": KIND.EMPTY, v: KIND.EMPTY, "-": KIND.EMPTY, ">": KIND.SOLID });

/** Marks the runner cannot pass through: a barrier and a box have HP and stand in the way. */
export const BLOCKING_MARKS = Object.freeze(new Set(["W", "B"]));

const DEFAULTS = Object.freeze({ tile: 12, coverage: 0.5 });

function markKey(col, row) {
  return `${col},${row}`;
}

/** Converts a cell grid into a tile grid: { cols, rows, kinds, marks, warnings }. */
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
  return { cols, rows, kinds, marks: new Map(), warnings };
}

/** Parses template rows ('#', '=', '.', and Zerun's mark characters; anything else is empty) into a tile grid. */
export function fromRows(rowsText) {
  const marks = new Map();
  const kinds = rowsText.map((line, row) =>
    Array.from(line, (ch, col) => {
      if (CHAR_TO_KIND[ch] !== undefined) return CHAR_TO_KIND[ch];
      if (MARK_KINDS[ch] !== undefined) {
        marks.set(markKey(col, row), ch);
        return MARK_KINDS[ch];
      }
      return KIND.EMPTY;
    }),
  );
  const cols = Math.max(0, ...kinds.map((line) => line.length));
  for (const line of kinds) while (line.length < cols) line.push(KIND.EMPTY);
  return { cols, rows: kinds.length, kinds, marks, warnings: [] };
}

/** Serializes a tile grid as template rows. A mark wins over the kind of its tile. */
export function toRows(tiles) {
  return tiles.kinds.map((line, row) => line.map((kind, col) => tiles.marks?.get(markKey(col, row)) ?? KIND_TO_CHAR[kind]).join(""));
}

/** A deep copy, so a treatment never touches the grid it was given. */
export function cloneTiles(tiles) {
  return { cols: tiles.cols, rows: tiles.rows, kinds: tiles.kinds.map((line) => [...line]), marks: new Map(tiles.marks ?? []), warnings: [...(tiles.warnings ?? [])] };
}

export function markAt(tiles, col, row) {
  return tiles.marks?.get(markKey(col, row)) ?? null;
}

export function setMark(tiles, col, row, mark) {
  tiles.marks.set(markKey(col, row), mark);
}

export function isSolid(tiles, col, row) {
  const kind = tiles.kinds[row]?.[col];
  return kind === KIND.SOLID || kind === KIND.RAMP_RIGHT || kind === KIND.RAMP_LEFT;
}

export function isStandable(tiles, col, row) {
  const kind = tiles.kinds[row]?.[col];
  return kind === KIND.SOLID || kind === KIND.PLATFORM || kind === KIND.RAMP_RIGHT || kind === KIND.RAMP_LEFT;
}

export function isEmpty(tiles, col, row) {
  return tiles.kinds[row]?.[col] === KIND.EMPTY;
}

export function isBlocked(tiles, col, row) {
  const mark = markAt(tiles, col, row);
  return mark !== null && BLOCKING_MARKS.has(mark);
}

/** Air the runner can move through: not solid and not blocked. A thin platform is passed through. */
export function isPassable(tiles, col, row) {
  if (row < 0 || row >= tiles.rows || col < 0 || col >= tiles.cols) return false;
  return !isSolid(tiles, col, row) && !isBlocked(tiles, col, row);
}

/** Air the runner can stand in: an empty tile that is not blocked. */
export function isAir(tiles, col, row) {
  return isEmpty(tiles, col, row) && !isBlocked(tiles, col, row);
}

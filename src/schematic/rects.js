// The schematic (decided 08/11 by the owner): a track drawn as rooms and corridors instead of a sketch. A rectangle is air.
// `run` is a part the runner runs through; `slide` is a low tunnel the runner slides through. Everything else is rock.
// The map is the union of the rectangles, so a loop is rectangles that overlap. The floor is the rock under the air.
// The rows use Zerun's characters: '#' rock, '.' air. The world is WORLD.rows tall, with rock on its last row.

import { WORLD, ZERUN_HEADROOM } from "../config.js";

export const RECT_KINDS = Object.freeze(["run", "slide"]);
const ROCK = "#";
const AIR = ".";
const MAX_COLS = 200;

/**
 * The problems of a schematic as { code, message }. SCHEMATIC: the input cannot be read as a schematic. SLIDE_LOW: a
 * slide tunnel is shorter than the runner's slide, so it cannot be slid through.
 */
export function schematicErrors(schematic) {
  const errors = [];
  if (!schematic || !Array.isArray(schematic.rects) || schematic.rects.length === 0) {
    return [{ code: "SCHEMATIC", message: "a schematic needs a non-empty rects list" }];
  }
  schematic.rects.forEach((rect, index) => {
    const at = `rect ${index}`;
    if (!RECT_KINDS.includes(rect.kind)) {
      errors.push({ code: "SCHEMATIC", message: `${at}: kind must be one of ${RECT_KINDS.join(", ")}` });
      return;
    }
    const integers = ["col", "row", "cols", "rows"].every((field) => Number.isInteger(rect[field]));
    if (!integers) {
      errors.push({ code: "SCHEMATIC", message: `${at}: col, row, cols and rows must be integers` });
      return;
    }
    if (rect.col < 1 || rect.row < 1) {
      errors.push({ code: "SCHEMATIC", message: `${at}: col and row start at 1; column 0 and row 0 are the rock edge` });
    }
    if (rect.cols < 1 || rect.rows < 1) {
      errors.push({ code: "SCHEMATIC", message: `${at}: cols and rows must be at least 1` });
    }
    if (rect.col + rect.cols > MAX_COLS) {
      errors.push({ code: "SCHEMATIC", message: `${at}: the map is at most ${MAX_COLS} columns wide` });
    }
    if (rect.row + rect.rows > WORLD.rows - 1) {
      errors.push({ code: "SCHEMATIC", message: `${at}: it reaches row ${rect.row + rect.rows - 1}; the world is ${WORLD.rows} rows and its last row is rock` });
    }
    if (rect.kind === "slide" && rect.rows < ZERUN_HEADROOM.slide) {
      errors.push({ code: "SLIDE_LOW", message: `${at}: a slide tunnel of ${rect.rows} tiles cannot be slid through; the runner needs ${ZERUN_HEADROOM.slide}` });
    }
  });
  return errors;
}

/**
 * The rows of a schematic, and the floors that are slid over: { name, rows, width, height, exempt, errors }. `exempt` holds
 * the floor tiles ("col,row" of the rock) whose air above is slide-only air, so the running height does not apply to them.
 */
export function schematicRows(schematic) {
  const errors = schematicErrors(schematic);
  const fatal = errors.filter((error) => error.code === "SCHEMATIC");
  if (fatal.length) throw new Error(fatal.map((error) => error.message).join("; "));
  const { rects } = schematic;
  const width = Math.max(...rects.map((rect) => rect.col + rect.cols)) + 1;
  const height = WORLD.rows;
  const grid = Array.from({ length: height }, () => new Array(width).fill(ROCK));
  const key = (col, row) => `${col},${row}`;
  const run = new Set();
  const slide = new Set();
  for (const rect of rects) {
    for (let row = rect.row; row < rect.row + rect.rows; row += 1) {
      for (let col = rect.col; col < rect.col + rect.cols; col += 1) {
        grid[row][col] = AIR;
        (rect.kind === "run" ? run : slide).add(key(col, row));
      }
    }
  }
  const exempt = new Set();
  for (let row = 1; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const floor = grid[row][col] === ROCK && grid[row - 1][col] === AIR;
      const above = key(col, row - 1);
      if (floor && slide.has(above) && !run.has(above)) exempt.add(key(col, row));
    }
  }
  return {
    name: schematic.name ?? "schematic",
    rows: grid.map((line) => line.join("")),
    width,
    height,
    exempt,
    errors,
  };
}

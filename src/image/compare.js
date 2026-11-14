// Fidelity: how much of the drawing the tiles keep. The tiles are drawn back at the drawing's own pixel size
// and compared cell by cell with the binarized drawing. The count of pixels that differ, their bounding box
// and a diff picture are the proof; the number is `fidelity`, 1 minus the mismatched share. Pixels the tile
// grid dropped (the remainder when the image is not a multiple of the tile) are counted apart as `cropped`.
// This is the "before and after" of Zerun's visual-check applied to a map (ADR 0008).

import { CELL } from "./binarize.js";
import { KIND } from "../grid/tiles.js";

const COLORS = Object.freeze({
  airMatch: [0, 0, 0],
  solidMatch: [70, 70, 70],
  lost: [229, 57, 53],
  added: [66, 133, 244],
  cropped: [60, 40, 90],
});

/** Compares a cell grid (the binarized drawing) with a tile grid drawn at `tilePx` pixels per tile. */
export function compareToSource(cells, tiles, tilePx) {
  const { width, height } = cells;
  const rgba = new Uint8Array(width * height * 4);
  let mismatched = 0;
  let compared = 0;
  let cropped = 0;
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (let y = 0; y < height; y += 1) {
    const row = Math.floor(y / tilePx);
    for (let x = 0; x < width; x += 1) {
      const col = Math.floor(x / tilePx);
      const i = y * width + x;
      let color;
      if (row >= tiles.rows || col >= tiles.cols) {
        cropped += 1;
        color = COLORS.cropped;
      } else {
        compared += 1;
        const sourceSolid = cells.cells[i] === CELL.SOLID;
        // a ramp is rock with a slope: it keeps the drawing's solid share, so it is solid here
        const kind = tiles.kinds[row][col];
        const tileSolid = kind === KIND.SOLID || kind === KIND.RAMP_RIGHT || kind === KIND.RAMP_LEFT;
        if (sourceSolid === tileSolid) {
          color = sourceSolid ? COLORS.solidMatch : COLORS.airMatch;
        } else {
          mismatched += 1;
          color = sourceSolid ? COLORS.lost : COLORS.added;
          left = Math.min(left, x);
          top = Math.min(top, y);
          right = Math.max(right, x);
          bottom = Math.max(bottom, y);
        }
      }
      rgba.set([color[0], color[1], color[2], 255], i * 4);
    }
  }
  const fidelity = compared === 0 ? 0 : 1 - mismatched / compared;
  return {
    width,
    height,
    compared,
    mismatched,
    cropped,
    fidelity: Math.round(fidelity * 10000) / 10000,
    box: mismatched === 0 ? null : { left, top, right, bottom },
    diff: { width, height, rgba },
  };
}

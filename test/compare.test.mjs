import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { compareToSource, decodePng, encodePng, fromRows, rowsToImage, toCells, toTiles } from "../src/index.js";

function cellsOf(rows, tile) {
  return toCells(decodePng(encodePng(rowsToImage(fromRows(rows), tile))));
}

describe("compareToSource()", () => {
  test("tiles drawn back from the rows keep 100% of the drawing", () => {
    const rows = ["....", ".##.", "####"];
    const cells = cellsOf(rows, 4);
    const result = compareToSource(cells, fromRows(rows), 4);
    assert.equal(result.fidelity, 1);
    assert.equal(result.mismatched, 0);
    assert.equal(result.box, null);
  });

  test("a tile the rows lost is counted, boxed and painted", () => {
    const cells = cellsOf(["....", ".##.", "####"], 4);
    const result = compareToSource(cells, fromRows(["....", "..#.", "####"]), 4);
    assert.equal(result.mismatched, 16);
    assert.equal(result.compared, 192);
    assert.equal(result.fidelity, Math.round((1 - 16 / 192) * 10000) / 10000);
    assert.deepEqual(result.box, { left: 4, top: 4, right: 7, bottom: 7 });
    assert.deepEqual([...result.diff.rgba.subarray((5 * 16 + 5) * 4, (5 * 16 + 5) * 4 + 3)], [229, 57, 53]);
  });

  test("the remainder of an image that is not a multiple of the tile is cropped, not mismatched", () => {
    const cells = { width: 9, height: 4, cells: new Uint8Array(36) };
    const tiles = toTiles(cells, { tile: 4 });
    const result = compareToSource(cells, tiles, 4);
    assert.equal(result.cropped, 4);
    assert.equal(result.compared, 32);
    assert.equal(result.fidelity, 1);
  });
});

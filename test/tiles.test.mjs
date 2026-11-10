import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { cloneTiles, fromRows, toRows } from "../src/index.js";
import { isBlocked, isPassable, markAt, setMark } from "../src/grid/tiles.js";

describe("fromRows() and toRows()", () => {
  test("keep Zerun's entity and hazard characters as marks and give them back", () => {
    const rows = ["..c.P.W..t", "=====..B.>", "##########"];
    const tiles = fromRows(rows);
    assert.deepEqual(toRows(tiles), rows);
    assert.equal(markAt(tiles, 2, 0), "c");
    assert.equal(markAt(tiles, 6, 0), "W");
    assert.equal(tiles.kinds[1][9], "solid");
  });

  test("a barrier and a box block the runner; a coin or a torch does not", () => {
    const tiles = fromRows(["cWBt"]);
    assert.equal(isBlocked(tiles, 0, 0), false);
    assert.equal(isBlocked(tiles, 1, 0), true);
    assert.equal(isBlocked(tiles, 2, 0), true);
    assert.equal(isBlocked(tiles, 3, 0), false);
    assert.equal(isPassable(tiles, 1, 0), false);
    assert.equal(isPassable(tiles, 0, 0), true);
  });

  test("a clone takes its own marks", () => {
    const tiles = fromRows(["....", "####"]);
    const copy = cloneTiles(tiles);
    setMark(copy, 1, 0, "W");
    assert.equal(markAt(tiles, 1, 0), null);
    assert.equal(markAt(copy, 1, 0), "W");
  });
});

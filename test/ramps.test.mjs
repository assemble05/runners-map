import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { fromRows, toRows } from "../src/grid/tiles.js";
import { applyRamps, findRamps } from "../src/grid/ramps.js";

// a staircase of three 1-tile steps rising to the right under a high ceiling, then a flat floor
const STAIRS = [
  "..........",
  "..........",
  "..........",
  "..........",
  "..........",
  ".......###",
  "......####",
  ".....#####",
  "##########",
];
// one step on a flat floor under a high ceiling: a hop, not a ramp
const HOP = ["..........", "..........", "..........", "..........", "..........", ".....#####", "##########"];
// one step under a 3-tile ceiling: no hop can make it, so it is a ramp
const LOW = ["##########", "..........", "..........", ".....#####", "##########"];

describe("findRamps()", () => {
  test("the risers of a staircase become ramps rising to the right", () => {
    const ramps = findRamps(fromRows(STAIRS));
    assert.deepEqual(ramps.map(({ col, row, dir }) => [col, row, dir]), [[7, 5, 1], [6, 6, 1], [5, 7, 1]]);
  });

  test("the mirrored staircase rises to the left", () => {
    const mirrored = STAIRS.map((line) => [...line].reverse().join(""));
    const ramps = findRamps(fromRows(mirrored));
    assert.deepEqual(ramps.map(({ dir }) => dir), [-1, -1, -1]);
  });

  test("every 1-tile riser is a ramp, under a high ceiling or a low one: the ceiling decides the jumps, not the ramps", () => {
    assert.deepEqual(findRamps(fromRows(HOP)).map(({ col, row, dir }) => [col, row, dir]), [[5, 5, 1]]);
    assert.deepEqual(findRamps(fromRows(LOW)).map(({ col, row, dir }) => [col, row, dir]), [[5, 3, 1]]);
  });
});

describe("applyRamps()", () => {
  test("writes '/' and '\\' into the rows and leaves the air as it was", () => {
    const { tiles, ramps } = applyRamps(fromRows(STAIRS));
    const rows = toRows(tiles);
    assert.equal(ramps.length, 3);
    assert.equal(rows[5], "......./##");
    assert.equal(rows[6], "....../###");
    assert.equal(rows[7], "...../####");
    assert.equal(rows.join("").split(".").length, STAIRS.join("").split(".").length, "the count of air cells is unchanged");
    const mirrored = toRows(applyRamps(fromRows(STAIRS.map((line) => [...line].reverse().join("")))).tiles);
    assert.equal(mirrored[5], "##\\.......");
    assert.equal(toRows(fromRows(rows)).join("\n"), rows.join("\n"), "the rows round-trip through fromRows");
  });
});

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { findOpenings, fromRows, listVariants, toRows } from "../src/index.js";
import { fixtureRows } from "./helpers.mjs";

// Two corridors enter on the left and two leave on the right, all joined in the middle.
const CROSSROADS = [
  "##############################",
  "..............................",
  "..............................",
  "..............................",
  "#########..........###########",
  "#########..........###########",
  "#########..........###########",
  "..............................",
  "..............................",
  "..............................",
  "##############################",
];

describe("findOpenings()", () => {
  test("a closed drawing is a circuit", () => {
    const openings = findOpenings(fromRows(fixtureRows("two-levels")));
    assert.equal(openings.topology, "circuit");
    assert.deepEqual([openings.left.length, openings.right.length], [0, 0]);
  });

  test("corridors that reach both borders make a stretch with its openings and floors", () => {
    const openings = findOpenings(fromRows(CROSSROADS));
    assert.equal(openings.topology, "stretch");
    assert.deepEqual(openings.left.map((opening) => [opening.top, opening.bottom, opening.floorRow]), [[1, 3, 4], [7, 9, 10]]);
    assert.deepEqual(openings.right.map((opening) => opening.floorRow), [4, 10]);
  });
});

describe("listVariants()", () => {
  test("a circuit is one variant with no entry or exit", () => {
    const variants = listVariants(fromRows(fixtureRows("two-levels")), findOpenings(fromRows(fixtureRows("two-levels"))), "piece");
    assert.equal(variants.length, 1);
    assert.deepEqual([variants[0].name, variants[0].entry, variants[0].exit], ["piece", null, null]);
  });

  test("a stretch with two entries and two exits becomes four variants, each with the other openings closed", () => {
    const tiles = fromRows(CROSSROADS);
    const variants = listVariants(tiles, findOpenings(tiles), "cross");
    assert.deepEqual(variants.map((variant) => variant.name), ["cross-e4-x4", "cross-e4-x10", "cross-e10-x4", "cross-e10-x10"]);
    const second = toRows(variants[1].tiles);
    assert.equal(second[1][0], ".");
    assert.equal(second[7][0], "#");
    assert.equal(second[1][29], "#");
    assert.equal(second[7][29], ".");
    assert.equal(variants[1].closed.length, 2);
    assert.deepEqual(toRows(tiles), CROSSROADS);
  });
});

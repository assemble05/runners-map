import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { analyzeRows } from "../src/index.js";
import { fromRows } from "../src/grid/tiles.js";
import { runHeightOf } from "../src/validate/run.js";

// A passage: a floor, `height` tiles of air above it (4 wide, walled), and a closed top.
const passage = (height) => ["#".repeat(6), ...Array.from({ length: height }, () => "#....#"), "#".repeat(6)];

describe("runHeightOf()", () => {
  test("a floor with 16 tiles of air above it reaches the running height", () => {
    const result = runHeightOf(fromRows(passage(16)), 16);
    assert.equal(result.floors, 4);
    assert.equal(result.low, 0);
    assert.equal(result.lowest, 16);
  });

  test("a floor with 15 tiles above it falls short of 16", () => {
    const result = runHeightOf(fromRows(passage(15)), 16);
    assert.equal(result.low, 4);
    assert.equal(result.share, 1);
    assert.equal(result.highest, 15);
  });

  test("a platform above a floor is passed through, so it is not a ceiling", () => {
    // the floor at the bottom has one air tile and one platform tile above it, then the rock
    const result = runHeightOf(fromRows(["#", "=", ".", "#"]), 3);
    assert.equal(result.floors, 1);
    assert.equal(result.highest, 2);
    assert.equal(result.low, 1);
  });
});

describe("the zerun-laps profile", () => {
  test("a passage with less air than the running height is a RUN_HEIGHT finding", () => {
    const { validation } = analyzeRows(passage(15), { profile: "zerun-laps", rules: { worldRows: null } });
    assert.ok(validation.errors.some((error) => error.code === "RUN_HEIGHT"));
    assert.equal(validation.report.run.minTiles, 16);
  });

  test("a passage with the running height has no RUN_HEIGHT finding", () => {
    const { validation } = analyzeRows(passage(16), { profile: "zerun-laps", rules: { worldRows: null } });
    assert.equal(validation.errors.some((error) => error.code === "RUN_HEIGHT"), false);
  });
});

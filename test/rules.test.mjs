import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { analyzeRows } from "../src/index.js";
import { codes, fixtureRows, twoLevelMap } from "./helpers.mjs";

describe("validate()", () => {
  test("accepts the two-level map with one branch per level", () => {
    const result = analyzeRows(fixtureRows("two-levels"));
    assert.equal(result.ok, true, JSON.stringify(result.validation.errors));
    assert.deepEqual(result.validation.warnings, []);
    const levels = result.validation.report.levels;
    assert.deepEqual(levels.map((level) => level.name), ["lower", "upper"]);
    assert.deepEqual(levels.map((level) => level.branches.length), [1, 1]);
    assert.deepEqual(levels.map((level) => level.branches[0].length), [11, 11]);
    assert.deepEqual(result.validation.report.crossLevel.middle, []);
  });

  test("a pocket entered and left at one spot is a dead end and a bridge", () => {
    const result = analyzeRows(fixtureRows("dead-end"));
    assert.deepEqual(codes(result), ["BRANCH_DEAD_END", "BRIDGE", "DEAD_END"]);
  });

  test("a hole in the slab is an extra connection between the levels", () => {
    const result = analyzeRows(fixtureRows("leak"));
    assert.deepEqual(codes(result), ["LEAK"]);
  });

  test("a branch over 40% of the level is too long", () => {
    const result = analyzeRows(fixtureRows("branch-long"));
    assert.deepEqual(codes(result), ["BRANCH_LONG"]);
    assert.match(result.validation.errors[0].message, /89\.5%/);
  });

  test("a branch under 5% of the level is too short", () => {
    const result = analyzeRows(twoLevelMap(80, { lowerBranch: [40, 40], upperBranch: [30, 44] }));
    assert.deepEqual(codes(result), ["BRANCH_SHORT"]);
    assert.match(result.validation.errors[0].message, /3 of 78 tiles/);
  });

  test("a level without a branch is rejected", () => {
    const result = analyzeRows(fixtureRows("no-branch"));
    assert.deepEqual(codes(result), ["NO_BRANCH"]);
    assert.equal(result.validation.errors.length, 2);
  });

  test("a closed shaft leaves an extremity without a climbable wall", () => {
    const result = analyzeRows(fixtureRows("no-right-wall"));
    assert.deepEqual(codes(result), ["BRIDGE", "NO_WALL"]);
    assert.match(result.validation.errors.find((finding) => finding.code === "NO_WALL").message, /right extremity/);
  });

  test("branches in the same third of a level are a warning, not an error", () => {
    const rows = twoLevelMap(80, { lowerBranch: [3, 8], upperBranch: [20, 28] });
    rows[12] = `#${".".repeat(2)}${"#".repeat(6)}${".".repeat(9)}${"#".repeat(7)}${".".repeat(78 - 24)}#`;
    const result = analyzeRows(rows);
    assert.equal(result.ok, true, JSON.stringify(result.validation.errors));
    assert.deepEqual(result.validation.warnings.map((warning) => warning.code), ["BRANCHES_CLUSTERED"]);
  });

  test("a map without a slab reports the layout instead of crashing", () => {
    const rows = ["##########", "#........#", "#........#", "##########"];
    const result = analyzeRows(rows);
    assert.equal(result.ok, false);
    assert.deepEqual(codes(result), ["LAYOUT"]);
  });
});

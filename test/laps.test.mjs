import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { analyzeRows } from "../src/index.js";
import { fromRows } from "../src/grid/tiles.js";
import { lapsOf } from "../src/validate/laps.js";

// One-tile corridors: a loop, a chord across it, two chords in a row, a dead-end branch, and a split wider than the screen.
const RING = [
  "#########",
  "#.......#",
  "#.#####.#",
  "#.#####.#",
  "#.......#",
  "#########",
];
const CHORD = [
  "###########",
  "#.........#",
  "#.###.###.#",
  "#.........#",
  "###########",
];
const LADDER = [
  "#############",
  "#...........#",
  "#.##.###.##.#",
  "#...........#",
  "#############",
];
const STUB = [
  "####.####",
  "####.####",
  "#.......#",
  "#.#####.#",
  "#.#####.#",
  "#.......#",
  "#########",
];
const WIDE = [
  "##################################",
  "#" + ".".repeat(32) + "#",
  "#." + "#".repeat(28) + ".#.#",
  "#" + ".".repeat(32) + "#",
  "##################################",
];

const SCREEN = { cols: 26, rows: 15 };
const laps = (rows) => lapsOf(fromRows(rows), { routeLimit: 1000, screen: SCREEN });
// headroom 1: a corridor one tile high still has floors, so the validator reaches the lap rules
const judge = (rows, maxRoutes, start = null) =>
  analyzeRows(rows, {
    profile: "zerun-laps",
    physics: { headroom: { stand: 1, slide: 1 } },
    rules: { worldRows: null, laps: { maxRoutes, screenCols: SCREEN.cols, screenRows: SCREEN.rows, start } },
  }).validation;
const codes = (validation) => validation.errors.map((error) => error.code);

describe("lapsOf()", () => {
  test("a plain loop is one way round and has no split", () => {
    const result = laps(RING);
    assert.equal(result.routes, 1);
    assert.equal(result.splits.length, 0);
    assert.equal(result.exact, true);
  });

  test("a chord across a loop makes three ways round, and its two pockets are splits that fit", () => {
    const result = laps(CHORD);
    assert.equal(result.routes, 3);
    assert.equal(result.splits.length, 2);
    assert.ok(result.splits.every((split) => split.fits));
  });

  test("two chords in a row make six simple cycles: four ways round the big loop and two small loops", () => {
    assert.equal(laps(LADDER).routes, 6);
  });

  test("a dead-end branch is pruned and is not a way round", () => {
    const result = laps(STUB);
    assert.equal(result.routes, 1);
    assert.ok(result.stubs >= 1);
  });

  test("a split wider than the screen does not fit", () => {
    const result = laps(WIDE);
    assert.equal(result.routes, 3);
    assert.deepEqual(result.splits.map((split) => split.fits).sort(), [false, true]);
  });
});

describe("lapsOf() from the spawn point", () => {
  const through = (rows, col, row) => lapsOf(fromRows(rows), { routeLimit: 1000, screen: SCREEN, start: { col, row } });

  test("the laps through a point of the ladder's middle corridor are four", () => {
    assert.equal(through(LADDER, 6, 1).routes, 4);
  });

  test("the laps through a point on the left side of the ladder are three", () => {
    assert.equal(through(LADDER, 1, 2).routes, 3);
  });

  test("the laps through a point of a chord are two", () => {
    assert.equal(through(CHORD, 5, 2).routes, 2);
  });

  test("a spawn on a dead-end branch is off the track and has no laps", () => {
    const result = through(STUB, 4, 0);
    assert.equal(result.start.offTrack, true);
    assert.equal(result.routes, 0);
  });
});

describe("the zerun-laps profile", () => {
  test("more ways round than maxRoutes is a ROUTES finding", () => {
    assert.ok(!codes(judge(CHORD, 4, { col: 1, row: 2 })).includes("ROUTES"));
    assert.ok(codes(judge(CHORD, 1, { col: 1, row: 2 })).includes("ROUTES"));
  });

  test("a split wider than the screen is a SCREEN finding", () => {
    assert.ok(codes(judge(WIDE, 4)).includes("SCREEN"));
    assert.ok(!codes(judge(CHORD, 4)).includes("SCREEN"));
  });

  test("a spawn off the track is a START finding", () => {
    assert.ok(codes(judge(STUB, 4, { col: 4, row: 0 })).includes("START"));
  });

  test("lanes are not judged: a plain loop has no SINGLE_LANE here", () => {
    assert.ok(!codes(judge(RING, 4)).includes("SINGLE_LANE"));
  });

  test("the other circuit profiles keep their own rules", () => {
    const result = analyzeRows(RING, { profile: "zerun-circuit", physics: { headroom: { stand: 1, slide: 1 } }, rules: { worldRows: null } });
    assert.equal(result.validation.report.laps, undefined);
  });
});

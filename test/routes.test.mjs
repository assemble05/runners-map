import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { fromRows } from "../src/grid/tiles.js";
import { lapsOf } from "../src/validate/laps.js";
import { HEADINGS, routesOf } from "../src/validate/routes.js";

const RING = ["#########", "#.......#", "#.#####.#", "#.#####.#", "#.......#", "#########"];
const CHORD = ["###########", "#.........#", "#.###.###.#", "#.........#", "###########"];
// a ring three tiles wide with a chord three tiles wide: the Voronoi corridor and the gates have a width to them
const WIDE = [
  "#######################",
  "#.....................#",
  "#.....................#",
  "#.....................#",
  "#...######...######...#",
  "#...######...######...#",
  "#...######...######...#",
  "#...######...######...#",
  "#...######...######...#",
  "#.....................#",
  "#.....................#",
  "#.....................#",
  "#######################",
];
const airCount = (rows) => rows.join("").split("").filter((ch) => ch === ".").length;
const runCells = (runs) => runs.reduce((n, [, c0, c1]) => n + (c1 - c0 + 1), 0);
const inRuns = (runs, col, row) => runs.some(([r, c0, c1]) => r === row && col >= c0 && col <= c1);
const adjacent = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) === 1;

describe("routesOf()", () => {
  test("a plain ring is one route: a closed cycle of adjacent cells, valid headings, no gate, the whole air as corridor", () => {
    const result = routesOf(fromRows(RING), { col: 1, row: 2 });
    assert.equal(result.routes.length, 1);
    const [route] = result.routes;
    assert.equal(route.id, 0);
    for (let i = 0; i < route.cells.length; i += 1) {
      assert.ok(adjacent(route.cells[i], route.cells[(i + 1) % route.cells.length]), `cells ${i} and ${i + 1} are not adjacent`);
      assert.ok(route.cells[i][2] >= 0 && route.cells[i][2] < HEADINGS.length);
    }
    assert.deepEqual(route.gates, []);
    assert.equal(runCells(route.corridor), airCount(RING));
    assert.equal(route.sealed, true);
    assert.ok(result.lapLine.some(([c, r]) => c === result.start[0] && r === result.start[1]));
  });

  test("a chord makes two routes through the left side, each sealed by its gates, as many as lapsOf counts", () => {
    const tiles = fromRows(CHORD);
    const result = routesOf(tiles, { col: 1, row: 2 });
    assert.equal(result.routes.length, 2);
    assert.equal(result.routes.length, lapsOf(tiles, { start: { col: 1, row: 2 } }).routes);
    assert.ok(result.routes[0].length <= result.routes[1].length);
    for (const route of result.routes) {
      assert.ok(route.gates.length > 0, "a route with a split has gates");
      assert.equal(route.sealed, true);
      assert.equal(route.cells[0][2], result.lapHeading, "every route leaves the start in the lap heading");
    }
  });

  test("in a wide ring the short route keeps the chord and gates off the far side; the long route the other way round", () => {
    const result = routesOf(fromRows(WIDE), { col: 2, row: 6 });
    assert.equal(result.routes.length, 2);
    const [short, long] = result.routes;
    assert.ok(inRuns(short.corridor, 11, 6), "the chord is in the short route's corridor");
    assert.ok(!inRuns(short.corridor, 20, 6), "the far side is not");
    assert.ok(inRuns(long.corridor, 20, 6));
    assert.ok(!inRuns(long.corridor, 11, 6));
    assert.ok(short.gates.length >= 3, `the gate across a 3-wide band has 3 cells or more, got ${short.gates.length}`);
    assert.equal(short.sealed, true);
    assert.equal(long.sealed, true);
    // the start sits in a vertical band, so the lap heading is up and the lap line runs across the band
    assert.equal(HEADINGS[result.lapHeading], "up");
    assert.equal(result.lapLine.length, 3);
    assert.ok(result.lapLine.every(([, r]) => r === 6));
  });

  test("a spawn with no air near it has no routes", () => {
    const result = routesOf(fromRows(["###", "###", "###"]), { col: 1, row: 1 });
    assert.deepEqual(result.routes, []);
    assert.equal(result.start, null);
  });
});

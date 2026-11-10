import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { analyzeTiles, fromRows } from "../src/index.js";
import { WORLD, ZERUN_LAPS_RULES } from "../src/config.js";
import { schematicErrors, schematicRows } from "../src/schematic/rects.js";
import { applyRamps } from "../src/grid/ramps.js";

const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/schematics/${name}.json`, import.meta.url), "utf8"));
const judge = (schematic, minTiles = ZERUN_LAPS_RULES.runHeight.minTiles) => {
  const rows = schematicRows(schematic);
  const runHeight = { ...ZERUN_LAPS_RULES.runHeight, minTiles, exempt: rows.exempt };
  return analyzeTiles(applyRamps(fromRows(rows.rows)).tiles, { profile: "zerun-laps", rules: { runHeight } }).validation;
};
const codes = (validation) => validation.errors.map((error) => error.code);

describe("schematicRows()", () => {
  test("the air is the union of the rectangles, the rock is everything else, and the world is WORLD.rows tall", () => {
    const { rows, width } = schematicRows({ rects: [{ kind: "run", col: 2, row: 3, cols: 3, rows: 2 }] });
    assert.equal(rows.length, WORLD.rows);
    assert.equal(width, 6);
    assert.equal(rows[2], "######");
    assert.equal(rows[3], "##...#");
    assert.equal(rows[WORLD.rows - 1], "######");
  });

  test("the floors under a slide tunnel are exempt from the running height; the floors of a run room are not", () => {
    const { exempt } = schematicRows({
      rects: [
        { kind: "run", col: 1, row: 10, cols: 6, rows: 16 },
        { kind: "slide", col: 10, row: 30, cols: 11, rows: 3 },
      ],
    });
    assert.ok(exempt.has("10,33"));
    assert.ok(!exempt.has("2,26"));
  });

  test("the floor of a climb shaft is exempt too: a shaft is climbed, not run along", () => {
    const { exempt } = schematicRows({
      rects: [
        { kind: "run", col: 1, row: 10, cols: 6, rows: 16 },
        { kind: "climb", col: 10, row: 10, cols: 8, rows: 30 },
      ],
    });
    assert.ok(exempt.has("10,40"), "the climb shaft's own floor");
    assert.ok(!exempt.has("2,26"), "the run room's floor is not exempt");
  });
});

describe("schematicErrors()", () => {
  test("a slide tunnel shorter than the slide is SLIDE_LOW", () => {
    assert.deepEqual(schematicErrors({ rects: [{ kind: "slide", col: 2, row: 3, cols: 4, rows: 1 }] }).map((error) => error.code), ["SLIDE_LOW"]);
  });

  test("a climb shaft with no room for a step is CLIMB_LOW", () => {
    assert.deepEqual(schematicErrors({ rects: [{ kind: "climb", col: 2, row: 3, cols: 4, rows: 3 }] }).map((error) => error.code), ["CLIMB_LOW"]);
    assert.deepEqual(schematicErrors({ rects: [{ kind: "climb", col: 2, row: 3, cols: 4, rows: 4 }] }).map((error) => error.code), []);
  });

  test("an unknown kind, a rectangle that reaches the rock row, or a missing list is SCHEMATIC", () => {
    assert.deepEqual(schematicErrors({ rects: [{ kind: "wall", col: 2, row: 3, cols: 4, rows: 2 }] }).map((error) => error.code), ["SCHEMATIC"]);
    assert.deepEqual(schematicErrors({ rects: [{ kind: "run", col: 2, row: 50, cols: 4, rows: 12 }] }).map((error) => error.code), ["SCHEMATIC"]);
    assert.deepEqual(schematicErrors({}).map((error) => error.code), ["SCHEMATIC"]);
  });
});

describe("the schematic in the zerun-laps profile", () => {
  test("a ring whose shafts have no floor is not played: its top band is UNREACHABLE, named by its row", () => {
    // the shafts are air with no steps: the body cannot climb 16 tiles, so the middle bump of the top band is cut off
    const validation = judge(fixture("anel-simples"));
    assert.ok(codes(validation).includes("UNREACHABLE"), JSON.stringify(codes(validation)));
    assert.match(validation.errors.find((e) => e.code === "UNREACHABLE").message, /row 17/);
  });

  test("a ring with a chord is cut off the same way, and the finding names it", () => {
    const validation = judge(fixture("anel-com-corda"));
    assert.ok(codes(validation).includes("UNREACHABLE"), JSON.stringify(codes(validation)));
  });

  test("a staircase of 1-tile steps climbs: its risers are ramps and nothing is UNREACHABLE", () => {
    // a flat floor, then ten treads, each 3 wide and one tile higher than the last; the risers between them are ramps
    const rects = [{ kind: "run", col: 1, row: 20, cols: 21, rows: 15 }];
    for (let k = 0; k < 10; k += 1) rects.push({ kind: "run", col: 22 + 3 * k, row: 31 - k, cols: 3, rows: 3 });
    rects.push({ kind: "run", col: 52, row: 21, cols: 10, rows: 3 });
    const validation = judge({ rects });
    assert.equal(codes(validation).includes("UNREACHABLE"), false, JSON.stringify(codes(validation)));
    const rows = schematicRows({ rects }).rows;
    assert.ok(applyRamps(fromRows(rows)).ramps.length >= 10, "the ten risers are ramps");
  });

  test("a lap track with a climb shaft of ledges is played: no finding at all", () => {
    // the shape that satisfies both rules at once: the runner runs the two long corridors, and climbs the shaft between
    // them. Without the climb kind this is impossible: a climb must reach the next floor within the 10 tiles of the double
    // jump, while the running height asks for 16 tiles of air above a floor that is run along (ADR 0009).
    const ceiling = 2, topFloor = 19, bottomFloor = 49, islandW = 20, shaftW = 8, climbW = 10, ledgeW = 4, step = 9;
    const island0 = 2 + shaftW, island1 = island0 + islandW - 1, climb0 = island1 + 1, climb1 = climb0 + climbW - 1;
    const rects = [
      { kind: "run", col: 2, row: ceiling, cols: shaftW, rows: bottomFloor - ceiling },
      { kind: "run", col: island0, row: ceiling, cols: islandW, rows: topFloor - ceiling },
      { kind: "run", col: island0, row: topFloor + 13, cols: islandW, rows: bottomFloor - (topFloor + 13) },
    ];
    const ledges = [];
    for (let row = bottomFloor - step; row > topFloor + 1; row -= step) {
      const left = ledges.length % 2 === 0;
      ledges.push({ row, left, col0: left ? climb0 : climb1 - ledgeW + 1 });
    }
    // the shaft's air, as the pieces between the ledges of each band: every piece is tall enough to climb
    const band = (col, cols, rows) => {
      let start = ceiling;
      for (const row of [...rows].sort((a, b) => a - b)) {
        if (row > start) rects.push({ kind: "climb", col, row: start, cols, rows: row - start });
        start = row + 1;
      }
      if (bottomFloor > start) rects.push({ kind: "climb", col, row: start, cols, rows: bottomFloor - start });
    };
    band(climb0, ledgeW, ledges.filter((l) => l.left).map((l) => l.row));
    band(climb1 - ledgeW + 1, ledgeW, ledges.filter((l) => !l.left).map((l) => l.row));
    band(climb0 + ledgeW, climbW - 2 * ledgeW, []);

    assert.deepEqual(schematicErrors({ rects }), []);
    const validation = judge({ rects });
    assert.deepEqual(codes(validation), [], JSON.stringify(validation.errors.map((error) => error.message)));
    assert.equal(validation.report.run.low, 0);
    assert.equal(ledges.length, 3, "three ledges climb from the bottom run to the top run");
  });

  test("a run room one tile under the running height is a RUN_HEIGHT finding", () => {
    const schematic = fixture("anel-simples");
    schematic.rects[0].rows = 15;
    const validation = judge(schematic);
    assert.ok(codes(validation).includes("RUN_HEIGHT"));
    assert.ok(validation.report.run.low > 0);
  });
});

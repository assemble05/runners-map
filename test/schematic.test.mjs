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
});

describe("schematicErrors()", () => {
  test("a slide tunnel shorter than the slide is SLIDE_LOW", () => {
    assert.deepEqual(schematicErrors({ rects: [{ kind: "slide", col: 2, row: 3, cols: 4, rows: 1 }] }).map((error) => error.code), ["SLIDE_LOW"]);
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

  test("a run room one tile under the running height is a RUN_HEIGHT finding", () => {
    const schematic = fixture("anel-simples");
    schematic.rects[0].rows = 15;
    const validation = judge(schematic);
    assert.ok(codes(validation).includes("RUN_HEIGHT"));
    assert.ok(validation.report.run.low > 0);
  });
});

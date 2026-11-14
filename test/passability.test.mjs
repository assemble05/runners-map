// What the body can pass (src/graph/surfaces.js riseClears, src/graph/carve.js, src/validate/circuit.js UNREACHABLE). The
// known answers are the engine's own runner (Zerun, 09/11, a sweep of run-up and jump timing): a 1-tile step climbs with 4
// air cells above its takeoff and not 3; a 2-tile ledge climbs with 5 and not 4. The rule is ceil(body + rise), body 2.5.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { fromRows, toRows } from "../src/grid/tiles.js";
import { PHYSICS } from "../src/config.js";
import { buildGraph, riseClears } from "../src/graph/surfaces.js";
import { carveRises } from "../src/graph/carve.js";
import { analyzeRows } from "../src/index.js";

/**
 * A lower floor on the left, a higher one on the right, `air` air cells above the lower floor (the ceiling is over the
 * lower floor only, so the upper floor has room to stand). Rows are top to bottom; the floors are solid rows.
 */
function ledge({ air, stepH = 1 }) {
  const width = 14, height = 14, lowTop = 11, highTop = lowTop - stepH, stepCol = 6;
  const ceiling = lowTop - air - 1;
  const rows = [];
  for (let r = 0; r < height; r += 1) {
    let line = "";
    for (let c = 0; c < width; c += 1) {
      let solid = r >= lowTop + 1;
      if (c < stepCol && r === lowTop) solid = true;
      if (c >= stepCol && r >= highTop) solid = true;
      if (r === 0 || r === height - 1) solid = true;
      if (c < stepCol && r === ceiling) solid = true;
      line += solid ? "#" : ".";
    }
    rows.push(line);
  }
  return rows;
}

// the climbs of the lower floor (columns 0-5) onto the higher one (columns 6-13): a jump up from the lower standing row. A
// jump from the higher floor up into the air above the ceiling is a different move, and is not counted here.
const risingEdges = (rows) => buildGraph(fromRows(rows), PHYSICS).edges.filter((e) => e.from.col <= 5 && e.to.col >= 6 && e.from.row > e.to.row);

describe("the body's rise (engine-measured)", () => {
  test("a 1-tile step climbs with 4 air cells above the takeoff, and not with 3", () => {
    assert.equal(risingEdges(ledge({ air: 3 })).length, 0, "3 air: the body hits the ceiling");
    assert.ok(risingEdges(ledge({ air: 4 })).length > 0, "4 air: the body climbs");
  });

  test("a 2-tile ledge climbs with 5 air cells, and not with 4", () => {
    assert.equal(risingEdges(ledge({ air: 4, stepH: 2 })).length, 0, "4 air: the body hits the ceiling");
    assert.ok(risingEdges(ledge({ air: 5, stepH: 2 })).length > 0, "5 air: the body climbs");
  });

  test("riseClears is the rule itself: ceil(body + rise) cells, and a ramp under the landing is a walk", () => {
    const tiles = fromRows(ledge({ air: 3 }));
    const from = { col: 5, row: 9 }, to = { col: 6, row: 8 };
    assert.equal(riseClears(tiles, PHYSICS, from, to), false);
    assert.equal(riseClears(tiles, { ...PHYSICS, body: undefined }, from, to), true, "no body, no rule (circuit physics)");
    assert.equal(riseClears(tiles, PHYSICS, { col: 5, row: 9 }, { col: 5, row: 9 }), true, "a level move needs nothing");
  });
});

describe("carving: a declared opening, only where the body is blocked", () => {
  test("the rock a blocked rise needs is opened, every cell reported, and the rise then climbs", () => {
    const tiles = fromRows(ledge({ air: 3 }));
    const { tiles: opened, carved } = carveRises(tiles, PHYSICS);
    assert.ok(carved.length > 0, "something was opened");
    assert.ok(carved.every(({ row, col }) => tiles.kinds[row][col] === "solid" && opened.kinds[row][col] === "empty"), "only solid rock was opened");
    assert.ok(risingEdges(toRows(opened)).length > 0, "the step climbs after the opening");
  });

  test("a passable piece is not opened at all", () => {
    const { carved } = carveRises(fromRows(ledge({ air: 4 })), PHYSICS);
    assert.equal(carved.length, 0);
  });
});

describe("the zerun profile: a part the runner cannot reach is an error", () => {
  test("a ledge the body cannot climb is UNREACHABLE and names its row", () => {
    const { validation } = analyzeRows(ledge({ air: 4, stepH: 2 }), { profile: "zerun-laps", physics: { headroom: { stand: 3, slide: 2 } }, rules: { worldRows: null } });
    const codes = validation.errors.map((e) => e.code);
    assert.ok(codes.includes("UNREACHABLE"), JSON.stringify(codes));
    const message = validation.errors.find((e) => e.code === "UNREACHABLE").message;
    assert.match(message, /row 8 cols 6-13/, message);
  });

  test("the same ledge at 5 air cells has no UNREACHABLE finding", () => {
    const { validation } = analyzeRows(ledge({ air: 5, stepH: 2 }), { profile: "zerun-laps", physics: { headroom: { stand: 3, slide: 2 } }, rules: { worldRows: null } });
    assert.equal(validation.errors.some((e) => e.code === "UNREACHABLE"), false);
  });
});

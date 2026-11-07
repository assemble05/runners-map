import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { buildGraph, fromRows } from "../src/index.js";
import { EDGE } from "../src/graph/surfaces.js";
import { fixtureRows } from "./helpers.mjs";

describe("buildGraph()", () => {
  test("finds one surface per run of standable tiles", () => {
    const graph = buildGraph(fromRows(["......", "..##..", "......", "######"]));
    assert.deepEqual(
      graph.surfaces.map((surface) => [surface.row, surface.x0, surface.x1]),
      [
        [0, 2, 3],
        [2, 0, 5],
      ],
    );
  });

  test("a platform over a floor is two links: the left end and the right end", () => {
    const graph = buildGraph(fromRows(["........", "........", "...##...", "........", "########"]));
    const pair = graph.links.filter((link) => link.lo === 0 && link.hi === 1);
    assert.equal(pair.length, 2);
    assert.deepEqual(pair.map((link) => link.colAtHi).sort((a, b) => a - b), [2, 5]);
  });

  test("a jump straight up through a solid floor is blocked, through a thin platform it is not", () => {
    const solid = buildGraph(fromRows(["......", "..##..", "......", "######"]));
    const thin = buildGraph(fromRows(["......", "..==..", "......", "######"]));
    const vertical = (graph) => graph.edges.filter((edge) => edge.type === EDGE.JUMP && edge.side === 0);
    assert.equal(vertical(solid).length, 0);
    assert.ok(vertical(thin).length > 0);
  });

  test("the outer walls link the floor to the slab as wall climbs", () => {
    const graph = buildGraph(fromRows(fixtureRows("two-levels")));
    const walls = graph.edges.filter((edge) => edge.type === EDGE.WALL);
    assert.deepEqual(walls.map((edge) => edge.from.col).sort((a, b) => a - b), [1, 38]);
  });

  test("a wall shorter than minWallHeight is not climbable", () => {
    const graph = buildGraph(fromRows(["......", "......", "..#...", "######"]), { maxJumpUp: 6, maxJumpAcross: 8, minWallHeight: 2 });
    assert.equal(graph.edges.filter((edge) => edge.type === EDGE.WALL).length, 0);
  });
});

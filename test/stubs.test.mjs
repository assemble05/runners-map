import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { findStubs, fromRows, toRows, treatStubs } from "../src/index.js";
import { thin } from "../src/graph/stubs.js";

// A corridor three tiles tall that runs the width of the map, with a side corridor going up on the left
// that stops (a stub) and a loop on the right that comes back (not a stub).
const CORRIDORS = [
  "####################",
  "####...#############",
  "####...#############",
  "####...#############",
  "####...####.....####",
  "####...####.###.####",
  "####...####.###.####",
  "#...................",
  "#...................",
  "#...................",
  "####################",
];

describe("thin()", () => {
  test("reduces a thick bar to a one-tile line with two endpoints", () => {
    const mask = new Uint8Array(14 * 5);
    for (let y = 1; y <= 3; y += 1) for (let x = 1; x <= 10; x += 1) mask[y * 14 + x] = 1;
    const skeleton = thin(mask, 14, 5);
    const count = skeleton.reduce((sum, v) => sum + v, 0);
    assert.ok(count >= 6 && count <= 12, `skeleton has ${count} tiles`);
    let endpoints = 0;
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 14; x += 1) {
        if (skeleton[y * 14 + x] !== 1) continue;
        let neighbours = 0;
        for (const [dx, dy] of [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]]) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < 14 && ny < 5 && skeleton[ny * 14 + nx] === 1) neighbours += 1;
        }
        if (neighbours === 1) endpoints += 1;
      }
    }
    assert.equal(endpoints, 2);
  });
});

describe("findStubs()", () => {
  test("finds the corridor that stops and not the loop that comes back", () => {
    const stubs = findStubs(fromRows(CORRIDORS), { minDepth: 3 });
    assert.equal(stubs.length, 1);
    const [stub] = stubs;
    assert.equal(stub.direction, "up");
    assert.ok(stub.depth >= 3);
    assert.equal(stub.sealed, true);
    assert.equal(stub.width, 3);
    assert.equal(stub.mouth.row, 6);
  });

  test("a barrier closes the mouth and leaves the geometry; a fill turns the stub to rock", () => {
    const tiles = fromRows(CORRIDORS);
    const stubs = findStubs(tiles, { minDepth: 3 });
    const barred = treatStubs(tiles, stubs, "barrier");
    assert.equal(barred.tiles.kinds.flat().filter((kind) => kind === "solid").length, tiles.kinds.flat().filter((kind) => kind === "solid").length);
    assert.equal(toRows(barred.tiles)[6], "####WWW####.###.####");
    const filled = treatStubs(tiles, stubs, "fill");
    assert.equal(toRows(filled.tiles)[2], "####################");
    assert.equal(toRows(filled.tiles)[7], CORRIDORS[7]);
    assert.deepEqual(toRows(treatStubs(tiles, stubs, "keep").tiles), CORRIDORS);
  });

  test("a spur shorter than minDepth is a corner, not a stub", () => {
    const stubs = findStubs(fromRows(CORRIDORS), { minDepth: 20 });
    assert.equal(stubs.length, 0);
  });
});

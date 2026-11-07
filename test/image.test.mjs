import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { analyzeImage, decodePng, encodePng, toCells, toTiles } from "../src/index.js";
import { fixtureRows, here } from "./helpers.mjs";

describe("decodePng()", () => {
  test("reads back what encodePng wrote", () => {
    const rgba = Uint8Array.from([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 0, 0, 0, 0]);
    const image = decodePng(encodePng({ width: 2, height: 2, rgba }));
    assert.equal(image.width, 2);
    assert.equal(image.height, 2);
    assert.deepEqual([...image.rgba], [...rgba]);
  });

  test("refuses a file that is not a PNG", () => {
    assert.throws(() => decodePng(Uint8Array.from([1, 2, 3])), /bad signature/);
  });
});

describe("toTiles()", () => {
  test("a tile is solid when at least half of its pixels are", () => {
    const width = 4;
    const rgba = new Uint8Array(width * 2 * 4);
    for (let i = 0; i < 3; i += 1) rgba.set([255, 255, 255, 255], i * 4);
    const image = { width, height: 2, rgba };
    const half = toTiles(toCells(image), { tile: 2, coverage: 0.5 });
    assert.deepEqual(half.kinds, [["solid", "empty"]]);
    const strict = toTiles(toCells(image), { tile: 2, coverage: 1 });
    assert.deepEqual(strict.kinds, [["empty", "empty"]]);
  });

  test("a mid grey is a platform only when asked", () => {
    const rgba = Uint8Array.from([128, 128, 128, 255]);
    const image = { width: 1, height: 1, rgba };
    assert.deepEqual(toTiles(toCells(image), { tile: 1 }).kinds, [["solid"]]);
    assert.deepEqual(toTiles(toCells(image, { platformGray: true }), { tile: 1 }).kinds, [["platform"]]);
  });

  test("warns when the image is not a multiple of the tile", () => {
    const image = { width: 13, height: 12, rgba: new Uint8Array(13 * 12 * 4) };
    const tiles = toTiles(toCells(image), { tile: 12 });
    assert.equal(tiles.cols, 1);
    assert.match(tiles.warnings[0], /not a multiple of 12/);
  });
});

describe("analyzeImage()", () => {
  test("the PNG of the two-level map gives the same rows as its text", () => {
    const result = analyzeImage(readFileSync(join(here, "fixtures", "two-levels.png")));
    assert.equal(result.ok, true, JSON.stringify(result.validation.errors));
    assert.deepEqual(result.template.rows, fixtureRows("two-levels"));
  });
});

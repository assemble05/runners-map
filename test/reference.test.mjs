import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { analyzeImage, summarize } from "../src/index.js";
import { here } from "./helpers.mjs";

const bytes = readFileSync(join(here, "fixtures", "reference", "labyrinth.png"));

describe("analyzeImage() on a corridor drawing", () => {
  test("read as rock in white it is rejected: most columns have one lane", () => {
    const s = summarize(analyzeImage(bytes, { tile: 16, profile: "circuit" }));
    assert.equal(s.ok, false);
    assert.deepEqual(Object.keys(s.errors), ["SINGLE_LANE"]);
  });

  test("read with white as the open path it is a playable circuit at 16 px", () => {
    const result = analyzeImage(bytes, { tile: 16, profile: "circuit", whiteIsAir: true });
    const s = summarize(result);
    assert.equal(s.ok, true, JSON.stringify(result.validation.errors));
    assert.deepEqual(s.errors, {});
    assert.equal(s.cols, 128);
    assert.equal(s.rows, 48);
    assert.ok(s.lanes.two >= 0.9);
    assert.equal(s.networkShare, 1);
  });

  test("at 32 px the same drawing is still playable but warns FEW_LANES", () => {
    const s = summarize(analyzeImage(bytes, { tile: 32, profile: "circuit", whiteIsAir: true }));
    assert.equal(s.ok, true);
    assert.ok(s.warnings.FEW_LANES === 1);
  });
});


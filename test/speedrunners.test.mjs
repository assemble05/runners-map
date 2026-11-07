import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { analyzeImage, decodePng, encodePng, fromRows, rowsToImage, summarize, toCells, toTiles } from "../src/index.js";
import { here } from "./helpers.mjs";

const fixtures = join(here, "fixtures", "speedrunners");
const golden = join(here, "golden", "speedrunners");
const sets = readdirSync(fixtures).sort();

function maps(set) {
  return readdirSync(join(fixtures, set))
    .filter((name) => name.endsWith(".png"))
    .sort()
    .map((file) => ({ set, name: file.replace(/\.png$/, ""), bytes: readFileSync(join(fixtures, set, file)) }));
}

function goldenRows(set, name) {
  return readFileSync(join(golden, set, `${name}.rows.txt`), "utf8")
    .split(/\r?\n/)
    .filter((line) => line.length > 0);
}

function goldenFindings(set, name) {
  return JSON.parse(readFileSync(join(golden, set, `${name}.findings.json`), "utf8"));
}

describe("the SpeedRunners reference maps", () => {
  const results = new Map();
  for (const set of sets) {
    for (const map of maps(set)) {
      test(`${set}/${map.name} converts to the same rows and the same findings`, () => {
        const result = analyzeImage(map.bytes, { tile: 2, profile: "circuit" });
        results.set(`${set}/${map.name}`, result);
        assert.deepEqual(result.template.rows, goldenRows(set, map.name));
        assert.deepEqual(summarize(result), goldenFindings(set, map.name));
      });
      test(`${set}/${map.name} survives a round trip through the image`, () => {
        const rows = goldenRows(set, map.name);
        const image = decodePng(encodePng(rowsToImage(fromRows(rows), 2)));
        const back = toTiles(toCells(image), { tile: 2 });
        assert.deepEqual(back.kinds.map((line) => line.join("")).map(fold), rows);
      });
    }
  }

  test("every current map passes the circuit profile", () => {
    for (const map of maps("current")) {
      const result = results.get(`current/${map.name}`) ?? analyzeImage(map.bytes, { tile: 2, profile: "circuit" });
      assert.equal(result.ok, true, `${map.name}: ${JSON.stringify(result.validation.errors)}`);
    }
  });

  test("Boardwalk's world is its tunnels, not the open sky beside them", () => {
    const result = analyzeImage(readFileSync(join(fixtures, "current", "Boardwalk.png")), { tile: 2, profile: "circuit" });
    assert.ok(result.graph.surfaces.length > 300);
    assert.ok(result.validation.report.networkShare >= 0.9);
    assert.ok(result.graph.pockets > 0);
  });
});

function fold(line) {
  return line.replace(/solid/g, "#").replace(/platform/g, "=").replace(/empty/g, ".");
}

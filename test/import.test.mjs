import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { importImage, summarizeImport, toRows } from "../src/index.js";
import { here } from "./helpers.mjs";

const labyrinth = readFileSync(join(here, "fixtures", "drawings", "labyrinth.png"));

function goldenRows(name) {
  return readFileSync(join(here, "golden", "drawings", `${name}.rows.txt`), "utf8")
    .split(/\r?\n/)
    .filter((line) => line.length > 0);
}

describe("importImage() on the labyrinth drawing", () => {
  test("gives the same rows and the same account every time (golden)", () => {
    const imported = importImage(labyrinth, { name: "labyrinth", tile: 8, whiteIsAir: true });
    assert.deepEqual(toRows(imported.variants[0].result.tiles), goldenRows("labyrinth"));
    assert.deepEqual(summarizeImport(imported), JSON.parse(readFileSync(join(here, "golden", "drawings", "labyrinth.import.json"), "utf8")));
  });

  test("is a closed circuit: no opening on any side, one variant", () => {
    const imported = importImage(labyrinth, { name: "labyrinth", tile: 8, whiteIsAir: true });
    assert.equal(imported.topology, "circuit");
    assert.equal(imported.variants.length, 1);
    assert.equal(imported.variants[0].entry, null);
  });

  test("at 8 px per tile it is a sound circuit for SpeedRunners' reach, and too tall for Zerun's world", () => {
    const asTrack = importImage(labyrinth, { name: "labyrinth", tile: 8, whiteIsAir: true, profile: "circuit" });
    assert.equal(asTrack.ok, true, JSON.stringify(asTrack.variants[0].result.validation.errors));
    const forZerun = importImage(labyrinth, { name: "labyrinth", tile: 8, whiteIsAir: true });
    assert.deepEqual(forZerun.variants[0].result.validation.errors.map((finding) => finding.code), ["TOO_TALL"]);
    assert.equal(forZerun.variants[0].result.tiles.rows, 96);
  });

  test("at 16 px per tile it fits Zerun's world but the corridors crush the runner", () => {
    const imported = importImage(labyrinth, { name: "labyrinth", tile: 16, whiteIsAir: true });
    const codes = new Set([...imported.variants[0].result.validation.errors, ...imported.variants[0].result.validation.warnings].map((finding) => finding.code));
    assert.ok(codes.has("CRUSHED"), [...codes].join(","));
    assert.equal(imported.variants[0].result.tiles.rows, 48);
  });

  test("the fidelity is the same before and after a barrier treatment, and lower after a fill", () => {
    // carve: false, so what is measured is the dead-end treatment alone; opening the rock moves the fidelity too (ADR 0009)
    const barrier = importImage(labyrinth, { name: "labyrinth", tile: 8, whiteIsAir: true, carve: false });
    const fill = importImage(labyrinth, { name: "labyrinth", tile: 8, whiteIsAir: true, deadEnds: "fill", carve: false });
    assert.equal(barrier.variants[0].fidelity.fidelity, barrier.fidelity.fidelity);
    if (barrier.variants[0].stubs.some((stub) => stub.sealed)) assert.ok(fill.variants[0].fidelity.fidelity < fill.fidelity.fidelity);
  });

  test("the fidelity is reported against the binarized drawing and the diff has its size", () => {
    const imported = importImage(labyrinth, { name: "labyrinth", tile: 8, whiteIsAir: true });
    assert.ok(imported.fidelity.fidelity > 0.95 && imported.fidelity.fidelity < 1, String(imported.fidelity.fidelity));
    assert.deepEqual([imported.fidelity.diff.width, imported.fidelity.diff.height], [2048, 768]);
  });
});

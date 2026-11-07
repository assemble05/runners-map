import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { analyzeRows, toModule } from "../src/index.js";
import { fixtureRows, here } from "./helpers.mjs";

describe("toModule()", () => {
  test("writes the Zerun template shape with the analysis beside it", () => {
    const result = analyzeRows(fixtureRows("two-levels"), { name: "two-levels" });
    const analysis = { ...result.validation.report, ok: result.ok, errors: result.validation.errors, warnings: result.validation.warnings };
    const text = toModule(result.template, analysis, "two-levels.rows.txt");
    const golden = readFileSync(join(here, "golden", "two-levels.template.js"), "utf8");
    assert.equal(text.replace(/\r\n/g, "\n"), golden.replace(/\r\n/g, "\n"));
  });

  test("the entry and the exit are the floor of the lower level", () => {
    const result = analyzeRows(fixtureRows("two-levels"));
    assert.equal(result.template.entryRow, 15);
    assert.equal(result.template.exitRow, 15);
    assert.equal(result.template.rows[15], "#".repeat(40));
  });

  test("the generated module loads back as a template", async () => {
    const mod = await import("./golden/two-levels.template.js");
    assert.equal(mod.template.name, "two-levels");
    assert.equal(mod.template.rows.length, 16);
    assert.equal(mod.analysis.ok, true);
  });
});

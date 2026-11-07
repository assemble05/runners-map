// Loads a map from a PNG, a rows text file or a generated template module, and runs the analysis.

import { readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { analyzeImage, analyzeRows } from "../../src/index.js";

export async function loadAndAnalyze(file, options) {
  const path = resolve(file);
  const ext = extname(path).toLowerCase();
  if (ext === ".png") return analyzeImage(readFileSync(path), options);
  if (ext === ".txt") {
    const rows = readFileSync(path, "utf8").split(/\r?\n/).filter((line) => line.length > 0);
    return analyzeRows(rows, options);
  }
  if (ext === ".js" || ext === ".mjs") {
    const mod = await import(pathToFileURL(path).href);
    const template = mod.template ?? mod.default;
    if (!template?.rows) throw new Error(`${file}: no exported template with rows`);
    return analyzeRows(template.rows, { name: template.name, difficulty: template.difficulty, weight: template.weight, entryRow: template.entryRow, exitRow: template.exitRow, ...options });
  }
  throw new Error(`${file}: expected a .png, a .txt of rows or a template .js`);
}

export function printFindings(result) {
  const { validation } = result;
  for (const warning of validation.warnings) console.log(`warning ${warning.code}: ${warning.message}`);
  for (const error of validation.errors) console.log(`error ${error.code}: ${error.message}`);
  if (validation.report) {
    const levels = validation.report.levels.map((level) => `${level.name}: main route ${level.main.length} surface(s), ${level.branches.length} branch(es)`).join("; ");
    console.log(`${validation.ok ? "valid" : "invalid"}: ${validation.report.surfaces} surfaces, ${validation.report.edges} moves; ${levels}`);
  } else {
    console.log("invalid: the layout could not be read");
  }
}

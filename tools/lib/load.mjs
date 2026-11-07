// Loads a map from a PNG, a rows text file or a generated template module, and runs the analysis.

import { readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { analyzeImage, analyzeRows } from "../../src/index.js";

/** The analysis options every tool accepts: --profile, --tile, --split-row, --platform-gray. */
export function analysisOptions(options) {
  return {
    profile: options.profile,
    tile: options.tile,
    separatorRow: options.splitRow,
    platformGray: options.platformGray === true,
    whiteIsAir: options.whiteIsAir === true,
  };
}

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

function pct(ratio) {
  return `${Math.round(ratio * 1000) / 10}%`;
}

export function printFindings(result) {
  const { validation } = result;
  for (const warning of validation.warnings) console.log(`warning ${warning.code}: ${warning.message}`);
  for (const error of validation.errors) console.log(`error ${error.code}: ${error.message}`);
  const report = validation.report;
  const verdict = validation.ok ? "valid" : "invalid";
  if (!report) {
    console.log("invalid: the layout could not be read");
  } else if (report.levels) {
    const levels = report.levels.map((level) => `${level.name}: main route ${level.main.length} surface(s), ${level.branches.length} branch(es)`).join("; ");
    console.log(`${verdict} (two-levels): ${report.surfaces} surfaces, ${report.edges} moves; ${levels}`);
  } else {
    console.log(`${verdict} (circuit): ${report.surfaces} surfaces, ${report.edges} moves; main network ${pct(report.networkShare)}; columns with 2+ surfaces ${pct(report.lanes.two)}, 3+ ${pct(report.lanes.three)}; ${report.pockets} pocket(s)`);
  }
}

// node tools/validate.mjs <map.png|rows.txt|template.js> [--profile two-levels|circuit] [--tile 12] [--split-row N] [--platform-gray]
// Prints the findings. Exit code 1 when the map is invalid.

import { parseArgs } from "./lib/args.mjs";
import { analysisOptions, loadAndAnalyze, printFindings } from "./lib/load.mjs";

const { positionals, options } = parseArgs(process.argv.slice(2));
const [file] = positionals;
if (!file) {
  console.error("usage: node tools/validate.mjs <map.png|rows.txt|template.js> [--profile two-levels|circuit] [--tile 12] [--split-row N] [--platform-gray]");
  process.exit(2);
}
const result = await loadAndAnalyze(file, analysisOptions(options));
printFindings(result);
if (!result.ok) process.exit(1);

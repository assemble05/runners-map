// Regenerates the golden files of the SpeedRunners reference maps (`npm run golden:speedrunners`): for every
// PNG in test/fixtures/speedrunners/<set>/, the rows it converts to and a summary of its findings under the
// circuit profile. Run it after a deliberate change to the conversion or the rules, and review the diff.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeImage, summarize } from "../src/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = join(root, "test", "fixtures", "speedrunners");
const golden = join(root, "test", "golden", "speedrunners");
let count = 0;
for (const set of readdirSync(fixtures)) {
  mkdirSync(join(golden, set), { recursive: true });
  for (const file of readdirSync(join(fixtures, set)).filter((name) => name.endsWith(".png")).sort()) {
    const name = file.replace(/\.png$/, "");
    const result = analyzeImage(readFileSync(join(fixtures, set, file)), { tile: 2, profile: "circuit", name });
    writeFileSync(join(golden, set, `${name}.rows.txt`), `${result.template.rows.join("\n")}\n`);
    writeFileSync(join(golden, set, `${name}.findings.json`), `${JSON.stringify(summarize(result), null, 2)}\n`);
    count += 1;
  }
}
console.log(`wrote ${count} golden pairs under test/golden/speedrunners/`);

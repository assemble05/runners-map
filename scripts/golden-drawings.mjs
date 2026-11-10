// Regenerates the golden files of the drawings (`npm run golden:drawings`): for every PNG under
// test/fixtures/drawings/, the rows its first variant converts to and the account of the import, under the
// options in DRAWINGS. Run it after a deliberate change to the import pipeline, and review the diff.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { importImage, summarizeImport, toRows } from "../src/index.js";

const DRAWINGS = {
  labyrinth: { tile: 8, whiteIsAir: true },
};

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const golden = join(root, "test", "golden", "drawings");
mkdirSync(golden, { recursive: true });
for (const [name, options] of Object.entries(DRAWINGS)) {
  const imported = importImage(readFileSync(join(root, "test", "fixtures", "drawings", `${name}.png`)), { ...options, name });
  writeFileSync(join(golden, `${name}.rows.txt`), `${toRows(imported.variants[0].result.tiles).join("\n")}\n`);
  writeFileSync(join(golden, `${name}.import.json`), `${JSON.stringify(summarizeImport(imported), null, 2)}\n`);
  console.log(`${name}: ${imported.topology}, tile ${imported.tile}, fidelity ${imported.fidelity.fidelity}, ${imported.variants.length} variant(s), ${imported.variants[0].stubs.length} stub(s), ok ${imported.ok}`);
}

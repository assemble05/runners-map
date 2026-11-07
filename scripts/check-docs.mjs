// The harness checks itself: every ADR a doc cites exists, every command a doc shows exists, the repository a doc
// names is the git remote, and every finding code the validator emits is explained in docs/rules.md (and the other
// way round). Run by `npm run docs`; `npm run check` runs it after the tests.

import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === "records") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

const files = walk(root);
const docs = files.filter((file) => file.endsWith(".md"));
const scripts = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts;
const adrs = readdirSync(join(root, "docs", "adr")).filter((name) => /^\d{4}-/.test(name));
const adrNumbers = new Set(adrs.map((name) => name.slice(0, 4)));

for (const doc of docs) {
  const text = readFileSync(doc, "utf8");
  const name = relative(root, doc);
  for (const match of text.matchAll(/ADR (\d{4})/g)) {
    if (!adrNumbers.has(match[1])) problems.push(`${name}: cites ADR ${match[1]}, which does not exist in docs/adr/`);
  }
  for (const match of text.matchAll(/`npm run ([a-z:-]+)`/g)) {
    if (!scripts[match[1]]) problems.push(`${name}: shows \`npm run ${match[1]}\`, which is not in package.json`);
  }
  for (const match of text.matchAll(/`node (tools\/[a-z-]+\.mjs|scripts\/[a-z-]+\.mjs)[^`]*`/g)) {
    if (!existsSync(join(root, match[1]))) problems.push(`${name}: shows \`node ${match[1]}\`, which does not exist`);
  }
  for (const match of text.matchAll(/`(docs\/[a-z0-9/-]+\.md|src\/[a-z0-9/.-]+\.js|tools\/[a-z0-9/.-]+\.mjs|test\/[a-z0-9/.-]+)`/g)) {
    if (!existsSync(join(root, match[1]))) problems.push(`${name}: names \`${match[1]}\`, which does not exist`);
  }
}

let remote = null;
try {
  remote = execSync("git remote get-url origin", { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
} catch {
  remote = null;
}
if (remote) {
  const owner = remote.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
  if (owner) {
    const expected = `${owner[1]}/${owner[2]}`;
    for (const doc of docs) {
      const text = readFileSync(doc, "utf8");
      for (const match of text.matchAll(/github\.com\/([a-z0-9-]+\/[a-z0-9-]+)/gi)) {
        if (match[1].toLowerCase() !== expected.toLowerCase() && !text.includes("<!-- external -->")) {
          problems.push(`${relative(root, doc)}: names github.com/${match[1]}; the remote is ${expected}`);
        }
      }
    }
  }
}

const sources = files.filter((file) => file.includes(`${join("src")}`) && file.endsWith(".js"));
const emitted = new Set();
for (const source of sources) {
  for (const match of readFileSync(source, "utf8").matchAll(/code: "([A-Z_]+)"/g)) emitted.add(match[1]);
}
const rulesDoc = readFileSync(join(root, "docs", "rules.md"), "utf8");
const documented = new Set([...rulesDoc.matchAll(/^\| `([A-Z_]+)`/gm)].map((match) => match[1]));
for (const code of emitted) if (!documented.has(code)) problems.push(`docs/rules.md: the code ${code} is emitted but not explained`);
for (const code of documented) if (!emitted.has(code)) problems.push(`docs/rules.md: the code ${code} is explained but nothing emits it`);

if (problems.length) {
  for (const problem of problems) console.error(`docs: ${problem}`);
  process.exit(1);
}
console.log(`docs ok: ${docs.length} docs, ${adrs.length} ADRs, ${emitted.size} finding codes`);

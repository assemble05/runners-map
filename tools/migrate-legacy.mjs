// A one-time map certificate migration keeps the recorded hashes and never edits the legacy records.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { validateManifest } from "./lib/manifest.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sha = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

export function migrateLegacy(lockFile, oldRoot) {
  const root = resolve(oldRoot);
  const lock = JSON.parse(readFileSync(lockFile, "utf8"));
  if (!lock.entries || typeof lock.entries !== "object") throw new Error("legacy lock has no entries");
  const planned = [];
  for (const [id, entry] of Object.entries(lock.entries)) {
    if (entry.kind !== "map") continue;
    const commit = entry.tool?.commit;
    if (typeof commit !== "string" || !/^([a-f0-9]{40}|[a-f0-9]{64})$/.test(commit)) throw new Error(`${id}: no recorded tool commit`);
    const pkg = JSON.parse(execFileSync("git", ["show", `${commit}:package.json`], { cwd: ROOT, encoding: "utf8" }));
    if (pkg.name !== "runners-map") throw new Error(`${id}: recorded commit does not identify runners-map`);
    const sources = Object.entries(entry.inputs ?? {}).map(([path, hash]) => [resolve(root, path), hash]);
    const outputs = Object.entries(entry.outputs ?? {}).map(([path, hash]) => [resolve(root, path), hash]);
    for (const [path] of outputs) {
      if (!path.startsWith(`${root}${sep}`)) throw new Error(`${id}: output outside legacy root`);
    }
    const diagnostics = [];
    for (const [path, expected] of [...sources, ...outputs]) {
      if (!existsSync(path)) diagnostics.push({ path, problem: "missing" });
      else if (sha(path) !== expected) diagnostics.push({ path, problem: "hash-mismatch" });
    }
    const { ok, accepted, ...measurements } = entry.proof ?? {};
    const proof = { ok: ok === true && diagnostics.length === 0, metrics: {
      legacy: { proof: { ok: ok ?? null, ...measurements, ...(accepted === undefined ? {} : { accepted }) }, toolCode: entry.tool.code ?? null }, migrationDiagnostics: diagnostics,
    } };
    if (accepted !== undefined) {
      try {
        const probe = { tool: "runners-map", toolVersion: pkg.version, toolCommit: commit,
          inputs: { "input": "0".repeat(64) }, outputs: { "output": "0".repeat(64) },
          proof: { ok: false, metrics: {}, accepted }, builtAt: entry.builtAt };
        validateManifest(probe);
        proof.accepted = accepted;
      } catch {
        diagnostics.push({ path: id, problem: "legacy-acceptance-lacks-by-reason-date" });
      }
    }
    for (const [output] of outputs) {
      const path = `${output}.manifest.json`;
      if (existsSync(path)) throw new Error(`${path}: certificate exists; migration never overwrites`);
      const paths = (entries) => Object.fromEntries(entries.map(([file, hash]) => [relative(dirname(path), file).replaceAll("\\", "/"), hash]));
      const manifest = validateManifest({ tool: "runners-map", toolVersion: pkg.version, toolCommit: commit,
        inputs: paths(sources), outputs: paths(outputs), proof, builtAt: entry.builtAt });
      planned.push({ path, manifest });
    }
    if (!outputs.length) throw new Error(`${id}: no recorded outputs`);
  }
  if (new Set(planned.map(({ path }) => path)).size !== planned.length) throw new Error("legacy entries have duplicate output paths");
  for (const { path, manifest } of planned) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
  }
  return planned.map(({ path, manifest }) => ({ path, ok: manifest.proof.ok, diagnostics: manifest.proof.metrics.migrationDiagnostics }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [lockFile, flag, root] = process.argv.slice(2);
  if (!lockFile || flag !== "--root" || !root || process.argv.length !== 5) {
    console.error("usage: node tools/migrate-legacy.mjs <harness.lock.json> --root <legacy-root>");
    process.exitCode = 2;
  } else {
    try { console.log(JSON.stringify(migrateLegacy(resolve(lockFile), root), null, 2)); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}

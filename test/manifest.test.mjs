import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateManifest } from "../tools/lib/manifest.mjs";
import { migrateLegacy } from "../tools/migrate-legacy.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const valid = () => ({ tool: "runners-map", toolVersion: "0.3.0", toolCommit: "a".repeat(40),
  inputs: { "../drawing.png": "b".repeat(64) }, outputs: { "map.template.js": "c".repeat(64) },
  proof: { ok: false, metrics: { fidelity: 0.9 }, accepted: { by: "owner", reason: "intentional opening", date: "2026-11-15T00:00:00.000Z" } },
  builtAt: "2026-11-15T00:00:00.000Z" });

test("the manifest is closed at the top, proof and human acceptance; metrics stay extensible", () => {
  assert.equal(validateManifest(valid()).proof.accepted.reason, "intentional opening");
  for (const change of [
    (m) => { m.extra = 1; }, (m) => { delete m.toolCommit; }, (m) => { m.proof.extra = true; },
    (m) => { m.proof.accepted.extra = true; }, (m) => { m.proof.ok = "true"; },
    (m) => { m.inputs = {}; }, (m) => { m.outputs["map.template.js"] = "bad"; },
    (m) => { m.outputs = { "/absolute.png": "c".repeat(64) }; },
    (m) => { m.inputs = { "C:/private/drawing.png": "b".repeat(64) }; },
    (m) => { m.proof.accepted = true; }, (m) => { m.proof.accepted.reason = " "; },
    (m) => { m.proof.metrics = []; }, (m) => { m.proof.metrics.fidelity = NaN; },
    (m) => { m.builtAt = "2026-02-30T00:00:00.000Z"; },
    (m) => { m.toolVersion = "latest"; }, (m) => { m.toolCommit = "a".repeat(41); },
  ]) {
    const manifest = valid(); change(manifest);
    assert.throws(() => validateManifest(manifest));
  }
  const withoutAcceptance = valid(); delete withoutAcceptance.proof.accepted;
  assert.equal(validateManifest(withoutAcceptance).proof.ok, false);
  const calendarAcceptance = valid(); calendarAcceptance.proof.accepted.date = "2026-11-15";
  assert.equal(validateManifest(calendarAcceptance).proof.accepted.date, "2026-11-15");
  calendarAcceptance.proof.accepted.date = "2026-02-30";
  assert.throws(() => validateManifest(calendarAcceptance));
});

function run(tool, args) {
  const result = spawnSync(process.execPath, [join(ROOT, "tools", `${tool}.mjs`), ...args], { cwd: ROOT, encoding: "utf8" });
  assert.ok([0, 1].includes(result.status), `${tool}: ${result.stderr}`);
  assert.doesNotMatch(result.stderr, /Error|manifest:/, `${tool}: ${result.stderr}`);
  return result;
}

function certificates(dir) {
  const names = readdirSync(dir);
  const assets = names.filter((name) => !name.endsWith(".manifest.json"));
  assert.ok(assets.length > 0);
  for (const name of assets) {
    const manifest = validateManifest(JSON.parse(readFileSync(join(dir, `${name}.manifest.json`), "utf8")));
    for (const [output, expected] of Object.entries(manifest.outputs)) {
      assert.equal(sha(readFileSync(resolve(dir, output))), expected, output);
      assert.ok(!output.endsWith(".manifest.json"), "a certificate must not hash itself");
    }
    assert.equal(manifest.outputs[name], sha(readFileSync(join(dir, name))));
  }
  return assets;
}

test("all output commands write real certificates whose hashes match their outputs", () => {
  const dir = mkdtempSync(join(tmpdir(), "runners-map-manifest-"));
  try {
    const rows = join(ROOT, "test/fixtures/two-levels.rows.txt");
    const png = join(ROOT, "test/fixtures/two-levels.png");
    run("convert", [rows, "--out", join(dir, "convert"), "--name", "map"]);
    const made = certificates(join(dir, "convert"));
    assert.equal(made.length, 3);
    assert.equal(JSON.parse(readFileSync(join(dir, "convert/map.template.js.manifest.json"))).proof.ok, true);
    run("import", [png, "--profile", "two-levels", "--tile", "12", "--out", join(dir, "import"), "--name", "drawing", "--no-fail"]);
    certificates(join(dir, "import"));
    run("schematic", [join(ROOT, "test/fixtures/schematics/anel-com-corda.json"), "--out", join(dir, "schematic"), "--name", "ring"]);
    assert.equal(certificates(join(dir, "schematic")).length, 2);
    run("render", [rows, "--out", join(dir, "preview.png")]);
    run("rows-to-png", [rows, join(dir, "rows.png")]);
    run("compare", [png, rows, "--tile", "12", "--out", join(dir, "diff.png")]);
    run("routes", [join(dir, "schematic/ring.template.js"), "--out", join(dir, "routes.json")]);
    for (const file of ["preview.png", "rows.png", "diff.png", "routes.json"]) {
      const manifest = validateManifest(JSON.parse(readFileSync(join(dir, `${file}.manifest.json`), "utf8")));
      assert.equal(manifest.outputs[file], sha(readFileSync(join(dir, file))));
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("--no-fail changes the exit code, never the failed map proof", () => {
  const dir = mkdtempSync(join(tmpdir(), "runners-map-rejected-"));
  try {
    const result = run("convert", [join(ROOT, "test/fixtures/no-right-wall.rows.txt"), "--out", dir, "--name", "bad", "--no-fail"]);
    assert.equal(result.status, 0);
    certificates(dir);
    const manifest = JSON.parse(readFileSync(join(dir, "bad.template.js.manifest.json"), "utf8"));
    assert.equal(manifest.proof.ok, false);
    assert.ok(manifest.proof.metrics.errors.length > 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

function legacy(dir, { damaged = false, accepted } = {}) {
  const input = "source", output = "generated map";
  writeFileSync(join(dir, "input.png"), input);
  writeFileSync(join(dir, "output.js"), damaged ? "tampered" : output);
  const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  const lock = { version: 1, entries: { "map:fixture": { kind: "map", inputs: { "input.png": sha(input) },
    outputs: { "output.js": sha(output) }, tool: { commit, code: "old-source-hash" },
    proof: { ok: true, fidelity: 1, ...(accepted === undefined ? {} : { accepted }) }, builtAt: "2026-11-10T00:00:00.000Z" } } };
  const path = join(dir, "harness.lock.json"); writeFileSync(path, JSON.stringify(lock));
  return { path, lock };
}

test("legacy migration preserves provenance, never overwrites, and rejects damaged proof or incomplete acceptance", () => {
  for (const damaged of [false, true]) {
    const dir = mkdtempSync(join(tmpdir(), "runners-map-migration-"));
    try {
      const { path, lock } = legacy(dir, { damaged, accepted: "owner said yes" });
      const lockBefore = readFileSync(path), assetBefore = readFileSync(join(dir, "output.js"));
      migrateLegacy(path, dir);
      const manifest = validateManifest(JSON.parse(readFileSync(join(dir, "output.js.manifest.json"), "utf8")));
      assert.equal(manifest.toolCommit, lock.entries["map:fixture"].tool.commit);
      assert.equal(manifest.toolVersion, JSON.parse(execFileSync("git", ["show", `${manifest.toolCommit}:package.json`], { cwd: ROOT, encoding: "utf8" })).version);
      assert.equal(manifest.builtAt, lock.entries["map:fixture"].builtAt);
      assert.deepEqual(manifest.outputs, lock.entries["map:fixture"].outputs);
      assert.equal(manifest.proof.ok, !damaged);
      assert.equal(manifest.proof.accepted, undefined);
      assert.ok(manifest.proof.metrics.migrationDiagnostics.some((item) => item.problem.includes("acceptance")));
      assert.throws(() => migrateLegacy(path, dir), /never overwrites/);
      assert.deepEqual(readFileSync(path), lockBefore);
      assert.deepEqual(readFileSync(join(dir, "output.js")), assetBefore);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
});

test("migration keeps a complete human acceptance visible, flags missing files and never alters recorded hashes", () => {
  const dir = mkdtempSync(join(tmpdir(), "runners-map-accepted-"));
  try {
    const accepted = { by: "owner", reason: "known intentional map exception", date: "2026-11-15" };
    const { path, lock } = legacy(dir, { accepted });
    rmSync(join(dir, "output.js"));
    migrateLegacy(path, dir);
    const manifest = validateManifest(JSON.parse(readFileSync(join(dir, "output.js.manifest.json"), "utf8")));
    assert.deepEqual(manifest.proof.accepted, accepted);
    assert.equal(manifest.proof.ok, false);
    assert.equal(manifest.outputs["output.js"], lock.entries["map:fixture"].outputs["output.js"]);
    assert.ok(manifest.proof.metrics.migrationDiagnostics.some((item) => item.problem === "missing"));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

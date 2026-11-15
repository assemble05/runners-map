// The map tool owns its certificates; paths are relative to each certificate, never to a sibling checkout.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const FIELDS = ["tool", "toolVersion", "toolCommit", "inputs", "outputs", "proof", "builtAt"];
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value) => typeof value === "string" && value.trim().length > 0;
const date = (value) => text(value) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const acceptanceDate = (value) => date(value) || (text(value) && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

function keys(value, required, optional = []) {
  return object(value) && required.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every((key) => required.includes(key) || optional.includes(key));
}

function hashes(value) {
  return object(value) && Object.keys(value).length > 0 && Object.entries(value).every(([path, sha]) =>
    text(path) && !isAbsolute(path) && !/^[A-Za-z]:/.test(path) && !path.includes("\\") &&
    typeof sha === "string" && /^[a-f0-9]{64}$/.test(sha));
}

function json(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(json);
  return object(value) && Object.values(value).every(json);
}

export function validateManifest(manifest) {
  if (!keys(manifest, FIELDS)) throw new Error("manifest: closed top-level fields required (ADR 0010)");
  if (manifest.tool !== "runners-map" || typeof manifest.toolVersion !== "string" || !/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(manifest.toolVersion) ||
    typeof manifest.toolCommit !== "string" || !/^([a-f0-9]{40}|[a-f0-9]{64})$/.test(manifest.toolCommit)) {
    throw new Error("manifest: tool identity, version and commit required");
  }
  if (!hashes(manifest.inputs) || !hashes(manifest.outputs)) throw new Error("manifest: relative paths and SHA-256 hashes required");
  const proof = manifest.proof;
  if (!keys(proof, ["ok", "metrics"], ["accepted"]) || typeof proof.ok !== "boolean" || !object(proof.metrics) || !json(proof.metrics)) {
    throw new Error("manifest: closed proof with boolean ok and JSON metrics required");
  }
  if (Object.hasOwn(proof, "accepted") && (!keys(proof.accepted, ["by", "reason", "date"]) ||
    !text(proof.accepted.by) || !text(proof.accepted.reason) || !acceptanceDate(proof.accepted.date))) {
    throw new Error("manifest: acceptance needs by, reason and date");
  }
  if (!date(manifest.builtAt)) throw new Error("manifest: builtAt must be an ISO date");
  return manifest;
}

export function writeManifests({ inputs, outputs, proof }) {
  const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));
  const toolCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  const builtAt = new Date().toISOString();
  const entries = (files) => [...new Set(files.map((file) => resolve(file)))].map((path) => [path, hash(readFileSync(path))]);
  const source = entries(inputs), made = entries(outputs);
  return made.map(([output]) => {
    const certificate = `${output}.manifest.json`;
    const paths = (files) => Object.fromEntries(files.map(([path, sha]) => [relative(dirname(certificate), path).replaceAll("\\", "/"), sha]));
    const manifest = validateManifest({ tool: "runners-map", toolVersion: pkg.version, toolCommit,
      inputs: paths(source), outputs: paths(made), proof, builtAt });
    writeFileSync(certificate, JSON.stringify(manifest, null, 2) + "\n");
    return certificate;
  });
}

export const analysisProof = (result, options = {}) => ({ ok: result.ok, metrics: {
  profile: result.profile, errors: result.validation.errors, warnings: result.validation.warnings,
  report: result.validation.report, options,
} });

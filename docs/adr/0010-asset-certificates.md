# 0010. Map assets carry the map tool's own certificate

Status: accepted. Date: 2026-11-15.

## Context

The owner decided that asset tools are independent. A map must carry its provenance and deterministic
proof without requiring a separate program to run or judge this tool. Map conversion and thresholds stay
here. The game developer chooses a tool version and verifies its output certificates.

## Decision

Every file emitted by an output command receives a sibling named `<full-filename>.manifest.json`.
The closed top-level shape is:

```json
{
  "tool": "runners-map",
  "toolVersion": "0.3.1",
  "toolCommit": "0000000000000000000000000000000000000000",
  "inputs": { "../input.png": "0000000000000000000000000000000000000000000000000000000000000000" },
  "outputs": { "map.template.js": "0000000000000000000000000000000000000000000000000000000000000000" },
  "proof": { "ok": false, "metrics": {} },
  "builtAt": "2026-11-15T00:00:00.000Z"
}
```

This is an example, not a certificate for an existing map. `toolVersion` comes from package.json and
`toolCommit` from this checkout's Git HEAD. Only committed source provides reproducible commit provenance;
development certificates made from an edited checkout must not be distributed as a committed release.
The input and output maps contain lowercase SHA-256 hashes. Paths are relative to the certificate's
directory with forward slashes. A group of outputs shares its complete output map. A certificate never
includes itself or another certificate in `outputs`.

`proof` has exactly `ok`, `metrics` and optional `accepted`. Metrics are JSON data from map calculations,
including the options used. Conversion, import and schematic proof carry the existing validator's verdict.
Rendering a preview carries the map analysis verdict. Comparison carries the fidelity threshold verdict.
Rows-to-image certifies successful rendering only; its metrics identify that operation, not map validity.
Route proof requires a nonempty route set with every route sealed and runnable.
`--no-fail` may change a process exit code, never a certificate's proof.

An acceptance has exactly `by`, `reason` and `date`, each nonempty. Date is a real ISO calendar date or
UTC timestamp. It is the human's explicit exception and remains visible beside the failing `ok` value.
An AI may prepare an input or read diagnostics; only deterministic map code produces `ok`, and only a
human provides an acceptance. A new field at the top level, in proof or in acceptance needs a new ADR here.
The validator rejects missing fields, unknown closed fields, malformed hashes, absolute paths and malformed dates.

Output commands are independent. No command imports or invokes another asset tool. No cross-domain
validation is introduced. The optional external status reader may read these certificates, but owns no proof.

### Legacy records

`node tools/migrate-legacy.mjs <harness.lock.json> --root <legacy-root>` is a one-time import of map entries.
It reads only `kind: map`, preserves recorded input/output hashes, commit and build time, and obtains the
version from that recorded commit's package.json. It never substitutes the currently installed version.
Missing commits or malformed provenance stop migration. Missing or changed input/output files keep their
recorded hashes but force `proof.ok` false with diagnostics. Old measurements and acceptance data stay
inside metrics; an old boolean or string is never promoted to a human acceptance. Existing certificates
are never overwritten. The lock, records and assets are never edited or deleted.

### Human findings

Every human finding on a map becomes an issue in this repository. Keep the exact failing drawing or
schematic as a fixture, add a test asserting the failing code and reproduce it before fixing the tool.
Link the fixture and test in the issue and PR. Do not edit an output asset or loosen a threshold to pass.
A reasoned human acceptance is available while a finding remains open.

## Consequences

The game can reject absent proof, changed output hashes and unsupported tool versions without running
this tool or duplicating map logic. Existing map thresholds and golden content do not change.
The pure pipeline remains file-free; certificates are emitted by the CLI boundary in
`tools/lib/manifest.mjs`. Integration tests use disposable operating-system temporary directories and
remove them in `finally`, a deliberate exception to the older no-file-writes test rule.

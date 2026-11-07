# 0001. The harness has the shape of Zerun's

Status: accepted. Date: 2026-11-07.

## Context

runners-map feeds Zerun with templates. Zerun's harness (`AGENTS.md`, one-line standards tagged with how they
are checked, ADRs, issues written as specs, a script that checks the docs) is what the owner's agents already
follow. A second shape would be a second thing to learn and keep.

## Decision

- The same pieces: `AGENTS.md` with layout, commands, a "when / read / run" table and rules; `docs/<topic>-standards.md`
  with one line per rule tagged `(test)`, `(script)` or `(review)`; `docs/adr/`; `docs/agents/` for issues and labels;
  `.github/` templates; `GLOSSARY.md`.
- A tool before a sentence: a rule is a test, a script or a check first, and a line of text only when no tool can
  express it (`docs/harness-standards.md`).
- `scripts/check-docs.mjs` keeps the docs honest: cited ADRs exist, shown commands exist, named files exist, the
  repository named is the git remote, and every finding code is explained.

## Consequences

- Smaller than Zerun's: no lint plugin, no e2e. A rule those tools checked there is a test or review here.
- A fix to the harness shape found here is worth carrying back to Zerun, and the other way round.

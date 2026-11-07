# Harness standards

The harness is `AGENTS.md`, the standards docs, `scripts/check-docs.mjs`, the `package.json` commands, CI, the
templates in `.github/` and `docs/agents/`. Ported from Zerun's (ADR 0001).

- **A tool before a sentence (review).** A new rule is a test, a check in `scripts/check-docs.mjs` or a finding
  code first; it becomes a line of text only when no tool can express it, and the line says why.
- **Placement order (review).** A test that fails on a fixture; a check in `scripts/check-docs.mjs`; a line in a
  standards doc marked `(review)`; an ADR when it is a decision with a cost.
- **Cheapest adequate fix (review).** Delete or tighten before adding. A rarely needed detail goes in the file
  that does the work, not in `AGENTS.md`.
- **Conflict is a finding (review).** Two rules for the same thing are fixed by keeping the one where the work
  is done and removing the other.
- **A number has one home (review).** `src/config.js`. A doc that quotes a number names the key it quotes.
- **Carry fixes back (review).** A harness fix found here that also applies to Zerun is carried there, and the
  other way round.

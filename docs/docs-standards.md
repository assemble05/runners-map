# Docs standards

What goes in `docs/` and where everything else goes. `npm run docs` runs `scripts/check-docs.mjs`.

- **Standard.** A rule that applies to every file of its kind, one line a reviewer or a tool answers yes or no,
  tagged with how it is checked: `docs/code-standards.md`, `docs/test-standards.md`, `docs/harness-standards.md`.
- **Reference.** What the tool reports: `docs/rules.md`. Its table of codes is checked against the code (script).
- **ADR.** Why a choice was made: `docs/adr/NNNN-slug.md` with Status, Date, Context, Decision, Consequences. An
  accepted ADR is not edited; a new one replaces it and says so.
- **Product doc.** The owner's statement of a rule, verbatim, in the owner's language: `docs/product/`. Never
  rewritten; the reading of it is an ADR.
- **Agents.** How to work issues and labels: `docs/agents/`.
- **Cited things exist (script).** An `ADR NNNN` cited anywhere exists; a `npm run <x>` or `node tools/<x>.mjs`
  shown exists; a backticked path under `docs/`, `src/`, `tools/` or `test/` exists; a `github.com/<owner>/<repo>`
  is the git remote.
- **Terms come from `GLOSSARY.md` (review).** A doc that needs a new word adds it there first.

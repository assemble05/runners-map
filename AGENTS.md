# runners-map

Map templates for a platform race (Zerun) from an attached drawing: tiles, a graph the runner can be asked
about, rules as findings with codes, and the game's template module, with proof. The harness converts; it never
draws (ADR 0008). Three profiles (ADR 0007): **two-levels**, the owner's course piece; **zerun-circuit**, a race
track with Zerun's physics and world; **circuit**, the same rules with SpeedRunners' reach, calibrated on 79
reference maps kept as golden test cases. The rules are in `docs/rules.md`; the reasons are ADRs (`docs/adr/`);
the words are in `GLOSSARY.md`. The harness was ported from Zerun's (ADR 0001).

## Layout

- `src/image/`: PNG codec, the pixel threshold, drawing rows back, fidelity (`png.js`, `binarize.js`, `draw.js`, `compare.js`).
- `src/grid/`: pixels to tiles and marks, the two-level layout, corridor heights, openings and variants (`tiles.js`, `levels.js`, `corridors.js`, `openings.js`).
- `src/graph/`: world air, headroom, surfaces, moves, links, dead-end stubs and the graph questions (`surfaces.js`, `stubs.js`, `analysis.js`).
- `src/validate/`: the two-levels rules (`rules.js`), the circuit rules (`circuit.js`), the summaries the goldens hold (`summary.js`).
- `src/template/`: the Zerun template and its module (`emit.js`). `src/render/`: the preview (`preview.js`).
- `src/config.js`: every number, by profile. `src/index.js`: the pipeline, `analyzeImage` and `importImage`.
- `tools/`: the commands. `scripts/`: the harness check, the golden generators and the map measurer.
- `test/`: tests; `test/fixtures/` holds the hand-made maps, the attached drawings (`drawings/`) and the 79
  reference renders (`speedrunners/`); `test/golden/` holds the generated template, the reference rows and
  findings, and the drawings' rows and import accounts.
- `skills/`: how an agent uses this repository (`runners-map`) and proves a map matches its drawing (`image-compare`).
- No dependency: Node built-ins only (ADR 0006).

## Commands

    node tools/measure.mjs drawing.png --white-is-air           # tile sizes against the runner and the world
    node tools/import.mjs drawing.png --white-is-air --tile 8   # the whole road: templates, reports, previews, diff
    node tools/compare.mjs drawing.png map.template.js --tile 8 # fidelity and diff of any rows against a drawing
    node tools/convert.mjs map.png --out records                # one map, one profile, no import steps
    node tools/validate.mjs map.png                             # findings only
    node tools/render.mjs map.png --out preview.png             # the preview only
    node tools/rows-to-png.mjs map.rows.txt map.png             # draw an image from rows
    node scripts/measure-maps.mjs test/fixtures/speedrunners 12 24   # graph statistics of the reference maps at a reach
    npm test                                                    # node --test
    npm run golden                                              # regenerate the two-levels golden template
    npm run golden:speedrunners                                 # regenerate the reference rows and findings
    npm run golden:drawings                                     # regenerate the drawings' rows and import accounts
    npm run docs                                                # the harness checks itself
    npm run check                                               # test + docs; run before a commit

## How to act on a task

| When | Read | Run |
| --- | --- | --- |
| Starting a session | `README.md` | `npm run check` |
| A drawing was attached | `skills/runners-map/SKILL.md` | `node tools/measure.mjs <png> --white-is-air` |
| Domain terms or an ADR | `docs/agents/domain.md`, `GLOSSARY.md`, `docs/adr/` | — |
| A finding you do not understand | `docs/rules.md` | `node tools/render.mjs <map>` |
| The map must match the drawing | `skills/image-compare/SKILL.md` | `node tools/compare.mjs <png> <rows> --tile N` |
| Writing or changing code | `docs/code-standards.md` | — |
| Writing or changing tests | `docs/test-standards.md` | `npm test` |
| Changing a rule or a number | ADR 0005, ADR 0007, ADR 0008, `src/config.js` | the golden scripts, then `npm test` |
| A reference map or a drawing converts differently | ADR 0007, ADR 0008 | `git diff test/golden` |
| Received an issue number | `docs/agents/issue-tracker.md` | `gh issue view <n> --comments` |
| Before committing | `.github/PULL_REQUEST_TEMPLATE.md` | `npm run check` |
| Changing the harness | `docs/harness-standards.md` | `npm run check` |
| Writing or moving docs | `docs/docs-standards.md` | `npm run docs` |

## Rules

- Commit once per task, after a clean `npm run check`. Never loosen a limit or skip a check to pass.
- Start work on a branch from `main` and open a pull request; the branch is `<type>/<n>-slug` (`feat`, `fix`, `chore`).
- The pull request body starts with `Closes #<n>`; one pull request closes one issue.
- Code and docs are in English. The owner's rules are kept verbatim in Portuguese in `docs/product/`.
- Every number lives in `src/config.js`; a rule is a finding with a code, explained in `docs/rules.md`.
- The drawing is the source. The template module is generated and never edited by hand (ADR 0002); the harness
  never changes a drawing to make it pass (ADR 0008).
- A change in output regenerates the golden files in the same pull request, and the diff is reviewed; a golden
  that changes without a reason named in the pull request is a bug.
- Contradicting an ADR is said explicitly in the pull request.

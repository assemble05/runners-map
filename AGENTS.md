# runners-map

Map templates for a platform race (Zerun), drawn as an image, validated as a graph and emitted as the game's
template module. White is solid, black is empty. Two profiles (ADR 0007): **two-levels**, the owner's course
piece (two levels joined only by the two climbable walls at the ends, every branch back in its level, nothing a
dead end); and **circuit**, a race track like SpeedRunners' (one network, parallel lanes), calibrated on 79
reference maps that are golden test cases. The rules are findings with codes (`docs/rules.md`); the reasons are
ADRs (`docs/adr/`); the words are in `GLOSSARY.md`. The harness was ported from Zerun's (ADR 0001).

## Layout

- `src/image/`: PNG codec, the pixel threshold, the drawing of rows back to an image (`png.js`, `binarize.js`, `draw.js`).
- `src/grid/`: pixels to tiles and the two-level layout (`tiles.js`, `levels.js`).
- `src/graph/`: world air, surfaces, moves, links and the graph questions (`surfaces.js`, `analysis.js`).
- `src/validate/`: the two-levels rules (`rules.js`), the circuit rules (`circuit.js`), the summary the goldens hold (`summary.js`).
- `src/template/`: the Zerun template and its module (`emit.js`). `src/render/`: the preview (`preview.js`).
- `src/config.js`: every number, by profile. `src/index.js`: the pipeline.
- `tools/`: the commands. `scripts/`: the harness check, the golden generator and the map measurer.
- `test/`: tests; `test/fixtures/` holds the hand-made maps (`.rows.txt`, one `.png`) and `test/fixtures/speedrunners/`
  the 79 reference renders; `test/golden/` holds the generated template and the reference rows and findings.
- `skills/`: how an agent uses this repository. No dependency: Node built-ins only (ADR 0006).

## Commands

    node tools/convert.mjs map.png --out records            # template .js, report .json, preview .png; exit 1 if invalid
    node tools/convert.mjs track.png --profile circuit --tile 2
    node tools/validate.mjs map.png                          # findings only
    node tools/render.mjs map.png --out preview.png          # the preview only
    node tools/rows-to-png.mjs map.rows.txt map.png          # draw an image from rows
    node scripts/measure-maps.mjs test/fixtures/speedrunners 12 24   # graph statistics of the reference maps at a reach
    npm test                                                 # node --test
    npm run golden                                           # regenerate the two-levels golden template
    npm run golden:speedrunners                              # regenerate the reference rows and findings
    npm run docs                                             # the harness checks itself
    npm run check                                            # test + docs; run before a commit

## How to act on a task

| When | Read | Run |
| --- | --- | --- |
| Starting a session | `README.md` | `npm run check` |
| Domain terms or an ADR | `docs/agents/domain.md`, `GLOSSARY.md`, `docs/adr/` | — |
| A finding you do not understand | `docs/rules.md` | `node tools/render.mjs <map>` |
| Writing or changing code | `docs/code-standards.md` | — |
| Writing or changing tests | `docs/test-standards.md` | `npm test` |
| Changing a rule or a number | ADR 0005, ADR 0007, `src/config.js` | `npm run golden`, `npm run golden:speedrunners`, then `npm test` |
| A reference map converts differently | ADR 0007 | `git diff test/golden/speedrunners` |
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
- The image is the source. The template module is generated and never edited by hand (ADR 0002).
- A change in output regenerates the golden files in the same pull request, and the diff is reviewed; a golden
  that changes without a reason named in the pull request is a bug.
- Contradicting an ADR is said explicitly in the pull request.

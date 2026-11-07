# runners-map

Map templates for a two-level platform race (Zerun), drawn as an image, validated as a graph and emitted as the
game's template module. White is solid, black is empty, a tile is 12 x 12 px. A map is two levels stacked, joined
only by the two climbable walls at its left and right ends; each level has its own branches, every branch comes
back to its level, and nothing is a dead end. The rules are findings with codes (`docs/rules.md`); the reasons are
ADRs (`docs/adr/`); the words are in `GLOSSARY.md`. The harness was ported from Zerun's (ADR 0001).

## Layout

- `src/image/`: PNG codec and the pixel threshold (`png.js`, `binarize.js`).
- `src/grid/`: pixels to tiles and the level layout (`tiles.js`, `levels.js`).
- `src/graph/`: surfaces, moves, links and the graph questions (`surfaces.js`, `analysis.js`).
- `src/validate/`: the rules (`rules.js`). `src/template/`: the Zerun template and its module (`emit.js`).
- `src/render/`: the preview (`preview.js`). `src/config.js`: every number. `src/index.js`: the pipeline.
- `tools/`: the commands. `test/`: tests, fixtures (`.rows.txt` and one `.png`) and the golden template.
- `scripts/check-docs.mjs`: the harness checks itself. `skills/`: how an agent uses this repository.
- No dependency: Node built-ins only (ADR 0006).

## Commands

    node tools/convert.mjs map.png --out records   # template .js, report .json and preview .png; exit 1 if invalid
    node tools/validate.mjs map.png                 # findings only
    node tools/render.mjs map.png --out preview.png # the preview only
    node tools/rows-to-png.mjs map.rows.txt map.png # draw an image from rows (text sketch to image)
    npm test                                        # node --test
    npm run docs                                    # the harness checks itself
    npm run check                                   # test + docs; run before a commit

## How to act on a task

| When | Read | Run |
| --- | --- | --- |
| Starting a session | `README.md` | `npm run check` |
| Domain terms or an ADR | `docs/agents/domain.md`, `GLOSSARY.md`, `docs/adr/` | — |
| A finding you do not understand | `docs/rules.md` | `node tools/render.mjs <map>` |
| Writing or changing code | `docs/code-standards.md` | — |
| Writing or changing tests | `docs/test-standards.md` | `npm test` |
| Changing a rule or a number | ADR 0005, `src/config.js` | `npm run golden`, then `npm test` |
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
- A change in behavior updates the golden template, the fixtures, `GLOSSARY.md` or an ADR in the same pull request.
- Contradicting an ADR is said explicitly in the pull request.

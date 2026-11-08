# Test standards

How tests are written. They run with `node --test` (`npm test`). Every rule serves one question: would this test
fail if the code broke?

- **A rule has a fixture that breaks it (review).** Each finding code has a map in `test/fixtures/` (or built by
  `test/helpers.mjs`) that produces it and nothing else, and one valid map that produces none. A new code comes
  with its fixture in the same pull request.
- **Fixtures are playable (review).** A hand-made map gives the runner its headroom: a two-level fixture has
  seven rows of air per level, so a branch three tiles over the floor leaves three under the ceiling. A test of
  graph geometry alone draws a few rows and passes `GEOMETRY_PHYSICS` (no headroom rule) so the shape is the
  only thing under test.
- **The valid map is golden (test).** `test/golden/two-levels.template.js` is the module generated from
  `test/fixtures/two-levels.rows.txt`; `test/emit.test.mjs` compares the text. A change in output regenerates it
  with `npm run golden` and the diff is reviewed.
- **The reference maps are golden (test).** Every PNG under `test/fixtures/speedrunners/` has its rows and a
  summary of its findings under `test/golden/speedrunners/`; `test/speedrunners.test.mjs` converts each map
  under the circuit profile, compares both, and draws the rows back to an image and converts again. A change
  regenerates them with `npm run golden:speedrunners`; the pull request names why each changed file changed.
- **The drawings are golden (test).** Every attached drawing under `test/fixtures/drawings/` has the rows of its
  first variant and its import account under `test/golden/drawings/`, under the options in
  `scripts/golden-drawings.mjs`; `test/import.test.mjs` imports each and compares. `npm run golden:drawings`
  regenerates them.
- **The image path is tested with real PNGs (test).** `test/fixtures/two-levels.png` is drawn from the rows by
  `npm run fixtures`; the reference renders and the drawings came from outside and are never edited.
- **Assert the finding codes, not the messages (review).** A test compares the sorted set of codes, or the
  summary; it matches a message only when the number in it is the point (a percentage, a count).
- **Small maps for graph questions (review).** A test of `buildGraph`, `findStubs` or `findOpenings` uses a map
  of a few rows written inline, so the reader sees the shape next to the assertion.
- **The outer describe names the function or the set (review).** `describe("validate()")`,
  `describe("the SpeedRunners reference maps")`; cases inside say the situation in plain words.
- **No file writes in tests (review).** Tools are tested through the functions they call; the tools themselves
  are run by hand and by the golden scripts.

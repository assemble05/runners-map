# Test standards

How tests are written. They run with `node --test` (`npm test`). Every rule serves one question: would this test
fail if the code broke?

- **A rule has a fixture that breaks it (review).** Each finding code has a map in `test/fixtures/` (or built by
  `test/helpers.mjs`) that produces it and nothing else, and one valid map that produces none. A new code comes
  with its fixture in the same pull request.
- **The valid map is golden (test).** `test/golden/two-levels.template.js` is the module generated from
  `test/fixtures/two-levels.rows.txt`; `test/emit.test.mjs` compares the text. A change in output regenerates it
  with `npm run golden` and the diff is reviewed.
- **The image path is tested with a real PNG (test).** `test/fixtures/two-levels.png` is drawn from the rows by
  `npm run fixtures`; `test/image.test.mjs` converts it and expects the rows back.
- **Assert the finding codes, not the messages (review).** A test compares the sorted set of codes; it matches a
  message only when the number in it is the point (a percentage, a count).
- **Small maps for graph questions (review).** A test of `buildGraph` uses a map of a few rows written inline,
  so the reader sees the shape next to the assertion.
- **The outer describe names the function (review).** `describe("validate()")`, `describe("buildGraph()")`;
  cases inside say the situation in plain words.
- **No file writes in tests (review).** Tools are tested through the functions they call; the tools themselves
  are run by hand and by `npm run golden`.

# Code standards

How code in this repository is written. Rules marked **(test)** fail `npm test`, **(script)** fail `npm run docs`;
the rest are checked in review.

- **One pipeline, pure in the middle (review).** `src/index.js` wires image → cells → tiles → levels → graph →
  validation → template. Everything between the image and the files is a pure function of its arguments: no
  file system, no clock, no randomness. Only `tools/` and `scripts/` touch files.
- **Every number lives in `src/config.js` (review).** A reach, a ratio, a tile size or a threshold is named there
  and taken from there; a function takes it as an argument with that default.
- **A rule is a finding (script).** The validator reports `{ code, message, ... }`; the code is explained in
  `docs/rules.md` with a fix; `scripts/check-docs.mjs` fails when a code is emitted without a line or has a line
  without an emitter.
- **A message names the place (review).** A finding says the row and columns, or the move, it is about, in
  tiles, so a person can find it in the preview.
- **Folders say the step (review).** `src/image/` pixels, `src/grid/` tiles and layout, `src/graph/` surfaces and
  moves, `src/validate/` rules, `src/template/` output, `src/render/` preview. A file imports only from its folder
  or a folder earlier in the pipeline.
- **ES modules, no build (review).** `.js` in `src/`, `.mjs` in `tools/`, `scripts/` and `test/`. Node runs them
  as they are.
- **A comment says why (review).** A file starts with what it is for. A comment inside the code stays only when it
  guards something the code does not show; it names the rule.
- **Names say what they hold (review).** A surface has `row`, `floorRow`, `x0`, `x1`; a move has `from`, `to`,
  `type`, `side`; a link has `lo`, `hi`, `colAtLo`, `colAtHi`. New data keeps these names.
- **No dependency (review).** Node built-ins only (ADR 0006).

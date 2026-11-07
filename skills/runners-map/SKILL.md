---
name: runners-map
description: Turn a drawn course piece (PNG, white solid on black) into a Zerun template, validated as a graph: two levels joined only by the extremity walls, no dead end, branches 5% to 40% of their level. Use when someone wants a map template from an image or a text sketch, wants to know why a map is rejected, or wants the preview of what the validator saw.
license: MIT
compatibility: Node 20 or newer. No dependency.
---

# runners-map

## When

- A map image or a rows sketch needs to become `records/<name>.template.js` for Zerun.
- A map is rejected and the finding needs to be read.
- A rule or a number of the model needs to change.

## Do

1. Convert: `node tools/convert.mjs <map.png> --out records --name <name>`. Read the findings it prints.
   Exit code 1 means the map was rejected; the files are still written, with the findings inside `analysis`.
2. Look: `node tools/render.mjs <map.png> --out <name>.preview.png`, then open the PNG. Green is a main route,
   blue a branch, red a finding, yellow a wall climb.
3. Read the code in `docs/rules.md` and fix the drawing, not the output. Convert again.
4. A text sketch: write rows with `#`, `=`, `.`; `node tools/rows-to-png.mjs sketch.rows.txt sketch.png` draws it.
5. A rule change: read ADR 0005, change `src/config.js` or `src/validate/rules.js`, add the fixture that fails
   without it, update `docs/rules.md`, run `npm run golden` when the output changes, then `npm run check`.

## Do not

- Edit a generated `.template.js`; it says so in its first line.
- Loosen a number in `src/config.js` to make one map pass.
- Treat a passing map as played: the model approximates Zerun's physics (ADR 0004). The game is the last check.

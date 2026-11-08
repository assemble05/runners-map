---
name: runners-map
description: Turn an attached drawing of a course (PNG) into Zerun templates with proof, using the runners-map import: fidelity against the drawing, dead-end corridors turned into decoration, one template per (entry, exit) pair, validation with the game's physics. Use when someone attaches a map drawing, wants to know why a map is rejected or does not fit the game, or wants the preview of what the validator saw. The harness converts; it never draws.
license: MIT
compatibility: Node 20 or newer. No dependency.
---

# runners-map

## When

- A drawing of a course was attached and the game needs its template.
- A map is rejected, or does not fit Zerun, and the finding needs to be read.
- A rule or a number of the model needs to change.

## The road (ADR 0008)

1. **Measure first**: `node tools/measure.mjs <drawing.png> --white-is-air` (drop the flag when the drawing is
   white rock on black air). The table says, per tile size, whether the corridors fit the runner (3 tiles to
   stand) and the rows fit the world (60), and the fidelity. Pick a tile size that fits both. If none does, the
   last line says what to change: redraw the corridors thicker, or ask Zerun for a taller world. Do not redraw;
   report it.
2. **Import**: `node tools/import.mjs <drawing.png> --white-is-air --tile <N> --out records --name <name>`.
   Exit code 1 means a variant was rejected or the fidelity is under 97%; the files are still written.
3. **Read** what it printed: the topology (`stretch` with entries and exits, or `circuit`), each stub and its
   treatment, each variant's findings. Codes are in `docs/rules.md`.
4. **Look**: open `records/<variant>.preview.png` (green network, blue branch, red error, orange warning, brown
   treated stub, magenta barrier) and `records/<name>.diff.png` (red lost, blue added). The
   `image-compare` skill says how to read and report the fidelity.
5. **Deliver** `records/<variant>.template.js` (the Zerun shape plus `analysis`), `<variant>.report.json`,
   `<name>.import.json`, the preview and the diff. Say the tile size, the fidelity, the topology, the stubs and
   their treatment, and every error. A circuit has no entry or exit: Zerun's engine needs a circuit mode to
   run it; a stretch is placed after the start like its loop.
6. **Dead ends**: `--dead-ends barrier` (default) closes each with `W` tiles; `fill` turns it to rock and lowers
   the fidelity; `keep` leaves it and warns `STUB`. Say which was used.
7. **A rule change**: read ADR 0005, ADR 0007 and ADR 0008, change `src/config.js` or the validator, add the
   fixture that fails without it, update `docs/rules.md`, run the golden scripts, then `npm run check`.

## Do not

- Edit a generated `.template.js`; it says so in its first line.
- Change a drawing to make it pass. Report what to change and who draws it.
- Loosen a number in `src/config.js` to make one map pass.
- Treat a passing map as played: the model approximates Zerun's physics (ADR 0004). The game is the last check.

# 0008. The import pipeline: a drawing becomes templates, with proof

Status: accepted. Date: 2026-11-07.

## Context

The owner's way of making a map is to generate or draw a picture outside and attach it. The harness must not
draw: it converts. The owner asked for the whole road in one command, for the game to get data and never a
picture, for the map to be identical to the drawing with a picture that proves it, for dead ends to become
decoration instead of a wall the player runs into, and for a drawing with several ways in and out to become
several maps.

The first drawing (`test/fixtures/drawings/labyrinth.png`, 2048 x 768 px) is a corridor drawing: white is the
path, black is rock. It is a closed loop with no opening on any border, its corridors are about 35 px thick,
and it has no dead end. Measured against Zerun (ADR 0004, `PhysicsUtil`): a tile is 12 px, the world is 60
rows, the runner is 30 px tall standing and 15 sliding.

## Decision

- **One command.** `node tools/import.mjs <drawing.png>` runs: image to tiles, fidelity against the drawing,
  dead-end stubs found and treated, openings and variants, validation with the target game's physics, and the
  template module, report, preview and diff for each variant. `node tools/measure.mjs` runs first when the
  scale is unknown; `node tools/compare.mjs` compares any rows with any drawing.
- **White is air when asked.** `--white-is-air` reads a corridor drawing. The default stays white rock on black
  air, the two-levels convention (ADR 0002).
- **Fidelity is measured, not assumed.** The tiles are drawn back at the drawing's own pixel size and compared
  cell by cell with the binarized drawing (`src/image/compare.js`): the share kept is `fidelity`, the pixels that
  differ are counted and boxed, and a diff picture shows them (red: drawn but lost; blue: added by the tiles).
  Below `minFidelity` (0.97) the import fails with `LOW_FIDELITY`. What is exact is the other way round: the
  rows drawn as an image and converted again give the same rows (`npm run golden:drawings`), so the game map and
  the tile picture are one thing. This is Zerun's visual "before and after" applied to a map; the procedure is
  the `image-compare` skill.
- **Headroom is part of the physics.** A standing tile needs `headroom.slide` passable tiles above it to exist
  and `headroom.stand` to count as a place to stand; Zerun's are 2 and 3 (24 px holds a 15 px slider, 36 px a
  30 px runner, 12 px nothing). Below the slide height a tile is `CRUSHED` and left out; between the two it is
  `LOW_CEILING`, a warning. The SpeedRunners profile sets both to 1, which keeps its reference goldens honest:
  that runner's size was never measured.
- **The world has a height.** A Zerun profile fails a piece taller than 60 rows with `TOO_TALL`. `measure`
  reports, per tile size, whether the corridors fit the runner and the rows fit the world, and what to change
  when no size fits both.
- **Dead ends are shapes, not only graph nodes.** The world air is thinned to a skeleton (Zhang-Suen); an
  endpoint of the skeleton is a corridor that stops; the path back to the first junction is the stub, its length
  the depth, and spurs shorter than `max(minStubDepth, median corridor height)` are corners. The mouth is the
  corridor's cross-section at the junction; the stub's air is what the mouth seals off. `--dead-ends barrier`
  (default) puts a barrier `W` on every tile of the mouth: the pocket becomes decoration the runner cannot
  enter, and the geometry and the fidelity do not change. `fill` turns the stub to rock and lowers the fidelity;
  `keep` reports `STUB`. A barrier is an entity Zerun already has (HP 3, broken with a weapon), so the
  decoration is also a choice for the player with a sword.
- **Openings make variants.** A run of world air on the left or right border is an opening with a floor. A
  drawing with at least one on each side is a `stretch`; one variant per (entry, exit) pair, named
  `<name>-e<row>-x<row>`, each with the other openings closed by a solid tile on the border (which leaves a
  stub for the treatment). A drawing with none is a `circuit`: one variant, no entry or exit of its own, the
  template's rows at the lowest floors of its ends. Top and bottom openings are not entries.
- **The profile is the target game.** `zerun-circuit` (default of `import`) is the circuit rules with Zerun's
  reach, headroom and world; `circuit` keeps SpeedRunners' reach for the reference maps; `two-levels` is the
  owner's piece.
- **Marks travel with the rows.** Zerun's entity and hazard characters (`W B c P s N K t ^ v - >`) are kept
  as marks on tiles and written back; a barrier or a box blocks the runner in the graph.

## Consequences

- The labyrinth is a sound circuit at 8 px per tile (fidelity 98.3%, one network, 92% of columns with two
  lanes, no stub) and does not fit Zerun at any tile: at 8 px it is 96 rows tall, at 16 px its corridors are
  one tile in a tenth of their columns. To use it, Zerun's world grows past 96 rows or the drawing is redrawn
  with corridors at least 48 px thick at 2048 x 768. The pipeline says which; it does not redraw.
- A circuit has no entry or exit, so it cannot be a stretch of Zerun's endless course without a cut, and a cut
  is drawing. Its use in the game needs a circuit mode in the engine (laps on an authored map), which is
  Zerun's decision, not this repository's.
- The fidelity number depends on the tile: a smaller tile keeps more of a diagonal. Exact equality with an
  antialiased drawing is not possible at tile resolution; the diff picture is the thing to look at.

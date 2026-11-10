# 0009. The body decides the rises, every riser is a ramp, and the drawing stays the source

Status: accepted. Date: 2026-11-09. The owner asked for the map to be fixed, and for earlier decisions not to hold the
project back (09/11): what follows changes the rules where they were wrong.

## Context

The owner played the default map (`mapa-padrao`) in the game and found parts the runner cannot pass, and corridors too
tight to pass. Two rules caused it. A rise was judged with the jump's height and no body: a climb was passable with 3
air cells above its take-off. And every rise was treated as a stair, so a diagonal drawn as squares became steps the
body cannot climb under a low ceiling.

Measured on Zerun's engine (09/11, a held jump swept over the start column and the press tick): a 1-tile step climbs with
4 air cells above its take-off, not 3; a 2-tile ledge climbs with 5, not 4. The double jump reaches 10.34 tiles.

## Decision

- **The body decides a rise.** A rise of h tiles needs ceil(2.5 + h) air cells above its take-off, the body being 30 px
  (2.5 tiles). `PHYSICS` (zerun profiles) carries `body: 2.5` and `maxJumpUp: 10`. The `two-levels` and `circuit` profiles
  keep the physics they were measured with (`LEGACY_PHYSICS`, `CIRCUIT_PHYSICS`), so their goldens do not move.
- **A fall is a straight line.** For zerun physics a fall is judged on a straight line of passable tiles (`clearLine`); the
  L-shaped clearance stays for the other profiles.
- **Every 1-tile riser is a ramp.** `findRamps` covers every riser, not only the ones that continue a staircase. `/` and
  `\` are solid for the holes and the fidelity. The engine must read them as sloped floors (Zerun issue #38).
- **Unreachable parts are errors.** The reach is directed from the spawn: a jump or a fall goes one way, a wall both ways.
  A part of the track that no way reaches is `UNREACHABLE`, named by its rows and columns (`reachedFrom`).
- **Opening rock is a declared transformation, on by default.** Where a rise is cut off, `carveRises` opens the rock above
  its take-off. It never makes ramps, and it reports every cell it opened and the fidelity after it. On by default
  (09/11, the owner); `--no-carve` keeps the drawing exactly as drawn.
- **A climb is not a run.** The schematic takes a third kind of room, `climb`: a shaft the runner climbs by its ledges or
  its ramps, at least 4 tiles tall. Its floors are exempt from the running height, as a slide tunnel's are. Without it no
  closed lap can be built, and the arithmetic says why: a climb must reach the next floor within the 10 tiles of the
  double jump, while the running height asks for 16 tiles of air above a floor that is run along. 10 is less than 16, so
  every climb over a run was refused. The rule now says what it meant: the running height is for what the runner runs along.

## Consequences

- The default map under these rules: 37 unreachable parts; with the rock opened, 34 (343 cells; fidelity 96.1% to 90.4%).
  Opening rock does not make the drawing passable, so it needs a redraw or a schematic. The harness records the findings
  without accepting them. A drawing cannot say which part is a climb and which is a run, so a drawn track is judged as all
  run: that is the cost of a sketch, and the reason the schematic exists.
- A lap track that passes every rule at once is proven by `test/schematic.test.mjs`: two runs, an island between them, a
  climb shaft of three ledges nine tiles apart, and a drop shaft. 41 x 60 tiles, 2 laps through the spawn, both splits
  inside the screen, no floor short of the running height.
- The default map also has 292 of 299 floor tiles with less than 16 tiles of air above them (RUN_HEIGHT, the owner's rule
  of 08/11). That finding was accepted before; it stays in the record.
- The example ring (`schematics/zerun/exemplo-anel-com-corda.json`) has two parts cut off at the top (row 17): it is not
  ok until it is redrawn.
- Not measured here: a ramp in the engine (issue #38). The templates with ramps are not loaded in the game until it reads
  `/` and `\`.

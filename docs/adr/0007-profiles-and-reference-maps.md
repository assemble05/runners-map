# 0007. Two profiles, and the SpeedRunners maps as reference cases

Status: accepted. Date: 2026-11-07.

## Context

The owner's course piece (ADR 0003, ADR 0005) is one shape of map. The 79 SpeedRunners collision renders in
`test/fixtures/speedrunners/` (38 legacy campaign maps, 41 current race maps, 2 px per tile, white solid on
black, cropped to the route by the owner's renderer) are another: one closed track with parallel lanes, no
slab, no outer walls. The owner asked for them as test cases: the conversion must give the same output every
time, and the rules should learn from them.

## Decision

- **A profile picks the physics and the rules.** `two-levels` is the owner's piece. `circuit` is a race track.
  `--profile` on every tool; `src/config.js` holds both sets of numbers.
- **The reference maps are golden.** For every map, `test/golden/speedrunners/` keeps the rows it converts to
  and a summary of its findings (`src/validate/summary.js`: codes counted, numbers rounded, no surface ids).
  The test converts each map, compares both, and draws the rows back to an image and converts again. A change
  that alters any of the 79 outputs shows in the diff of `npm run golden:speedrunners`.
- **Air is the world only where the runner can stand.** Surfaces are built in the air region (4-connected
  non-solid tiles) that holds the most standing tiles. The other regions are pockets: sealed holes inside
  solid, a sky above a closed ceiling, an open area beside the tunnels. Without this, Boardwalk had no surface
  (its biggest air region is empty space outside the tunnels) and City Run had 72 fake networks (decorative
  holes inside solid). The two-levels profile gets the same rule; its fixtures were unchanged by it.
- **The circuit rules, calibrated on the 41 current maps** (`node scripts/measure-maps.mjs`, reach 12 up and
  24 across): every map keeps at least 91% of its surfaces in one network and offers two or more surfaces in
  at least 87% of its columns; at most 2 dead ends and 4 bridges remain. So: `FRAGMENTED` below a 90% network
  share and `SINGLE_LANE` below 80% two-lane columns are errors; `ISOLATED`, `DEAD_END`, `BRIDGE`, `FEW_LANES`
  (below 30% three-lane columns; the maps have at least 40%) and `POCKETS` are warnings. At Zerun's reach (6 up,
  8 across) the same maps still hold the network and the lanes but carry up to 3 dead ends and 11 bridges,
  which is why the circuit reach is the larger one.
- **The legacy maps are conversion cases only.** They are campaign levels with separate rooms; many fail
  `FRAGMENTED` or `SINGLE_LANE`, and the golden files record that. No rule is tuned to make them pass.

## Consequences

- Converting a SpeedRunners render needs `--tile 2`; a map drawn for Zerun keeps 12. The fixtures are 347 KB.
- The reach of the circuit profile is a model of a game with a hook and boosts, not Zerun's. A Zerun track
  validated as a circuit should pass its own physics too (`--physics` is not a flag; change `src/config.js`
  by an ADR).
- The renders are cropped, so the horizontal seam where a SpeedRunners track loops is not in them; the
  circuit profile does not check that a track closes. When full tilemaps are available, that is the next rule.

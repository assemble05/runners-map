# Findings

Every rule the validator applies is a finding with a code. Errors reject the map; warnings do not. The numbers
(5%, 40%, the reach of a jump, the extremity zone, the network share, the headroom, the world's rows, the
fidelity floor) are in `src/config.js`; the reasons are in ADR 0003, ADR 0004, ADR 0005, ADR 0007 and ADR 0008.
The owner's statement of the branch rules is kept verbatim in `docs/product/branch-rules.pt-BR.md`.

The profile (`--profile two-levels`, the default of `convert`; `zerun-circuit`, the default of `import`; `circuit`; or `zerun-laps`) decides which rules run and how severe a shared finding is: `ISOLATED`, `DEAD_END` and `BRIDGE` are
errors for a two-level piece and warnings for a circuit, because the reference race maps carry a few of each.

## Every profile

| Code | Severity | Meaning | Fix |
| --- | --- | --- | --- |
| `IMAGE` | warning | The image is not a multiple of the tile; the remainder was dropped. | Resize to a multiple of the tile. |
| `LOW_CEILING` | warning | Standing tiles with room to slide but not to stand (Zerun: 2 tiles of air, not 3). | Raise the ceiling or the platform by a tile, or accept a slide section. |
| `CRUSHED` | warning | Tiles over a floor too low even to slide through (Zerun: 1 tile of air); left out of the graph. | Redraw the corridor thicker, or use a smaller tile. |
| `TOO_TALL` | error | The piece is taller than the game's world (Zerun: 60 rows). Zerun profiles only. | Use a bigger tile, a shorter drawing, or raise the world in the engine. |
| `LOW_FIDELITY` | error | The tiles keep less of the drawing than `minFidelity` (97%). Import only. | Use a smaller tile or a cleaner drawing; look at the diff picture. |
| `STUB` | warning | Dead-end corridors left as drawn (`--dead-ends keep`). Import only. | Treat them with `barrier` or `fill`, or redraw. |

## Two-levels profile

| Code | Severity | Meaning | Fix |
| --- | --- | --- | --- |
| `LAYOUT` | error | No outer walls, or no slab: the levels could not be told apart. | Paint solid columns at both ends and a solid row across the middle, or pass `--split-row`. |
| `ISOLATED` | error | A surface cannot be reached from the rest of the map. | Join it with a jump, a drop or a wall, or remove it. |
| `DEAD_END` | error | A surface has fewer than two links: the player would have to come back the same way. | Give it a second way out at a different place. |
| `BRIDGE` | error | A link is the only connection between two parts of the map. | Add a second route around it. |
| `LEAK` | error | A connection between the levels outside the extremity zones. | Close the hole in the slab, or move the shaft to an end. |
| `NO_WALL` | error | An extremity has no climbable wall joining the levels. | Open the shaft next to the outer wall on that side. |
| `LEVEL_CUT` | error | A level cannot be crossed from its left end to its right end without leaving it. | Join the parts of the level. |
| `BRANCH_DEAD_END` | error | A branch attaches to the main route at fewer than two places. | Make it come back to the main route somewhere else. |
| `BRANCH_WALL` | error | A branch uses a wall climb. | Only the extremity walls are climbed; make the branch jumps and drops. |
| `BRANCH_CROSSES` | error | A branch touches the other level. | Keep the branch inside its level. |
| `BRANCH_SHORT` | error | A branch spans less than 5% of the level. | Lengthen it. |
| `BRANCH_LONG` | error | A branch spans more than 40% of the level. | Shorten it or split it in two. |
| `NO_BRANCH` | error | A level has no branch. | Add one: a platform or a detour with two attachments. |
| `MAIN_CLIMB` | warning | The main route of a level climbs a wall. | Fine if intended; the extremity walls should be the only climbs. |
| `BRANCHES_CLUSTERED` | warning | All branches of a level sit in the same third of it. | Spread them out. |
| `BRANCHES_SAME_LENGTH` | warning | All branches of a level have the same length. | Vary them. |

## Circuit profiles (`circuit`, `zerun-circuit`)

| Code | Severity | Meaning | Fix |
| --- | --- | --- | --- |
| `NO_SURFACES` | error | Nothing to stand on: nothing is white over black, or the tile size is wrong. | Check the image, `--tile` and `--white-is-air`. |
| `FRAGMENTED` | error | The main network holds less than 90% of the surfaces. | Join the detached parts, or remove them. |
| `SINGLE_LANE` | error | Fewer than 80% of the columns offer two or more surfaces. | Add a second lane: a platform above or a floor below the track. |
| `ISOLATED` | warning | Surfaces outside the main network. | Join them or remove them. |
| `DEAD_END` | warning | Surfaces with one way in or out. | Give each a second way out, unless it is a deliberate pocket. |
| `BRIDGE` | warning | Moves that are the only link between two parts. | Add a second route around each. |
| `FEW_LANES` | warning | Fewer than 30% of the columns offer three or more surfaces; the reference maps have at least 40%. | Add a third lane where the track is long and flat. |
| `POCKETS` | warning | Sealed air regions were ignored (ADR 0007). | Nothing, unless a pocket was meant to be reachable. |

## Lap profile (`zerun-laps`)

The closed circuit played lap after lap (08/11, the owner). Same physics and world as `zerun-circuit`. Lanes are not
judged and holes are never judged; two findings replace the lane rules. The count of ways round (`maxRoutes`, 64) is a
proposal in `src/config.js`, to be confirmed by the owner.

| Code | Severity | Meaning | Fix |
| --- | --- | --- | --- |
| `ROUTES` | error | More ways round the track from the spawn point than `maxRoutes`. The game alternates between them from lap to lap, so the count must stay small. | Remove a split, or join two of them. |
| `SCREEN` | error | A split whose box is wider than 26 tiles or taller than 15 (the 320 x 180 px screen at 12 px a tile): the runner cannot see both ways at once. | Bring the junctions of the split closer together, or shrink the pocket it goes round. |
| `START` | error | The spawn point (the floor at the left end of the track) is not on a way round the track: it sits on a dead end, or off the track. | Put the left end of the track on a loop. |
| `RUN_HEIGHT` | error | A floor tile with less air above it than the running height: 1.5 x the double jump's apex, 10.34 tiles measured on the engine, so 16 tiles. | Make the passage taller: the runner must be able to double jump under the ceiling. |

## How laps are measured (zerun-laps)

The passable air is thinned to a one-tile centreline (Zhang-Suen, as stubs do); a diagonal step is one link. Junctions
and ends are the nodes, and dead ends are pruned again and again: a branch that stops is not a way round. A route is a
simple cycle of what is left. The spawn point is the floor at the left end of the track (the lowest one if several share
that column), the entry the template uses. ROUTES counts the simple cycles through the centreline tile nearest to it: the
laps. A split is a pocket of enclosed rock whose edge holds two or more junctions; its box is the pocket and one tile of
corridor round it. The owner chose this box on 08/11: the stricter box, with both options whole, leaves no choice that fits a 15-tile screen when the passages are 16 tiles tall.

## The running height (zerun-laps)

Every floor tile of the track is a part the runner runs through (08/11, the owner), so the air above each one must reach
1.5 x the double jump's apex. The apex is 10.34 tiles, measured on Zerun's engine: the best double jump of the current
code, the first jump held 16 ticks and the second pressed one tick after the release. A comment in Zerun's
`FixedCourseGeneratorService` says 7.8; the code does not give that, and with 7.8 the height would be 12 tiles. The air
is counted up to the first solid tile; a platform is passed through, so it is not a ceiling. Sixteen tiles is taller than
the 15-tile screen, so such a passage cannot be seen whole at once. The owner accepted that on 08/11.

## The routes of a lap (zerun-laps)

The circuit is played in place (08/11, the owner, after chained copies of the laps overlapped): the lap changes what is
open, not where the runner is. `node tools/routes.mjs <template.js> [--out routes.json] [--limit 64]` writes, for each
way round the track through the spawn, the data the game needs: the route's centreline cells in travel order, each with a
heading (right, down, left, up: the camera follows the leader's heading); its corridor, every air cell nearer to the route
than to the rest of the track, as row runs; and its gates, the air cells just outside the corridor, which close the other
branches for that lap. The lap line is the corridor's cross-section at the start, crossed in the lap heading. A route
leaves the start to the right when it can, else upward; the routes are ordered by length. `sealed` says whether closing
the gates keeps the runner inside the corridor; the command exits 1 when a lap is not sealed. The spawn is the circuit's
own (the air above the floor at the left end of the track). Each route also carries its `clearance`: the air column
through each of its cells, as the share with 3 tiles or more (the runner stands), the count with 2 (slide only) and the
count with 1 (crushed: the runner cannot pass). A route with a crushed cell is not runnable; the command names the
passable routes and the one with the most standing room.

## The schematic (zerun-laps)

A track can be drawn as rooms and corridors instead of a sketch (08/11, the owner):
`node tools/schematic.mjs <schematic.json> [--out dir] [--run-height N]`. The file lists rectangles of air,
`{ "kind": "run" | "slide", "col", "row", "cols", "rows" }`, with columns and rows from 1 (column 0 and row 0 are rock)
and the last world row kept as rock. The air is the union of the rectangles; the rest is rock. A `run` rectangle is a
part the runner runs through, and the floors under it must have the running height above them. A `slide` rectangle is a
low tunnel: it must be at least 2 tiles tall, and the floors under it are exempt from the running height. The command
writes `<name>.template.js` and `<name>.report.json`, and it runs the same findings as the drawing.

| Code | Severity | Meaning | Fix |
| --- | --- | --- | --- |
| `SCHEMATIC` | error | The file is not a schematic: no rectangle list, an unknown kind, a value that is not an integer, or a rectangle outside the world. Nothing is generated. | Fix the rectangle the message names. |
| `SLIDE_LOW` | error | A slide tunnel is shorter than the 2 tiles the runner needs to slide through. | Make the tunnel 2 tiles tall or more, or make it a run rectangle. |

## How a branch is measured (two-levels)

The main route of a level is the route from its left connector to its right connector that stays lowest. What is
left of the level after removing the main route is split into connected groups; each group is a branch. A branch
attaches to the main route through links; two links that leave and land within a tile of each other are one
attachment. The length is the horizontal extent of the branch, from the column it leaves the main route to the
column it comes back, divided by the width of the level between the outer walls.

## How lanes are measured (circuit)

For every column that holds at least one surface, count the surfaces stacked in it. The two-lane share is the
part of those columns with two or more; the three-lane share, with three or more.

## How a dead-end corridor is found and treated (import)

The world air is thinned to a one-tile skeleton. An endpoint of the skeleton is a corridor that stops; the path
from it to the first junction is the stub and its length the depth; spurs shorter than the median corridor height
(at least `minStubDepth`, 3) are corners. The mouth is the corridor's cross-section at the junction. `barrier`
puts a `W` on every mouth tile; `fill` turns the stub's air to rock; `keep` reports it. The preview tints a
treated stub's air brown and a barrier magenta.

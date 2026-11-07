# Findings

Every rule the validator applies is a finding with a code. Errors reject the map; warnings do not. The numbers
(5%, 40%, the reach of a jump, the extremity zone, the network share) are in `src/config.js`; the reasons are in
ADR 0003, ADR 0004, ADR 0005 and ADR 0007. The owner's statement of the branch rules is kept verbatim in
`docs/product/branch-rules.pt-BR.md`.

The profile (`--profile two-levels`, the default, or `--profile circuit`) decides which rules run and how
severe a shared finding is: `ISOLATED`, `DEAD_END` and `BRIDGE` are errors for a two-level piece and warnings
for a circuit, because the reference race maps carry a few of each.

## Both profiles

| Code | Severity | Meaning | Fix |
| --- | --- | --- | --- |
| `IMAGE` | warning | The image is not a multiple of the tile; the remainder was dropped. | Resize to a multiple of the tile. |

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

## Circuit profile

| Code | Severity | Meaning | Fix |
| --- | --- | --- | --- |
| `NO_SURFACES` | error | Nothing to stand on: nothing is white over black, or the tile size is wrong. | Check the image and `--tile`. |
| `FRAGMENTED` | error | The main network holds less than 90% of the surfaces. | Join the detached parts, or remove them. |
| `SINGLE_LANE` | error | Fewer than 80% of the columns offer two or more surfaces. | Add a second lane: a platform above or a floor below the track. |
| `ISOLATED` | warning | Surfaces outside the main network. | Join them or remove them. |
| `DEAD_END` | warning | Surfaces with one way in or out. | Give each a second way out, unless it is a deliberate pocket. |
| `BRIDGE` | warning | Moves that are the only link between two parts. | Add a second route around each. |
| `FEW_LANES` | warning | Fewer than 30% of the columns offer three or more surfaces; the reference maps have at least 40%. | Add a third lane where the track is long and flat. |
| `POCKETS` | warning | Sealed air regions were ignored (ADR 0007). | Nothing, unless a pocket was meant to be reachable. |

## How a branch is measured (two-levels)

The main route of a level is the route from its left connector to its right connector that stays lowest. What is
left of the level after removing the main route is split into connected groups; each group is a branch. A branch
attaches to the main route through links; two links that leave and land within a tile of each other are one
attachment. The length is the horizontal extent of the branch, from the column it leaves the main route to the
column it comes back, divided by the width of the level between the outer walls.

## How lanes are measured (circuit)

For every column that holds at least one surface, count the surfaces stacked in it. The two-lane share is the
part of those columns with two or more; the three-lane share, with three or more.

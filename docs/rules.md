# Findings

Every rule the validator applies is a finding with a code. Errors reject the map; warnings do not. The numbers
(5%, 40%, the reach of a jump, the extremity zone) are in `src/config.js`; the reasons are in ADR 0003, ADR 0004
and ADR 0005. The owner's statement of the branch rules is kept verbatim in `docs/product/branch-rules.pt-BR.md`.

## Errors

| Code | Meaning | Fix |
| --- | --- | --- |
| `LAYOUT` | No outer walls, or no slab: the levels could not be told apart. | Paint solid columns at both ends and a solid row across the middle, or pass `--split-row`. |
| `ISOLATED` | A surface cannot be reached from the rest of the map. | Join it with a jump, a drop or a wall, or remove it. |
| `DEAD_END` | A surface has fewer than two links: the player would have to come back the same way. | Give it a second way out at a different place. |
| `BRIDGE` | A link is the only connection between two parts of the map. | Add a second route around it. |
| `LEAK` | A connection between the levels outside the extremity zones. | Close the hole in the slab, or move the shaft to an end. |
| `NO_WALL` | An extremity has no climbable wall joining the levels. | Open the shaft next to the outer wall on that side. |
| `LEVEL_CUT` | A level cannot be crossed from its left end to its right end without leaving it. | Join the parts of the level. |
| `BRANCH_DEAD_END` | A branch attaches to the main route at fewer than two places. | Make it come back to the main route somewhere else. |
| `BRANCH_WALL` | A branch uses a wall climb. | Only the extremity walls are climbed; make the branch jumps and drops. |
| `BRANCH_CROSSES` | A branch touches the other level. | Keep the branch inside its level. |
| `BRANCH_SHORT` | A branch spans less than 5% of the level. | Lengthen it. |
| `BRANCH_LONG` | A branch spans more than 40% of the level. | Shorten it or split it in two. |
| `NO_BRANCH` | A level has no branch. | Add one: a platform or a detour with two attachments. |

## Warnings

| Code | Meaning | Fix |
| --- | --- | --- |
| `IMAGE` | The image is not a multiple of the tile; the remainder was dropped. | Resize to a multiple of 12. |
| `MAIN_CLIMB` | The main route of a level climbs a wall. | Fine if intended; the extremity walls should be the only climbs. |
| `BRANCHES_CLUSTERED` | All branches of a level sit in the same third of it. | Spread them out. |
| `BRANCHES_SAME_LENGTH` | All branches of a level have the same length. | Vary them. |

## How a branch is measured

The main route of a level is the route from its left connector to its right connector that stays lowest. What is
left of the level after removing the main route is split into connected groups; each group is a branch. A branch
attaches to the main route through links; two links that leave and land within a tile of each other are one
attachment. The length is the horizontal extent of the branch, from the column it leaves the main route to the
column it comes back, divided by the width of the level between the outer walls.

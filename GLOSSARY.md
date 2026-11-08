# Glossary

| Term | Meaning |
| --- | --- |
| **drawing** | The attached picture a map starts from. White rock on black air (the default), or a corridor drawing read with `--white-is-air`: white is the path, black is rock. The harness converts it; it never draws. |
| **map** | One image of a course: white solid, black empty, optionally mid grey for thin platforms. It becomes one or more templates. |
| **tile** | A square cell of the map: 12 x 12 px for a Zerun piece, 2 x 2 px in the SpeedRunners renders, N px for an attached drawing (`--tile`). Solid (`#`), platform (`=`, thin: stand on it, jump up through it) or empty (`.`). |
| **mark** | A Zerun entity or hazard character kept on a tile and written back: `W` barrier, `B` box, `c` coin, `P` power, `s` skull, `N` npc, `K` skeleton, `t` torch, `^` `v` spikes, `-` laser, `>` boost. A barrier or a box blocks the runner. |
| **template** | The object Zerun's `TemplateUtil` holds: `name`, `difficulty`, `weight`, `entryRow`, `exitRow` and `rows` of tile characters. Generated from the map (ADR 0002). |
| **profile** | The physics and the rules a map is judged by: **two-levels** (the owner's course piece), **circuit** (a race track with SpeedRunners' reach) or **zerun-circuit** (a race track with Zerun's reach, headroom and world). ADR 0007, ADR 0008. |
| **import** | The whole road from a drawing to templates: tiles, fidelity, stubs, openings, variants, validation, files (ADR 0008). |
| **fidelity** | The share of the drawing's pixels the tiles keep, measured by drawing the tiles back at the drawing's size and comparing cell by cell. The diff picture shows the rest. |
| **headroom** | Passable tiles from a standing tile upward, it included. Zerun: 3 to stand, 2 to slide, 1 is crushed. |
| **level** | Two-levels: one of the two floors, **lower** on the floor and **upper** on the slab. A surface belongs to the level of the tile it stands on. |
| **slab** | The solid row that separates the levels: the floor of the upper level and the ceiling of the lower one. It leaves a shaft open at each end. |
| **shaft** | The open column between the slab's end and an outer wall. The runner climbs the outer wall through it, or drops down it. |
| **outer walls** | The solid columns at the left and right ends of a two-level map. The only connections between the levels (ADR 0003). |
| **extremity zone** | The first and last `extremityCols` columns inside the outer walls. A connection between the levels is allowed only there. |
| **world air** | The region of passable tiles (4-connected) that holds the most standing tiles. Surfaces exist only there. |
| **pocket** | Any other air region: a hole sealed in solid, a sky over a closed ceiling, open space beside the tunnels, the air behind a barrier. Ignored, counted. |
| **surface** | A node of the graph: a maximal horizontal run of tiles the runner can stand in (an air tile with headroom over a solid or platform tile). |
| **move** | An edge of the graph: a jump, a drop or a wall climb from one surface to another, with the columns it leaves from and lands on. |
| **link** | The moves between two surfaces that leave and land within a tile of each other, counted as one. Degrees, bridges and attachments count links (ADR 0004). |
| **network** | A set of surfaces joined by links. The **main network** is the largest one; its **share** is its part of all surfaces. |
| **lane** | Circuit: a surface stacked in a column. The **two-lane share** is the part of the used columns with two or more surfaces. |
| **main route** | Two-levels: per level, the route from the left connector to the right connector that stays lowest. |
| **connector** | A surface of a level joined to the other level at an extremity. |
| **branch** | Two-levels: a group of surfaces off the main route. It must attach to the main route at two places, stay in its level and span 5% to 40% of the level (ADR 0005). |
| **attachment** | A link between a branch and the main route of its level. |
| **length of a branch** | Its horizontal extent in tiles, from the column it leaves the main route to the column it comes back, in tiles of the level's width. |
| **dead end** | A surface with fewer than two links, or a branch with fewer than two attachments: the player would have to come back the same way. |
| **stub** | A corridor that stops: an endpoint of the air's skeleton and the path back to the first junction. Its **mouth** is the corridor's cross-section at the junction; its **depth** the path's length. Found on the shape, not the graph (ADR 0008). |
| **treatment** | What `import` does with a sealed stub: `barrier` (a `W` on every mouth tile; the pocket becomes decoration), `fill` (rock) or `keep` (reported). |
| **opening** | A run of world air on the left or right border: a corridor that reaches the edge, with the floor it stands on. |
| **topology** | `stretch`: at least one opening on each side, it enters on the left and leaves on the right; `circuit`: none, a closed loop. |
| **variant** | One template of a stretch per (entry, exit) pair of openings, the other openings closed; a circuit is one variant, itself. |
| **bridge** | A link whose removal splits the graph. A map with a bridge has a route the player must retrace. |
| **leak** | A connection between the levels outside the extremity zones. |
| **finding** | What the validator reports: an error (the map is rejected) or a warning, each with a code in `docs/rules.md`. |
| **reference maps** | The 79 SpeedRunners collision renders in `test/fixtures/speedrunners/`, with golden rows and findings. |
| **preview** | The PNG the renderer writes: tiles, surfaces by role, moves by type, treated stubs and barriers. |

# Glossary

| Term | Meaning |
| --- | --- |
| **map** | One image of a course: white solid, black empty, optionally mid grey for thin platforms. It becomes one template. |
| **tile** | A square cell of the map: 12 x 12 px for a Zerun piece, 2 x 2 px in the SpeedRunners renders (`--tile`). Solid (`#`), platform (`=`, thin: stand on it, jump up through it) or empty (`.`). |
| **template** | The object Zerun's `TemplateUtil` holds: `name`, `difficulty`, `weight`, `entryRow`, `exitRow` and `rows` of tile characters. Generated from the map (ADR 0002). |
| **profile** | The physics and the rules a map is judged by: **two-levels** (the owner's course piece) or **circuit** (a race track like SpeedRunners'). ADR 0007. |
| **level** | Two-levels: one of the two floors, **lower** on the floor and **upper** on the slab. A surface belongs to the level of the tile it stands on. |
| **slab** | The solid row that separates the levels: the floor of the upper level and the ceiling of the lower one. It leaves a shaft open at each end. |
| **shaft** | The open column between the slab's end and an outer wall. The runner climbs the outer wall through it, or drops down it. |
| **outer walls** | The solid columns at the left and right ends of a two-level map. The only connections between the levels (ADR 0003). |
| **extremity zone** | The first and last `extremityCols` columns inside the outer walls. A connection between the levels is allowed only there. |
| **world air** | The region of non-solid tiles (4-connected) that holds the most standing tiles. Surfaces exist only there. |
| **pocket** | Any other air region: a hole sealed in solid, a sky over a closed ceiling, open space beside the tunnels. Ignored, counted. |
| **surface** | A node of the graph: a maximal horizontal run of tiles the runner can stand in (an empty world tile over a solid or platform tile). |
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
| **bridge** | A link whose removal splits the graph. A map with a bridge has a route the player must retrace. |
| **leak** | A connection between the levels outside the extremity zones. |
| **finding** | What the validator reports: an error (the map is rejected) or a warning, each with a code in `docs/rules.md`. |
| **reference maps** | The 79 SpeedRunners collision renders in `test/fixtures/speedrunners/`, with golden rows and findings. |
| **preview** | The PNG the renderer writes: tiles, surfaces by role and moves by type. |

# 0004. The map is a graph of surfaces and moves

Status: accepted. Date: 2026-11-07.

## Context

Pixels say nothing about what a runner can do. The questions that matter (is every place reachable, is there a
dead end, is there a route you must retrace, where do the levels join) are graph questions, and they need nodes
that are places a player recognizes, not pixels.

## Decision

- A **surface** is a node: a maximal horizontal run of empty tiles over solid or platform tiles.
- A **move** is an edge: a jump, a drop or a wall climb between two surfaces, with the column it leaves from and
  the column it lands on.
- A jump or drop is an **L**: horizontal then vertical, or vertical then horizontal, through tiles that are not
  solid; thin platforms are passed through. The L is an approximation of the arc that errs on the safe side
  for walls and floors. Reach: up to `maxJumpUp` (6) rows, across up to `maxJumpAcross` (8) tiles, on an ellipse
  for upward jumps; drops are unlimited in height. A drop off an end starts one tile past the end and falls
  straight down.
- A **wall climb** links every surface touching the open column beside a solid column of at least
  `minWallHeight` (2) tiles, or the column beyond it, from the base up. The runner wall-jumps up the solid side.
- Two reach profiles: the conservative one (8 across) proves a route exists; the full-speed one (11 across,
  Zerun's "11 tiles across at full speed") catches a leak between the levels. A route is never assumed, a leak
  is never missed.
- Moves between the same two surfaces that leave and land within a tile of each other are one **link**. Jumping
  into a pocket and dropping back out at the same column is one way in and out; the left end and the right end
  of a platform over a floor are two. Degrees, bridges and attachments count links.

## Consequences

- The graph is small (tens of surfaces), so the pairwise search is fine. A huge map would need bounding boxes.
- The physics is a model of Zerun's, not Zerun's engine. When the engine's numbers change, `src/config.js`
  changes and the golden template is regenerated. Playing the map in the game is still the last check.

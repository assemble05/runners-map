# 0003. Two levels, joined only by the two outer walls

Status: accepted. Date: 2026-11-07.

## Context

The owner's course piece is two levels stacked, like Zerun's loop: the runner crosses the lower level, climbs the
wall at one end, crosses the upper level the other way and drops down the wall at the other end. The owner's rule
of highest priority is that nothing else joins the levels, and that branches never cross them
(`docs/product/branch-rules.pt-BR.md`, item 5).

## Decision

- The outer walls are the leftmost and rightmost solid columns; their longest solid run is the wall.
- The slab separates the levels: the interior row with the most standable tiles (at least half of the width,
  `separatorFill`) that is neither the ceiling nor the floor; ties go to the row nearest the middle.
  `--split-row` forces it.
- A surface belongs to the level of the tile it stands on: on or above the slab is **upper**, below is **lower**.
- The extremity zones are the first and last `extremityCols` (3) columns inside the walls. A move between the
  levels is allowed only in a zone, and each zone must hold a wall climb; a move between the levels anywhere else
  is a `LEAK`, a zone without a climb is `NO_WALL`.
- A drop down a shaft is also a move between the levels; it is allowed in the zones because the climb is what
  makes the way back. The wall is the connection; the drop comes with it.

## Consequences

- A map with three levels, or with the levels side by side, is not described by this ADR; it is rejected as
  `LAYOUT` or `LEAK`.
- The names lower and upper are positions, not the owner's "Nível 1" and "Nível 2": those are not tied to a
  position in the statement, so the report uses positions.

---
name: image-compare
description: Prove that a converted map matches its drawing, pixel by pixel, with runners-map's compare: the fidelity share, the count and bounding box of the pixels that differ, and a diff picture. Use when someone asks whether the map is identical to the image, how much was lost, where, or which tile size keeps more.
license: MIT
compatibility: Node 20 or newer. No dependency.
---

# image-compare

The question "is the map 100% the drawing?" has two honest answers (ADR 0008):

- **Exact**: the rows drawn back as an image and converted again give the same rows. That is what the goldens
  check; the game map and the tile picture are one thing.
- **Measured**: against the drawing itself, at tile resolution, an antialiased diagonal cannot be kept pixel for
  pixel. The share kept is the fidelity; the diff picture shows the rest. Report the number and the picture,
  never "identical".

## Do

1. `node tools/compare.mjs <drawing.png> <rows.txt|template.js> --tile <N> [--white-is-air] --out <name>.diff.png`.
   Use the same tile and the same color reading the map was imported with.
2. Read the line it prints: `fidelity 98.3%: 31 872 of 1 572 864 pixels differ, 0 cropped; box rows 112-640,
   cols 48-2040 (px)`. Exit code 1 means under 97% (`--min-fidelity` changes the floor).
3. Open the diff: grey is kept rock, black kept air, **red** is drawn but lost by the tiles, **blue** is added by
   the tiles, purple is the cropped remainder of an image that is not a multiple of the tile.
4. Decide what the red and blue are: edges of diagonals (expected at this tile; a smaller tile keeps more), a
   feature thinner than a tile (redraw it thicker, or use a smaller tile), or a stub filled on purpose
   (`--dead-ends fill`; expected and listed in the report).
5. Report: the tile, the fidelity, the count, the box, what the differences are, and whether a smaller tile or a
   redraw is the fix. Attach the diff.

## Do not

- Call a map identical to its drawing. Give the number and the picture.
- Change the drawing or the rows to make the number higher.
- Compare with a different tile size or color reading than the import used; the numbers would not be about the
  same map.

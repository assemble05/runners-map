# 0002. The image is the source; the template is generated

Status: accepted. Date: 2026-11-07.

## Context

Zerun's stretches are hand-written rows of characters in `TemplateUtil`. Drawing is faster than typing rows, an
image can come from any editor or generator, and a picture is what a person judges. But the game reads tiles, and
an image generator does not know the rules of the course.

## Decision

- A map is a PNG: white solid, black empty, transparent empty; with `--platform-gray`, a mid grey (96 to 160 of
  luminance) is a thin platform. The threshold is 128.
- 12 px per tile, the tile of Zerun. A tile is solid or platform when at least half of its pixels are
  (`coverage` 0.5), so antialiasing and a brush a pixel off the grid do not matter. An image that is not a
  multiple of 12 is cropped with a warning.
- The converter writes the template module (`export const template`, the shape of `TemplateUtil.TEMPLATES`)
  and the analysis next to it. The module says it is generated and is never edited by hand: edit the image and
  convert again.
- The entry and the exit default to the floor of the lower level. The game decides headings through the loop;
  the analysis (levels, walls, branches) is there for it to derive them. Headings are out of scope here.
- A map can also be written as rows (`.rows.txt`), the text form of the same tiles, for fixtures and sketches;
  `tools/rows-to-png.mjs` draws the image from it so the image path is the one tested.

## Consequences

- A map changes by redrawing. Diffs are pictures and rows, not edits to a module.
- The PNG decoder is small and reads non-interlaced images only; an interlaced file is refused with a message.

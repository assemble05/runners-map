# runners-map

Draw a course piece as an image, get the game's template back, with proof that it plays.

A map is white shapes on black, 12 px per tile, two levels stacked and joined only by the climbable walls at
its two ends. The converter turns the image into tiles, reads the surfaces a runner can stand on and the moves
between them, and checks the rules: one network, no dead end, no route you must retrace, exactly two ways between
the levels, and in each level branches that leave the main route and come back, each 5% to 40% of the level wide.
It then writes the template module Zerun's `TemplateUtil` understands, a JSON report and a preview picture.

```
node tools/convert.mjs map.png --out records        template .js, report .json, preview .png (exit 1 if invalid)
node tools/validate.mjs map.png                      findings only
node tools/render.mjs map.png --out preview.png      look at what the validator saw
node tools/rows-to-png.mjs map.rows.txt map.png      sketch a map in text, turn it into the image
npm run check                                        tests and the harness check
```

No dependency: Node 20+ and nothing else.

## Drawing a map

- White is solid, black is empty. With `--platform-gray`, a mid grey (96 to 160) is a thin platform.
- 12 px per tile; a tile is solid when at least half of it is painted. Keep the image a multiple of 12.
- Solid columns at the left and right ends, the full height: the outer walls.
- A solid row across the middle, the slab, that stops one or two tiles short of each outer wall: the shafts.
- In each level, at least one branch: a platform or a detour the runner can take and leave again, 5% to 40% of
  the level wide, joined to the main route at two different places. Not a pocket: a pocket is a dead end.
- Nothing else joins the levels. A hole in the slab is a leak.

The findings are explained in `docs/rules.md`. The reasons behind the rules are in `docs/adr/`.

## Output

`records/<name>.template.js` exports `template` (the Zerun shape) and `analysis` (levels, main routes, branches,
walls, findings). `records/<name>.report.json` is the analysis alone. `records/<name>.preview.png` shows tiles,
surfaces (green main route, blue branch, red finding) and moves (yellow wall climb, grey jump or drop).

# runners-map

Attach a drawing of a course, get the game's templates back, with proof that they play and a picture of what
the tiles kept. The harness converts; it never draws.

A map is a picture: white rock on black air, or with `--white-is-air` a corridor drawing where white is the
path. The import turns it into tiles, measures how much of the drawing the tiles keep, finds the corridors that
stop and turns them into decoration, finds the ways in and out and makes one map per pair, checks the rules of
a profile with the target game's physics, and writes for each variant the template module Zerun's `TemplateUtil`
understands, a JSON report and a preview; for the drawing, an account and a diff picture.

```
node tools/measure.mjs drawing.png --white-is-air              which tile size fits the runner and the world
node tools/import.mjs drawing.png --white-is-air --tile 8      the whole road; templates under records/
node tools/compare.mjs drawing.png records/map.template.js --tile 8 --white-is-air   fidelity and diff of any rows
node tools/convert.mjs map.png --out records                   one map, one profile, no import steps
node tools/validate.mjs map.png                                findings only
node tools/render.mjs map.png --out preview.png                look at what the validator saw
node tools/rows-to-png.mjs map.rows.txt map.png                sketch a map in text, turn it into the image
npm run check                                                  tests and the harness check
```

No dependency: Node 20+ and nothing else.

## Profiles (ADR 0007, ADR 0008)

- **two-levels** (default of `convert`): the owner's course piece, 12 px per tile. Two levels stacked and joined
  only by the climbable walls at the ends; one network, no dead end, no route you must retrace; in each level
  branches that leave the main route and come back, each 5% to 40% of the level wide.
- **zerun-circuit** (default of `import`): a race track with Zerun's reach, headroom (3 tiles to stand, 2 to
  slide) and world (60 rows). One network, two lanes in most columns.
- **circuit**: the same rules with SpeedRunners' reach, for the 79 reference maps kept as golden test cases.

## What the import reports

- **Fidelity**: the tiles drawn back at the drawing's size, compared cell by cell. Under 97% the import fails.
  `<name>.diff.png` paints what was lost in red and what was added in blue.
- **Corridors** against the runner, **rows** against the world: `measure` says which tile sizes fit both, or what
  to change when none does.
- **Stubs**: dead-end corridors found on the shape. By default a barrier closes each one (`W` tiles, which Zerun
  already has) and the pocket becomes decoration; `--dead-ends fill` turns it to rock; `keep` reports it.
- **Topology and variants**: a drawing that reaches both borders is a stretch, one template per (entry, exit)
  pair; a closed drawing is a circuit, one template, which Zerun's engine does not run yet.

## Drawing a two-level map

- White is solid, black is empty. With `--platform-gray`, a mid grey (96 to 160) is a thin platform.
- 12 px per tile; a tile is solid when at least half of it is painted. Keep the image a multiple of 12.
- Solid columns at the left and right ends, the full height: the outer walls.
- A solid row across the middle, the slab, that stops one or two tiles short of each outer wall: the shafts.
- Seven rows of air in each level, so a branch three tiles over the floor leaves three tiles under the ceiling.
- In each level, at least one branch: a platform or a detour the runner can take and leave again, 5% to 40% of
  the level wide, joined to the main route at two different places. Not a pocket: a pocket is a dead end.
- Nothing else joins the levels. A hole in the slab is a leak.

## Reference maps and drawings

`test/fixtures/speedrunners/` holds 38 legacy and 41 current SpeedRunners maps as 2 px per tile renders of their
collision layer; `test/golden/speedrunners/` holds the rows each converts to and a summary of its findings.
`test/fixtures/drawings/` holds the attached drawings; `test/golden/drawings/` their rows and import accounts.
The tests convert every one and compare; a change shows as a diff after `npm run golden:speedrunners` or
`npm run golden:drawings`.

The findings are explained in `docs/rules.md`. The reasons behind the rules are in `docs/adr/`.

## Output

`records/<variant>.template.js` exports `template` (the Zerun shape) and `analysis` (levels or network, branches,
walls, lanes, stubs, fidelity, findings). `records/<variant>.report.json` is the analysis alone.
`records/<variant>.preview.png` shows tiles, surfaces (green main route or network, blue branch, red error,
orange warning), moves (yellow wall climb, grey jump or drop), treated stubs (brown) and barriers (magenta).
`records/<name>.import.json` is the account of the whole import; `records/<name>.diff.png` the fidelity picture.

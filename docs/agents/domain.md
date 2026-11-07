# Domain docs

Before exploring, read `GLOSSARY.md` and the ADRs that touch the area you are about to work in. When your
output names a domain concept (issue title, test name, finding message), use the glossary's term.

| Area | ADR |
| --- | --- |
| Where the harness came from | 0001 |
| The image, the tiles and the generated template | 0002 |
| The two levels, the slab, the outer walls, the extremity zones | 0003 |
| Surfaces, moves, links and the reach of a jump | 0004 |
| The branch rules and every two-levels finding code | 0005 |
| Why there are no dependencies | 0006 |
| The two profiles, world air and pockets, the SpeedRunners reference maps and the circuit rules | 0007 |

The owner's own statement of the branch rules: `docs/product/branch-rules.pt-BR.md`. The game this feeds:
Zerun (`TemplateUtil`, `CourseService`, `LoopTemplateUtil` in `packages/engine`), whose numbers
`src/config.js` mirrors. The measurements behind the circuit profile: `node scripts/measure-maps.mjs`.

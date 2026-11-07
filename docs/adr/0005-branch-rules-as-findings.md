# 0005. The owner's branch rules are findings with codes

Status: accepted. Date: 2026-11-07.

## Context

The owner wrote the branch rules in prose (`docs/product/branch-rules.pt-BR.md`). Prose cannot be run. Each rule
needs one reading the code applies the same way every time, and a name a person can look up.

## Decision

The reading of each rule, and its code (`docs/rules.md`):

- **Main route.** Per level, the route from its left connector to its right connector that stays lowest
  (Dijkstra, each step costs 1 plus the height of the next surface in the level). The main route is the floor
  when there is one; a branch is what hangs off it. A level without such a route is `LEVEL_CUT`.
- **Branch.** What is left of the level after removing the main route, split into connected groups. One group is
  one branch. A branch with fewer than two attachments to the main route is `BRANCH_DEAD_END` ("não podem
  existir ramificações que terminem abruptamente").
- **Length.** The horizontal extent of the branch from the column it leaves the main route to the column it
  comes back, in tiles, over the width of the level between the outer walls ("desde seu ponto de origem até sua
  reconexão com a rota principal"). Below `minBranchRatio` (5%) is `BRANCH_SHORT`, above `maxBranchRatio`
  (40%) is `BRANCH_LONG`.
- **In its level.** A branch that touches a surface of the other level is `BRANCH_CROSSES`; one that uses a
  wall climb is `BRANCH_WALL` ("nunca pode utilizar as paredes escaláveis"). A climb on a main route is a
  warning, `MAIN_CLIMB`, because the statement forbids it for branches and the extremity walls are the climbs.
- **At least one.** A level with no branch is `NO_BRANCH` (`minBranchesPerLevel` 1): "cada nível deve possuir
  sua própria rede de ramificações".
- **Soft rules.** "Distribuir em diferentes regiões" and "variar seus comprimentos" are warnings:
  `BRANCHES_CLUSTERED` when every branch of a level sits in the same third of it, `BRANCHES_SAME_LENGTH` when
  they all have the same length. "Geometrias variadas" is not checked: it is a matter of taste.
- **Whole map.** One network (`ISOLATED`), no surface with fewer than two links (`DEAD_END`), no link whose
  removal splits the map (`BRIDGE`): "nenhum caminho sem saída". Exactly two connections between the levels,
  both at the extremities and both with a climbable wall (`LEAK`, `NO_WALL`, ADR 0003).

## Consequences

- A rule changes by changing its reading here, its code in `src/validate/rules.js`, its line in
  `docs/rules.md` and a fixture that fails without it. `npm run docs` fails when a code and its line drift.
- A map that passes is one the model accepts; the owner still judges whether a branch is interesting.

// Every number the converter and the validator use, in one place, grouped by profile (ADR 0007).
//
// two-levels: the owner's course piece for Zerun (ADR 0003, ADR 0005). Physics numbers come from Zerun's ADR 0004
// and GLOSSARY ("about 6 tiles up, 11 tiles across at full speed"). The reach used to prove a route exists is
// conservative (8 across); the reach used to catch a leak between levels is the full-speed one (11).
//
// circuit: a race track like SpeedRunners', one closed loop with parallel lanes. Reach and thresholds were
// calibrated on the 41 current SpeedRunners maps (scripts/measure-maps.mjs): at 12 up and 24 across every
// reference map keeps at least 91% of its surfaces in one network, offers two or more surfaces in at least 87%
// of its columns, and has at most 2 dead ends and 4 bridges.

export const PHYSICS = Object.freeze({
  maxJumpUp: 6,
  maxJumpAcross: 8,
  fullSpeedJumpAcross: 11,
  minWallHeight: 2,
});

export const RULES = Object.freeze({
  minBranchRatio: 0.05,
  maxBranchRatio: 0.4,
  minBranchesPerLevel: 1,
  extremityCols: 3,
  separatorFill: 0.5,
});

export const CIRCUIT_PHYSICS = Object.freeze({
  maxJumpUp: 12,
  maxJumpAcross: 24,
  fullSpeedJumpAcross: 24,
  minWallHeight: 2,
});

export const CIRCUIT_RULES = Object.freeze({
  minNetworkShare: 0.9,
  minTwoLaneShare: 0.8,
  minThreeLaneShare: 0.3,
});

export const PROFILES = Object.freeze({
  "two-levels": { physics: PHYSICS, rules: RULES },
  circuit: { physics: CIRCUIT_PHYSICS, rules: CIRCUIT_RULES },
});

export const IMAGE = Object.freeze({
  tile: 12,
  coverage: 0.5,
  threshold: 128,
});

export const TEMPLATE = Object.freeze({
  difficulty: 0.3,
  weight: 1,
});

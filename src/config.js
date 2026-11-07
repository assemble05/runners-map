// Every number the converter and the validator use, in one place. Physics numbers come from Zerun's ADR 0004
// and GLOSSARY ("about 6 tiles up, 11 tiles across at full speed"; steps of at most 3 rows). The reach used to
// prove a route exists is conservative (8 across); the reach used to catch a leak between levels is the full-speed
// one (11), so a route is never assumed and a leak is never missed.

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

export const IMAGE = Object.freeze({
  tile: 12,
  coverage: 0.5,
  threshold: 128,
});

export const TEMPLATE = Object.freeze({
  difficulty: 0.3,
  weight: 1,
});

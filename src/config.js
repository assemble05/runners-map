// Every number the converter and the validator use, in one place, grouped by profile (ADR 0007, ADR 0008).
//
// Zerun's numbers come from its ADR 0004 and PhysicsUtil: 12 px tiles, a world 60 rows tall, a runner box
// 14 x 30 px standing and 15 px sliding, so 3 tiles of air to stand, 2 to slide, 1 is impassable; "about 6
// tiles up, 11 tiles across at full speed". The reach used to prove a route exists is conservative (8 across);
// the reach used to catch a leak between levels is the full-speed one (11).
//
// circuit: a race track like SpeedRunners', one closed loop with parallel lanes. Reach and thresholds were
// calibrated on the 41 current SpeedRunners maps (scripts/measure-maps.mjs): at 12 up and 24 across every
// reference map keeps at least 91% of its surfaces in one network, offers two or more surfaces in at least 87%
// of its columns, and has at most 2 dead ends and 4 bridges. The runner's height in tiles is unknown there, so
// headroom 1/1 turns that rule off and keeps the goldens honest.

export const ZERUN_HEADROOM = Object.freeze({ stand: 3, slide: 2 });

export const PHYSICS = Object.freeze({
  maxJumpUp: 6,
  maxJumpAcross: 8,
  fullSpeedJumpAcross: 11,
  minWallHeight: 2,
  headroom: ZERUN_HEADROOM,
});

export const WORLD = Object.freeze({ rows: 60, tilePx: 12 });

export const RULES = Object.freeze({
  minBranchRatio: 0.05,
  maxBranchRatio: 0.4,
  minBranchesPerLevel: 1,
  extremityCols: 3,
  separatorFill: 0.5,
  worldRows: WORLD.rows,
});

export const CIRCUIT_PHYSICS = Object.freeze({
  maxJumpUp: 12,
  maxJumpAcross: 24,
  fullSpeedJumpAcross: 24,
  minWallHeight: 2,
  headroom: Object.freeze({ stand: 1, slide: 1 }),
});

export const CIRCUIT_RULES = Object.freeze({
  minNetworkShare: 0.9,
  minTwoLaneShare: 0.8,
  minThreeLaneShare: 0.3,
  worldRows: null,
});

export const ZERUN_CIRCUIT_RULES = Object.freeze({ ...CIRCUIT_RULES, worldRows: WORLD.rows });

// The screen the runner sees at once: Zerun draws the run on 320 x 180 px (ADR 0003), so 26 x 15 tiles of 12 px.
export const SCREEN = Object.freeze({ widthPx: 320, heightPx: 180 });

// The running height (decided 08/11 by the owner): a part that is run through needs 1.5 x the double jump's apex as air
// above it. The apex is measured on Zerun's engine (RunnerReducer, 60 ticks a second, 12 px tiles): the best double jump,
// the first jump held 16 ticks and the second pressed one tick after the release, reaches 10.34 tiles. A comment in
// FixedCourseGeneratorService says 7.8; the current code does not give that number.
export const DOUBLE_JUMP_APEX_TILES = 10.34;
export const RUN_CLEARANCE_FACTOR = 1.5;

// zerun-laps (decided 08/11 by the owner): a closed circuit played lap after lap. Holes are not judged, and lanes are
// not either: what is judged is how many ways round there are (ROUTES) and whether each split fits the screen (SCREEN).
// maxRoutes is a proposal of this file, to be confirmed by the owner; it is far under the 200 that is too many.
export const ZERUN_LAPS_RULES = Object.freeze({
  ...ZERUN_CIRCUIT_RULES,
  minTwoLaneShare: 0,
  runHeight: Object.freeze({
    apexTiles: DOUBLE_JUMP_APEX_TILES,
    factor: RUN_CLEARANCE_FACTOR,
    minTiles: Math.ceil(RUN_CLEARANCE_FACTOR * DOUBLE_JUMP_APEX_TILES),
  }),
  laps: Object.freeze({
    maxRoutes: 64,
    screenCols: Math.floor(SCREEN.widthPx / WORLD.tilePx),
    screenRows: Math.floor(SCREEN.heightPx / WORLD.tilePx),
  }),
});

export const PROFILES = Object.freeze({
  "two-levels": { physics: PHYSICS, rules: RULES },
  circuit: { physics: CIRCUIT_PHYSICS, rules: CIRCUIT_RULES },
  "zerun-circuit": { physics: PHYSICS, rules: ZERUN_CIRCUIT_RULES },
  "zerun-laps": { physics: PHYSICS, rules: ZERUN_LAPS_RULES },
});

export const IMAGE = Object.freeze({
  tile: 12,
  coverage: 0.5,
  threshold: 128,
});

export const IMPORT = Object.freeze({
  profile: "zerun-circuit",
  minFidelity: 0.97,
  deadEnds: "barrier",
  minStubDepth: 3,
  tileCandidates: Object.freeze([4, 6, 8, 10, 12, 14, 16, 20, 24, 32]),
});

export const TEMPLATE = Object.freeze({
  difficulty: 0.3,
  weight: 1,
});

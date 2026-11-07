// A short, stable account of an analysis: what the golden files of the reference maps hold and what the tests
// compare. Codes are counted, numbers are rounded, nothing depends on surface ids.

function countBy(findings) {
  const counts = {};
  for (const finding of findings) counts[finding.code] = (counts[finding.code] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

export function summarize(result) {
  const { validation, tiles } = result;
  const report = validation.report ?? {};
  return {
    profile: result.profile,
    ok: validation.ok,
    cols: tiles.cols,
    rows: tiles.rows,
    errors: countBy(validation.errors),
    warnings: countBy(validation.warnings),
    surfaces: report.surfaces ?? 0,
    links: report.links ?? 0,
    pockets: report.pockets ?? 0,
    networkShare: report.networkShare ?? null,
    lanes: report.lanes ?? null,
  };
}

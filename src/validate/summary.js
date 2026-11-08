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

/** The account of an import: the drawing's fidelity, corridors, topology, and each variant's summary. */
export function summarizeImport(imported) {
  return {
    profile: imported.profile,
    tile: imported.tile,
    topology: imported.topology,
    openings: { left: imported.openings.left.length, right: imported.openings.right.length },
    corridors: imported.corridors,
    fidelity: imported.fidelity.fidelity,
    minStubDepth: imported.minStubDepth,
    treatment: imported.treatment,
    ok: imported.ok,
    variants: imported.variants.map((variant) => ({
      name: variant.name,
      entryRow: variant.result.template.entryRow,
      exitRow: variant.result.template.exitRow,
      fidelity: variant.fidelity.fidelity,
      stubs: variant.stubs.map((stub) => ({ direction: stub.direction, depth: stub.depth, width: stub.width, cells: stub.cells, sealed: stub.sealed, treatment: stub.treatment, mouth: stub.mouth })),
      ...summarize(variant.result),
    })),
  };
}

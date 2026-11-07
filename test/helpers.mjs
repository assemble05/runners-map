import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const here = dirname(fileURLToPath(import.meta.url));

export function fixtureRows(name) {
  return readFileSync(join(here, "fixtures", `${name}.rows.txt`), "utf8")
    .split(/\r?\n/)
    .filter((line) => line.length > 0);
}

export function codes(result) {
  return [...new Set(result.validation.errors.map((finding) => finding.code))].sort();
}

/** A map of `width` columns: outer walls, a slab with shafts at both ends, one branch platform per level. */
export function twoLevelMap(width, { lowerBranch = [10, 18], upperBranch = [20, 28] } = {}) {
  const line = (fill) => `#${fill}#`;
  const empty = ".".repeat(width - 2);
  const span = (from, to) => `${".".repeat(from - 1)}${"#".repeat(to - from + 1)}${".".repeat(width - 2 - to)}`;
  return [
    "#".repeat(width),
    line(empty),
    line(empty),
    line(empty),
    line(upperBranch ? span(upperBranch[0], upperBranch[1]) : empty),
    line(empty),
    line(empty),
    line(empty),
    `#.${"#".repeat(width - 4)}.#`,
    line(empty),
    line(empty),
    line(empty),
    line(lowerBranch ? span(lowerBranch[0], lowerBranch[1]) : empty),
    line(empty),
    line(empty),
    "#".repeat(width),
  ];
}

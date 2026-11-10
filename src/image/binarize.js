// Pixels to cells. White is solid, black is empty; a mid grey is a thin platform when the caller opts in.
// Transparent pixels are empty. The map is drawn as white shapes on black, so antialiased edges fall to the
// nearer side by the threshold and never become platforms by accident unless --platform-gray is on.

export const CELL = Object.freeze({ EMPTY: 0, SOLID: 1, PLATFORM: 2 });

const DEFAULTS = Object.freeze({ threshold: 128, platformGray: false, platformMin: 96, platformMax: 160 });

export function luminance(r, g, b) {
  return (299 * r + 587 * g + 114 * b) / 1000;
}

/** Converts an RGBA image into a cell grid: { width, height, cells } with CELL values. */
export function toCells(image, options = {}) {
  const { threshold, platformGray, platformMin, platformMax, whiteIsAir } = { ...DEFAULTS, ...options };
  const { width, height, rgba } = image;
  const cells = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i += 1) {
    const at = i * 4;
    if (rgba[at + 3] < 128) continue;
    const lum = luminance(rgba[at], rgba[at + 1], rgba[at + 2]);
    if (platformGray && lum >= platformMin && lum <= platformMax) cells[i] = CELL.PLATFORM;
    else if ((lum >= threshold) !== Boolean(whiteIsAir)) cells[i] = CELL.SOLID;
  }
  return { width, height, cells };
}

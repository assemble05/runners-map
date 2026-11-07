// Draws a map image from tiles: white solid, grey platform, black empty, `size` px per tile. The same picture an
// editor would save, so a map sketched in text can go through the image path, and a converted map can be drawn
// again and compared.

const SHADE = Object.freeze({ empty: 0, solid: 255, platform: 128 });

export function rowsToImage(tiles, size) {
  const width = tiles.cols * size;
  const height = tiles.rows * size;
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const v = SHADE[tiles.kinds[Math.floor(y / size)][Math.floor(x / size)]];
      rgba.set([v, v, v, 255], (y * width + x) * 4);
    }
  }
  return { width, height, rgba };
}

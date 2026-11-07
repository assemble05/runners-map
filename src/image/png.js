// Minimal PNG codec on top of Node's zlib: enough to read a map drawn in any editor and to write previews.
// Reads non-interlaced images of every color type at bit depths 1, 2, 4, 8 and 16 (16 keeps the high byte).
// Writes 8-bit RGBA with filter 0. No other dependency.

import { deflateSync, inflateSync } from "node:zlib";

const SIGNATURE = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
const CRC_TABLE = buildCrcTable();

function buildCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}

function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function readU32(bytes, at) {
  return ((bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3]) >>> 0;
}

function writeU32(value) {
  return Uint8Array.from([(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff]);
}

function concat(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

function chunk(type, data) {
  const typeBytes = Uint8Array.from(type, (ch) => ch.charCodeAt(0));
  const body = concat([typeBytes, data]);
  return concat([writeU32(data.length), body, writeU32(crc32(body))]);
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

function unfilter(raw, stride, bpp, height) {
  const out = new Uint8Array(stride * height);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const inAt = y * (stride + 1) + 1;
    const outAt = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const value = raw[inAt + x];
      const left = x >= bpp ? out[outAt + x - bpp] : 0;
      const up = y > 0 ? out[outAt - stride + x] : 0;
      const upLeft = y > 0 && x >= bpp ? out[outAt - stride + x - bpp] : 0;
      let decoded;
      if (filter === 0) decoded = value;
      else if (filter === 1) decoded = value + left;
      else if (filter === 2) decoded = value + up;
      else if (filter === 3) decoded = value + ((left + up) >> 1);
      else if (filter === 4) decoded = value + paeth(left, up, upLeft);
      else throw new Error(`PNG: unknown filter ${filter} on row ${y}`);
      out[outAt + x] = decoded & 0xff;
    }
  }
  return out;
}

function sampleReader(row, bitDepth) {
  if (bitDepth === 8) return (i) => row[i];
  if (bitDepth === 16) return (i) => row[i * 2];
  const perByte = 8 / bitDepth;
  const max = (1 << bitDepth) - 1;
  return (i) => {
    const byte = row[Math.floor(i / perByte)];
    const shift = 8 - bitDepth * ((i % perByte) + 1);
    return Math.round((((byte >> shift) & max) * 255) / max);
  };
}

/** Decodes a PNG into { width, height, rgba } with 8-bit RGBA samples. */
export function decodePng(bytes) {
  for (let i = 0; i < SIGNATURE.length; i += 1) {
    if (bytes[i] !== SIGNATURE[i]) throw new Error("PNG: bad signature");
  }
  let at = 8;
  let header = null;
  let palette = null;
  let transparency = null;
  const idat = [];
  while (at < bytes.length) {
    const length = readU32(bytes, at);
    const type = String.fromCharCode(bytes[at + 4], bytes[at + 5], bytes[at + 6], bytes[at + 7]);
    const data = bytes.subarray(at + 8, at + 8 + length);
    if (type === "IHDR") {
      header = {
        width: readU32(data, 0),
        height: readU32(data, 4),
        bitDepth: data[8],
        colorType: data[9],
        interlace: data[12],
      };
    } else if (type === "PLTE") palette = data;
    else if (type === "tRNS") transparency = data;
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    at += 12 + length;
  }
  if (!header) throw new Error("PNG: missing IHDR");
  if (header.interlace !== 0) throw new Error("PNG: interlaced images are not supported; save it non-interlaced");
  const channels = CHANNELS[header.colorType];
  if (!channels) throw new Error(`PNG: unsupported color type ${header.colorType}`);
  const { width, height, bitDepth, colorType } = header;
  const stride = Math.ceil((width * channels * bitDepth) / 8);
  const bpp = Math.max(1, Math.ceil((channels * bitDepth) / 8));
  const raw = inflateSync(Buffer.concat(idat.map((part) => Buffer.from(part))));
  const pixels = unfilter(raw, stride, bpp, height);
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const row = pixels.subarray(y * stride, (y + 1) * stride);
    const read = sampleReader(row, bitDepth);
    for (let x = 0; x < width; x += 1) {
      const out = (y * width + x) * 4;
      if (colorType === 0) {
        const v = read(x);
        rgba.set([v, v, v, 255], out);
      } else if (colorType === 2) {
        rgba.set([read(x * 3), read(x * 3 + 1), read(x * 3 + 2), 255], out);
      } else if (colorType === 3) {
        const index = bitDepth === 8 ? row[x] : Math.round((read(x) * ((1 << bitDepth) - 1)) / 255);
        const alpha = transparency && index < transparency.length ? transparency[index] : 255;
        rgba.set([palette[index * 3], palette[index * 3 + 1], palette[index * 3 + 2], alpha], out);
      } else if (colorType === 4) {
        const v = read(x * 2);
        rgba.set([v, v, v, read(x * 2 + 1)], out);
      } else {
        rgba.set([read(x * 4), read(x * 4 + 1), read(x * 4 + 2), read(x * 4 + 3)], out);
      }
    }
  }
  return { width, height, rgba };
}

/** Encodes { width, height, rgba } as an 8-bit RGBA PNG. */
export function encodePng({ width, height, rgba }) {
  const stride = width * 4;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  const header = concat([writeU32(width), writeU32(height), Uint8Array.from([8, 6, 0, 0, 0])]);
  return concat([SIGNATURE, chunk("IHDR", header), chunk("IDAT", new Uint8Array(deflateSync(raw))), chunk("IEND", new Uint8Array(0))]);
}

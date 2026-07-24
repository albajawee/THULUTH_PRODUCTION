/**
 * Dependency-free PWA icon generator.
 *
 * Renders the THULUTH mark — a 33 / 33 / 33 / 1 donut in the four fund accent
 * colors (Stability blue, Growth emerald, Life violet, Charity amber) on the
 * app's dark chrome (#0a0a0a) — and writes the PNGs the manifest references.
 *
 * Uses only Node built-ins (`node:zlib`, `Buffer`), so it adds no dependency to
 * the project. Run with `npm run generate:icons` whenever the mark changes.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

// Dark app background (matches --background oklch(0.145 0 0) === #0a0a0a).
const BG = [10, 10, 10];
// Fund accents (Tailwind blue-500 / emerald-500 / violet-500 / amber-500).
const SEGMENTS = [
  { share: 33, color: [59, 130, 246] },   // Stability
  { share: 33, color: [16, 185, 129] },   // Growth
  { share: 33, color: [139, 92, 246] },   // Life
  { share: 1, color: [245, 158, 11] },    // Charity
];
const TOTAL = SEGMENTS.reduce((s, x) => s + x.share, 0);

// --- PNG encoding (8-bit RGBA, no external deps) --------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // 10-12 compression/filter/interlace = 0
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Mark rendering -------------------------------------------------------

function render(size, { padding }) {
  const rgba = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const outer = (size / 2) * (1 - padding);
  const inner = outer * 0.58; // donut hole
  const SS = 4; // supersampling for smooth edges

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS - cx;
          const py = y + (sy + 0.5) / SS - cy;
          const dist = Math.hypot(px, py);
          let color = BG;
          if (dist >= inner && dist <= outer) {
            // angle clockwise from top (12 o'clock)
            let ang = Math.atan2(px, -py); // 0 at top, +clockwise
            if (ang < 0) ang += Math.PI * 2;
            const frac = ang / (Math.PI * 2);
            let acc = 0;
            for (const seg of SEGMENTS) {
              acc += seg.share / TOTAL;
              if (frac <= acc) { color = seg.color; break; }
            }
          }
          r += color[0]; g += color[1]; b += color[2];
        }
      }
      const n = SS * SS;
      const i = (y * size + x) * 4;
      rgba[i] = Math.round(r / n);
      rgba[i + 1] = Math.round(g / n);
      rgba[i + 2] = Math.round(b / n);
      rgba[i + 3] = 255; // opaque: safe for maskable + iOS (no alpha halos)
    }
  }
  return encodePng(size, rgba);
}

// --- Emit -----------------------------------------------------------------

const targets = [
  { file: 'icon-192.png', size: 192, padding: 0.12 },
  { file: 'icon-512.png', size: 512, padding: 0.12 },
  { file: 'icon-maskable-192.png', size: 192, padding: 0.2 },
  { file: 'icon-maskable-512.png', size: 512, padding: 0.2 },
  { file: 'apple-touch-icon.png', size: 180, padding: 0.14 },
];

for (const t of targets) {
  writeFileSync(join(OUT_DIR, t.file), render(t.size, { padding: t.padding }));
  console.log('wrote public/' + t.file);
}

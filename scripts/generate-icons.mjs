import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = resolve(root, 'public', 'icons');

const baseSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0ea5e9"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#g)"/>
  <text x="256" y="360" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-weight="800" font-size="320" fill="#fff">£</text>
</svg>`;

// Maskable: same content, but content fills only the inner ~80% (safe zone), background extends to edges.
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0ea5e9"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <text x="256" y="335" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-weight="800" font-size="240" fill="#fff">£</text>
</svg>`;

// Apple touch icon: solid background, no rounded corners (iOS adds them).
const appleSvg = baseSvg;

await mkdir(outDir, { recursive: true });

async function emit(svg, name, size) {
  const buf = Buffer.from(svg);
  const png = await sharp(buf).resize(size, size).png().toBuffer();
  await writeFile(resolve(outDir, name), png);
  console.log(`✓ ${name} (${size}×${size})`);
}

await emit(baseSvg, 'icon-192.png', 192);
await emit(baseSvg, 'icon-512.png', 512);
await emit(maskableSvg, 'icon-maskable.png', 512);
await emit(appleSvg, 'apple-touch-icon.png', 180);
await emit(appleSvg, 'apple-touch-icon-167.png', 167); // iPad Pro
await emit(appleSvg, 'apple-touch-icon-152.png', 152); // iPad
await emit(appleSvg, 'apple-touch-icon-120.png', 120); // iPhone

// Favicon
await emit(baseSvg, 'favicon-32.png', 32);
await emit(baseSvg, 'favicon-16.png', 16);

console.log('All icons generated.');

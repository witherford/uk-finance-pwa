// Bumps the user-facing version in src/version.ts AND public/version.json
// (so the live deployment can serve the latest version string for in-app
// "is there an update?" checks).
//
// Rule: patch ticks 0.0.1 each run. At patch == 10, patch -> 0 and minor += 1.
// At minor == 10, minor -> 0 and major += 1.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tsFile = resolve(root, 'src', 'version.ts');
const jsonFile = resolve(root, 'public', 'version.json');

const src = readFileSync(tsFile, 'utf8');
const m = src.match(/APP_VERSION\s*=\s*'V(\d+)\.(\d+)\.(\d+)'/);
if (!m) {
  console.error('Could not find APP_VERSION in src/version.ts');
  process.exit(1);
}
let [maj, min, pat] = [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
pat += 1;
if (pat >= 10) { pat = 0; min += 1; }
if (min >= 10) { min = 0; maj += 1; }
const next = `V${maj}.${min}.${pat}`;
const out = src.replace(/APP_VERSION\s*=\s*'V\d+\.\d+\.\d+'/, `APP_VERSION = '${next}'`);
writeFileSync(tsFile, out);

// Mirror to public/version.json so the deployed site advertises the latest version.
const meta = { version: next, builtAt: new Date().toISOString() };
writeFileSync(jsonFile, JSON.stringify(meta, null, 2) + '\n');

console.log(`Bumped to ${next}  (src/version.ts + public/version.json)`);

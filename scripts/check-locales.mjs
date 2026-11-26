import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const i18nDir = path.resolve(__dirname, '../src/i18n');
const localeFiles = ['et.ts', 'en.ts', 'ru.ts', 'es.ts'];

function extractEntries(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const entries = new Map();
  const regex = /^\s*'([^']+)'\s*:\s*'((?:\\'|[^'])*)'\s*,?$/gm;
  let match;
  while ((match = regex.exec(src)) !== null) {
    entries.set(match[1], match[2]);
  }
  return entries;
}

const maps = Object.fromEntries(
  localeFiles.map((file) => [file, extractEntries(path.join(i18nDir, file))])
);

const allKeys = new Set();
for (const m of Object.values(maps)) {
  for (const k of m.keys()) allKeys.add(k);
}

let hasError = false;
for (const [file, map] of Object.entries(maps)) {
  for (const key of allKeys) {
    if (!map.has(key)) {
      console.error(`[MISSING] ${file}: "${key}"`);
      hasError = true;
    } else if (map.get(key).trim().length === 0) {
      console.error(`[EMPTY] ${file}: "${key}"`);
      hasError = true;
    }
  }
}

if (hasError) {
  process.exit(1);
}

console.log(`Locale parity OK: ${localeFiles.join(', ')} (${allKeys.size} keys each)`);

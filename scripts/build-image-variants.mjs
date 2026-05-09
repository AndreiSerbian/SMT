#!/usr/bin/env node
// Generates -320 and -480 WebP variants for slideN.webp in the 5 product collections.
// Idempotent: skips if variant already exists. Does NOT overwrite originals.
// Usage: node scripts/build-image-variants.mjs

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const COLLECTIONS = [
  'small with bow',
  'medium with bow',
  'big with bow',
  'boxes with handles',
  'full cover small',
];
const ROOT = 'public/images';
const VARIANTS = [
  { width: 320, quality: 78, suffix: '-320' },
  { width: 480, quality: 80, suffix: '-480' },
];

let processed = 0, generated = 0, skipped = 0, errors = 0;

async function processFile(file) {
  const dir = path.dirname(file);
  const ext = path.extname(file);
  const stem = path.basename(file, ext);
  if (!/^slide\d+$/.test(stem)) return;
  if (ext.toLowerCase() !== '.webp') return;
  processed++;
  for (const v of VARIANTS) {
    const out = path.join(dir, `${stem}${v.suffix}.webp`);
    if (fs.existsSync(out)) { skipped++; continue; }
    try {
      await sharp(file)
        .resize({ width: v.width, withoutEnlargement: true })
        .webp({ quality: v.quality })
        .toFile(out);
      generated++;
    } catch (e) {
      console.error(`ERR ${out}: ${e.message}`);
      errors++;
    }
  }
}

async function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    else await processFile(full);
  }
}

for (const c of COLLECTIONS) {
  const dir = path.join(ROOT, c);
  if (!fs.existsSync(dir)) { console.warn(`skip missing collection: ${dir}`); continue; }
  await walk(dir);
}

console.log(`\nDone: processed=${processed}, generated=${generated}, skipped=${skipped}, errors=${errors}`);

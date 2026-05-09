#!/usr/bin/env node
// Scans public/images and public/videos to produce public/media-manifest.json
// Used by mediaResolver.js for fast local-first lookup.

import fs from 'node:fs';
import path from 'node:path';

const ROOTS = [
  { fsPath: 'public/images', manifestPrefix: 'images' },
  { fsPath: 'public/videos', manifestPrefix: 'videos' },
];

const files = {};
function walk(fsDir, manifestDir) {
  if (!fs.existsSync(fsDir)) return;
  for (const entry of fs.readdirSync(fsDir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const fsFull = path.join(fsDir, entry.name);
    const manifestPath = manifestDir ? `${manifestDir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) walk(fsFull, manifestPath);
    else files[manifestPath] = true;
  }
}

for (const r of ROOTS) walk(r.fsPath, r.manifestPrefix);

const out = {
  version: 1,
  generatedAt: new Date().toISOString(),
  files,
};
fs.writeFileSync('public/media-manifest.json', JSON.stringify(out, null, 0));
console.log(`Wrote public/media-manifest.json with ${Object.keys(files).length} entries.`);

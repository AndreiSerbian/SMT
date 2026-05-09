#!/usr/bin/env node
// Read-only audit: compare DB photos[] ↔ Supabase Storage ↔ local public/images
// Usage: node scripts/audit-media-sync.mjs
// Writes report to /mnt/documents/media-sync-audit.md (and prints summary).

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split('\n')
    .filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const sb = createClient(SUPABASE_URL, ANON);

const COLLECTIONS = [
  'small with bow',
  'medium with bow',
  'big with bow',
  'boxes with handles',
  'full cover small',
];
const LOCAL_ROOT = 'public/images';

// ---------- 1. Local fs scan
function walk(dir, base = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walk(full, rel));
    else out.push(rel);
  }
  return out;
}
const localFiles = new Set(walk(LOCAL_ROOT).map(f => `images/${f}`));

// ---------- 2. Supabase Storage listing (recursive via list API)
async function listStorageRecursive(bucket, prefix) {
  const all = [];
  async function rec(p) {
    let offset = 0;
    while (true) {
      const { data, error } = await sb.storage.from(bucket).list(p, {
        limit: 1000, offset, sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const item of data) {
        const childPath = p ? `${p}/${item.name}` : item.name;
        if (item.id === null || item.metadata === null) {
          // folder
          await rec(childPath);
        } else {
          all.push(childPath);
        }
      }
      if (data.length < 1000) break;
      offset += 1000;
    }
  }
  await rec(prefix);
  return all;
}

console.log('Listing Supabase Storage product-media/images ...');
const storageFiles = new Set(await listStorageRecursive('product-media', 'images'));
console.log(`  ${storageFiles.size} objects`);

// ---------- 3. Products
console.log('Fetching products ...');
const { data: products, error: pErr } = await sb
  .from('products').select('artikul, color_hex, photos').eq('is_active', true).order('artikul');
if (pErr) throw pErr;
console.log(`  ${products.length} active products`);

// ---------- 4. Cross-reference
const STORAGE_PUBLIC_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/product-media/`;

function decodeStoragePath(url) {
  if (!url || !url.startsWith(STORAGE_PUBLIC_PREFIX)) return null;
  return decodeURIComponent(url.slice(STORAGE_PUBLIC_PREFIX.length));
}

function classifyCollection(storagePath) {
  if (!storagePath) return null;
  const lower = storagePath.toLowerCase();
  for (const c of COLLECTIONS) {
    if (lower.startsWith(`images/${c}/`)) return c;
  }
  // CamelCase variants
  for (const c of COLLECTIONS) {
    const cc = c.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
    if (storagePath.startsWith(`images/${cc}/`)) return c + ' (CAMELCASE)';
  }
  // Flat admin uploads
  if (/^images\/\d+_\d+_\d+\.(jpg|jpeg|png|webp)$/i.test(storagePath)) return 'FLAT_ADMIN_UPLOAD';
  return 'UNKNOWN';
}

const rows = [];
const collectionStats = {};
for (const p of products) {
  for (const [idx, url] of (p.photos || []).entries()) {
    const sp = decodeStoragePath(url);
    const coll = classifyCollection(sp);
    const inStorage = sp ? storageFiles.has(sp) : false;
    const inLocal = sp ? localFiles.has(sp) : false;
    const isSlide = sp && /\/slide\d+\.webp$/.test(sp);
    let status;
    if (!sp) status = 'NON_STORAGE_URL';
    else if (coll && coll.endsWith('(CAMELCASE)')) status = 'WRONG_CASE';
    else if (coll === 'FLAT_ADMIN_UPLOAD') status = 'FLAT_UPLOAD';
    else if (coll === 'UNKNOWN') status = 'UNKNOWN_COLLECTION';
    else if (!isSlide) status = 'WRONG_FILENAME';
    else if (inStorage && inLocal) status = 'OK';
    else if (inStorage && !inLocal) status = 'MISSING_LOCAL';
    else if (!inStorage && inLocal) status = 'MISSING_STORAGE';
    else status = 'MISSING_BOTH';
    rows.push({ artikul: p.artikul, hex: p.color_hex, idx: idx + 1, url, sp, coll, status });
    collectionStats[coll || 'NULL'] = (collectionStats[coll || 'NULL'] || 0) + 1;
  }
}

const byStatus = rows.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});

// ---------- 5. Local files NOT referenced by any product (orphans)
const referenced = new Set(rows.map(r => r.sp).filter(Boolean));
const localOrphans = [...localFiles].filter(f => {
  if (!COLLECTIONS.some(c => f.toLowerCase().startsWith(`images/${c}/`))) return false;
  return !referenced.has(f);
});

const storageOrphans = [...storageFiles].filter(f => {
  if (!COLLECTIONS.some(c => f.toLowerCase().startsWith(`images/${c}/`))) return false;
  if (f.endsWith('.emptyFolderPlaceholder')) return false;
  return !referenced.has(f);
});

// ---------- 6. Report
const lines = [];
lines.push('# Media Sync Audit — giftboxopt.ru');
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push('');
lines.push('## Summary by status');
lines.push('| Status | Count |');
lines.push('|---|---:|');
for (const [k, v] of Object.entries(byStatus).sort((a, b) => b[1] - a[1])) {
  lines.push(`| ${k} | ${v} |`);
}
lines.push('');
lines.push('## Summary by collection (as referenced from DB)');
lines.push('| Collection | Refs |');
lines.push('|---|---:|');
for (const [k, v] of Object.entries(collectionStats).sort((a, b) => b[1] - a[1])) {
  lines.push(`| ${k} | ${v} |`);
}
lines.push('');
lines.push(`## Local files in 5 collections: ${[...localFiles].filter(f => COLLECTIONS.some(c => f.toLowerCase().startsWith(`images/${c}/`))).length}`);
lines.push(`## Storage files in 5 collections: ${[...storageFiles].filter(f => COLLECTIONS.some(c => f.toLowerCase().startsWith(`images/${c}/`))).length}`);
lines.push('');
lines.push('## Problem rows (status != OK)');
lines.push('| Artikul | Hex | # | Status | Storage path |');
lines.push('|---|---|---:|---|---|');
for (const r of rows.filter(r => r.status !== 'OK')) {
  lines.push(`| ${r.artikul} | ${r.hex} | ${r.idx} | ${r.status} | \`${r.sp || r.url}\` |`);
}
lines.push('');
lines.push(`## Local orphans (5 collections, no DB ref) — ${localOrphans.length}`);
for (const f of localOrphans.slice(0, 200)) lines.push(`- \`${f}\``);
if (localOrphans.length > 200) lines.push(`- … +${localOrphans.length - 200} more`);
lines.push('');
lines.push(`## Storage orphans (5 collections, no DB ref) — ${storageOrphans.length}`);
for (const f of storageOrphans.slice(0, 200)) lines.push(`- \`${f}\``);
if (storageOrphans.length > 200) lines.push(`- … +${storageOrphans.length - 200} more`);

fs.mkdirSync('/mnt/documents', { recursive: true });
fs.writeFileSync('/mnt/documents/media-sync-audit.md', lines.join('\n'));

console.log('\n=== Status counts ===');
console.table(byStatus);
console.log('\nReport written to /mnt/documents/media-sync-audit.md');

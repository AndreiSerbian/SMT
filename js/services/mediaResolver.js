// js/services/mediaResolver.js
// Local-first media URL resolver. Returns a /images/... or /videos/... path
// when the file exists locally (per public/media-manifest.json), otherwise
// returns the original Supabase URL as fallback.

const SUPABASE_PREFIX = 'https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/';

let manifestPromise = null;
let manifestFiles = null;

export async function loadMediaManifest() {
  if (manifestFiles) return manifestFiles;
  if (!manifestPromise) {
    manifestPromise = fetch('/media-manifest.json', { cache: 'force-cache' })
      .then(r => (r.ok ? r.json() : { files: {} }))
      .then(j => { manifestFiles = j.files || {}; return manifestFiles; })
      .catch(() => { manifestFiles = {}; return manifestFiles; });
  }
  return manifestPromise;
}

// Sync access — returns null until manifest is loaded.
export function getManifestSync() {
  return manifestFiles;
}

export function extractStoragePathFromSupabaseUrl(url) {
  if (!url || typeof url !== 'string') return null;
  if (!url.startsWith(SUPABASE_PREFIX)) return null;
  try { return decodeURIComponent(url.slice(SUPABASE_PREFIX.length)); }
  catch { return url.slice(SUPABASE_PREFIX.length); }
}

// Safe, targeted normalization for legacy CamelCase collection paths.
const COLLECTIONS = [
  'small with bow', 'medium with bow', 'big with bow',
  'boxes with handles', 'full cover small',
];
export function normalizeMediaPath(p) {
  if (!p) return p;
  let out = p;
  for (const c of COLLECTIONS) {
    const camel = c.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
    out = out.replace(`images/${camel}/`, `images/${c}/`);
  }
  return out;
}

function toLocalPath(storagePath) {
  // returns "/images/..." with proper URL encoding for spaces
  return '/' + storagePath.split('/').map(encodeURIComponent).join('/');
}

// Encode an already-local path (e.g. "/images/big with bow/...") so that
// spaces and other unsafe chars don't break srcset parsing.
function encodeLocalPath(localPath) {
  // Split off any query/hash before encoding.
  const hashIdx = localPath.indexOf('#');
  const queryIdx = localPath.indexOf('?');
  let cutIdx = -1;
  if (hashIdx >= 0 && queryIdx >= 0) cutIdx = Math.min(hashIdx, queryIdx);
  else cutIdx = Math.max(hashIdx, queryIdx);
  const pathPart = cutIdx >= 0 ? localPath.slice(0, cutIdx) : localPath;
  const tail = cutIdx >= 0 ? localPath.slice(cutIdx) : '';
  // Re-encode only if it appears to contain raw unsafe chars (e.g. space).
  if (!/[ "'<>]/.test(pathPart) && !/%[0-9A-Fa-f]{2}/.test(pathPart) === false) {
    // Already percent-encoded or safe — return as-is.
  }
  if (!/[ "'<>]/.test(pathPart)) return localPath;
  const segments = pathPart.split('/').map(seg => {
    // Avoid double-encoding already encoded segments.
    try { return seg === decodeURIComponent(seg) ? encodeURIComponent(seg) : seg; }
    catch { return encodeURIComponent(seg); }
  });
  return segments.join('/') + tail;
}

export function resolveImageUrl(originalUrl) {
  if (!originalUrl) return originalUrl;
  // Already a relative local path
  if (originalUrl.startsWith('/images/') || originalUrl.startsWith('/videos/')) {
    return encodeLocalPath(originalUrl);
  }
  const storagePath = extractStoragePathFromSupabaseUrl(originalUrl);
  if (!storagePath) return originalUrl;
  const cleaned = storagePath.replace(/^\/+/, '');
  const normalized = normalizeMediaPath(cleaned);
  if (manifestFiles && manifestFiles[normalized]) return toLocalPath(normalized);
  return originalUrl;
}

export function resolveVideoUrl(originalUrl) {
  return resolveImageUrl(originalUrl);
}

// Auto-load manifest at import time so the first resolveImageUrl after
// initial page paint already has data.
if (typeof window !== 'undefined') loadMediaManifest();

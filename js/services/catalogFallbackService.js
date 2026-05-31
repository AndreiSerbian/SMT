/**
 * Public JSON-first catalog loader.
 * Reads /data/products-public.json (versioned via /data/catalog-version.json).
 * Никаких обращений к Supabase. Используется только публичным каталогом.
 */

const VERSION_URL = '/data/catalog-version.json';
const SNAPSHOT_URL = '/data/products-public.json';

let _cached = null;
let _inflight = null;

async function fetchVersion() {
  try {
    const r = await fetch(VERSION_URL, { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    return j && j.version ? String(j.version) : null;
  } catch {
    return null;
  }
}

async function fetchSnapshot(version) {
  const url = version
    ? `${SNAPSHOT_URL}?v=${encodeURIComponent(version)}`
    : SNAPSHOT_URL;
  const init = version ? { cache: 'default' } : { cache: 'no-cache' };
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(`snapshot HTTP ${r.status}`);
  return r.json();
}

/**
 * Load + cache the local snapshot.
 * Throws if both version + snapshot fail.
 */
export async function loadLocalCatalogSnapshot() {
  if (_cached) return _cached;
  if (_inflight) return _inflight;

  _inflight = (async () => {
    const version = await fetchVersion();
    const snap = await fetchSnapshot(version);
    if (!snap || !Array.isArray(snap.products)) {
      throw new Error('invalid snapshot shape');
    }
    _cached = snap;
    return snap;
  })().finally(() => { _inflight = null; });

  return _inflight;
}

export function clearLocalCatalogCache() {
  _cached = null;
  _inflight = null;
}

const SIZE_RU = { small: 'малая', medium: 'средняя', big: 'большая' };

/**
 * Адаптер: гарантирует совместимость с существующим UI.
 * Возвращает поля в обеих формах (photo/photos, price/price_rub, id/artikul, category/category_slug).
 */
export function toProductShape(p) {
  const photos = Array.isArray(p.photos) ? p.photos
    : Array.isArray(p.photo) ? p.photo : [];
  const price = p.price_rub ?? p.price ?? 0;
  const slug = p.category_slug ?? p.category ?? null;
  return {
    ...p,
    id: p.artikul ?? p.id,
    artikul: p.artikul ?? p.id,
    name: p.name,
    category_id: p.category_id ?? null,
    category_slug: slug,
    category: slug,
    size: p.size,
    sizeType: p.sizeType || SIZE_RU[p.size] || p.size,
    color_hex: p.color_hex,
    color: p.color ?? p.color_hex,
    price_rub: Number(price) || 0,
    price: Number(price) || 0,
    dimensions: p.dimensions,
    weight: p.weight,
    photo: photos,
    photos: photos,
    videos: Array.isArray(p.videos) ? p.videos : [],
  };
}

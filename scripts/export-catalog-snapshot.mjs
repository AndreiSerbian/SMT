import crypto from 'crypto';
import fs from 'fs';

const URL = 'https://bsndismiessofvhglzrv.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzbmRpc21pZXNzb2Z2aGdsenJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2ODYyNTIsImV4cCI6MjA1NDI2MjI1Mn0.4pumjrK8SV79xaegTEZaJMmi6lnp-_5uhSytvWpoZHY';

const h = { apikey: KEY, Authorization: 'Bearer ' + KEY };

async function fetchAll(table, query='') {
  const r = await fetch(`${URL}/rest/v1/${table}?${query}`, { headers: h });
  if (!r.ok) throw new Error(table + ': ' + r.status + ' ' + await r.text());
  return r.json();
}

const [products, categories, colors] = await Promise.all([
  fetchAll('products', 'is_active=eq.true&select=*&order=created_at.desc&limit=500'),
  fetchAll('categories', 'is_active=eq.true&select=*&order=sort_order'),
  fetchAll('colors', 'is_active=eq.true&select=*&order=sort_order'),
]);

console.log('products:', products.length, 'categories:', categories.length, 'colors:', colors.length);

const catById = Object.fromEntries(categories.map(c => [c.id, c]));

const SIZE_RU = { small: 'малая', medium: 'средняя', big: 'большая' };
const colorByHex = Object.fromEntries(colors.map(c => [c.hex_code.toUpperCase(), c.russian_name || c.name]));

const STORAGE_PREFIX = `${URL}/storage/v1/object/public/product-media/`;

// Hard remap for admin-uploaded products whose DB photos point to
// /images/<artikul>_<ts>_*.jpg (files exist only in Supabase Storage, not on
// TimeWeb). We force them to the matching local category folder.
const ARTIKUL_PHOTO_REMAP = {
  '0629':  ['/images/boxes with handles/gold/slide1.jpg','/images/boxes with handles/gold/slide2.jpg','/images/boxes with handles/gold/slide3.jpg'],
  '0628':  ['/images/boxes with handles/blue velvet/slide1.jpg','/images/boxes with handles/blue velvet/slide2.jpg','/images/boxes with handles/blue velvet/slide3.jpg'],
  '06210': ['/images/boxes with handles/olive/slide1.webp','/images/boxes with handles/olive/slide2.webp','/images/boxes with handles/olive/slide3.webp'],
  '0626':  ['/images/boxes with handles/rose gold/slide1.webp','/images/boxes with handles/rose gold/slide2.webp'],
  '0621':  ['/images/boxes with handles/lilac/slide1.webp','/images/boxes with handles/lilac/slide2.webp'],
};

// Artikuls that have no matching local folder yet — leave as-is, but report.
const NEEDS_MANUAL_REVIEW = ['0641','0647','0644','0651','0657','0654'];

function decodePath(s) { try { return decodeURI(s); } catch { return s; } }

function toLocalPath(url) {
  if (!url) return url;
  let u = url;
  if (u.startsWith(STORAGE_PREFIX)) {
    u = '/' + u.slice(STORAGE_PREFIX.length); // -> /images/<folder>/<color>/slide1.webp
  } else if (!u.startsWith('http') && !u.startsWith('/')) {
    u = '/' + u;
  } else if (u.startsWith('http')) {
    return u; // external — keep
  }
  u = decodePath(u);
  u = u.replace('/boxes with handles/liliac/', '/boxes with handles/lilac/');
  return u;
}

const slugSet = new Set();
const out = products.map(p => {
  const cat = catById[p.category_id];
  const slug = cat ? cat.slug : null;
  if (slug) slugSet.add(slug);
  const colorName = colorByHex[(p.color_hex || '').toUpperCase()] || p.color_hex;
  const photos = ARTIKUL_PHOTO_REMAP[p.artikul]
    ? [...ARTIKUL_PHOTO_REMAP[p.artikul]]
    : (p.photos || []).map(toLocalPath);
  const videos = (p.videos || []).map(toLocalPath);
  return {
    id: p.artikul,
    artikul: p.artikul,
    name: p.name,
    category_id: p.category_id,
    category_slug: slug,
    category: slug,
    size: p.size,
    sizeType: SIZE_RU[p.size] || p.size,
    color_hex: p.color_hex,
    color: colorName,
    price_rub: Number(p.price_rub),
    price: Number(p.price_rub),
    id_wb: p.id_wb || null,
    dimensions: p.dimensions,
    weight: Number(p.weight),
    photo: photos,
    photos: photos,
    videos: videos,
  };
});

const snapshot = {
  generatedAt: new Date().toISOString(),
  categories: categories.map(c => ({ id: c.id, slug: c.slug, name: c.name, sort_order: c.sort_order })),
  colors: colors.map(c => ({ hex_code: c.hex_code, name: c.name, russian_name: c.russian_name })),
  products: out,
};

const body = JSON.stringify(snapshot);
const version = crypto.createHash('sha1').update(body).digest('hex').slice(0, 8);
snapshot.version = version;

fs.mkdirSync('public/data', { recursive: true });
fs.writeFileSync('public/data/products-public.json', JSON.stringify(snapshot, null, 2));
fs.writeFileSync('public/data/catalog-version.json', JSON.stringify({
  version, generatedAt: snapshot.generatedAt, productsCount: out.length
}, null, 2));

console.log('version:', version);
console.log('slugs:', [...slugSet].sort());
console.log('NEEDS MANUAL REVIEW:', NEEDS_MANUAL_REVIEW.join(', '));
const p0706 = out.find(p => p.artikul === '0706');
console.log('0706:', p0706 ? { slug: p0706.category_slug, photo: p0706.photos[0] } : 'NOT FOUND');
const handle = out.find(p => p.category_slug === 'handle-box-small');
console.log('handle sample:', handle ? { artikul: handle.artikul, photo: handle.photos[0] } : 'NONE');

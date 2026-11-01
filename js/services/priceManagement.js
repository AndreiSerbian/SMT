export const APPROVED_BOW_PRICES = { 'bow-box-small': 310, 'bow-box-medium': 380 };
export function validPrice(value) {
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0 || Math.abs(price * 100 - Math.round(price * 100)) > 0.00001) throw new Error('Цена должна быть больше нуля, не более двух знаков после запятой.');
  return price;
}
export function priceDifferences(products, snapshot) {
  const published = new Map(snapshot.products.map(p => [p.artikul, p]));
  const active = products.filter(p => p.is_active);
  const diffs = active.filter(p => !published.has(p.artikul) || Number(p.price_rub) !== Number(published.get(p.artikul).price_rub));
  const activeIds = new Set(active.map(p => p.artikul));
  return { changed: diffs, removed: snapshot.products.filter(p => !activeIds.has(p.artikul)) };
}
export function patchSnapshotPrices(snapshot, products) {
  const diff = priceDifferences(products, snapshot);
  if (diff.removed.length || products.filter(p => p.is_active).length !== snapshot.products.length || snapshot.products.some(p => !products.some(x => x.is_active && x.artikul === p.artikul))) throw new Error('Состав каталога изменился. Нужна полная выгрузка каталога, а не только цен.');
  const bySku = new Map(products.map(p => [p.artikul, p]));
  return { ...snapshot, generatedAt: new Date().toISOString(), products: snapshot.products.map(p => ({ ...p, price: validPrice(bySku.get(p.artikul).price_rub), price_rub: validPrice(bySku.get(p.artikul).price_rub) })) };
}
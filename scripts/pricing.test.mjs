import test from 'node:test';
import assert from 'node:assert/strict';
import { APPROVED_BOW_PRICES, validPrice, patchSnapshotPrices, priceDifferences } from '../js/services/priceManagement.js';
test('approved small bow category price is 310 RUB', () => assert.equal(APPROVED_BOW_PRICES['bow-box-small'], 310));
test('approved medium bow category price is 380 RUB', () => assert.equal(APPROVED_BOW_PRICES['bow-box-medium'], 380));
test('positive finite price with at most two decimal places', () => { for (const p of [0, -1, Infinity, 'abc', 310.001]) assert.throws(() => validPrice(p)); assert.equal(validPrice('310'), 310); });
test('export preserves photos and updates both price fields', () => {
  const snapshot = { products: [{ artikul: '0593', price: 290, price_rub: 290, photos: ['/local.jpg'] }] };
  const db = [{ artikul: '0593', price_rub: 310, is_active: true }];
  assert.equal(priceDifferences(db, snapshot).changed.length, 1);
  const output = patchSnapshotPrices(snapshot, db);
  assert.equal(output.products[0].price, 310); assert.equal(output.products[0].price_rub, 310); assert.deepEqual(output.products[0].photos, ['/local.jpg']);
});
test('price-only export refuses new missing or inactive products', () => assert.throws(() => patchSnapshotPrices({ products: [{ artikul: '0593' }] }, [{ artikul: '0593', is_active: false, price_rub: 310 }])));
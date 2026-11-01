import { assertEquals, assertRejects, assertThrows } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { cartIdentity, digest, priceIdentity, QUOTE_TTL_MS, signQuote, validateItems, verifyQuote, cleanOrder } from './quote.ts';
const secret = 'isolated-test-key-not-used-in-production';
Deno.test('quote expires after exactly 30 minutes', async () => {
  const token = await signQuote('cart', 'prices', secret, 1000);
  assertEquals((await verifyQuote(token, secret, 1001)).expires, 1000 + 30 * 60 * 1000);
  await assertRejects(() => verifyQuote(token, secret, 1000 + QUOTE_TTL_MS));
});
Deno.test('tampered signature is rejected', async () => {
  const token = await signQuote('cart', 'prices', secret);
  await assertRejects(() => verifyQuote(token.replace(/^./, token[0] === 'a' ? 'b' : 'a'), secret));
});
Deno.test('quantity must be positive safe integer', () => {
  for (const quantity of [0, -1, 1.5, '2', NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) assertThrows(() => validateItems([{ id: '0593', quantity }]));
  validateItems([{ id: '0593', quantity: 332 }]);
});
Deno.test('cart hash ignores client prices and detects quantity and design changes', async () => {
  const a = [{ id: '0593', quantity: 332, price: 290 }];
  assertEquals(await digest(cartIdentity(a)), await digest(cartIdentity([{ ...a[0], price: 1 }])));
  assertEquals(await digest(cartIdentity(a)) === await digest(cartIdentity([{ ...a[0], quantity: 333 }])), false);
  assertEquals(await digest(cartIdentity(a)) === await digest(cartIdentity([{ ...a[0], design_id: 'changed' }])), false);
});
Deno.test('same total with different base prices requires new confirmation', async () => {
  const a = { subtotal: 10000, discount: 0, total: 10000, cart_items: [{ id: '0593', quantity: 1, price: 310, pricing: { baseUnitPrice: 310, surchargePct: 0 } }] };
  const b = { ...a, cart_items: [{ ...a.cart_items[0], pricing: { baseUnitPrice: 290, surchargePct: 0 } }] };
  assertEquals(await digest(priceIdentity(a)) === await digest(priceIdentity(b)), false);
});
Deno.test('client cannot choose order ID status or server reservation', () => {
  const order = cleanOrder({ cart_items: [{ id: '0593', quantity: 1 }], id: 'attacker', order_status: 'confirmed', client_id: 'other' }, false);
  assertEquals(order.id, undefined); assertEquals(order.order_status, undefined); assertEquals(order.client_id, undefined);
});
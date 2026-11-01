export const QUOTE_TTL_MS = 30 * 60 * 1000;
export class CheckoutError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); }
}
export function canonical(value: any): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().filter(k => value[k] !== undefined).map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value ?? null);
}
export function validateItems(items: any) {
  if (!Array.isArray(items) || !items.length || items.length > 200) throw new CheckoutError('INVALID_CART', 'Корзина пуста или содержит слишком много позиций.');
  for (const item of items) {
    if (!item || typeof item.id !== 'string' || !item.id.trim() || item.id.length > 100) throw new CheckoutError('INVALID_PRODUCT', 'Некорректный товар. Обновите корзину.');
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) throw new CheckoutError('INVALID_QUANTITY', 'Количество должно быть положительным целым числом.');
  }
}
export function cartIdentity(items: any[]) {
  validateItems(items);
  return items.map(i => ({
    id: i.id, quantity: i.quantity, lineKey: i.lineKey ?? null,
    customization: i.customization ? {
      main: i.customization.main?.colorId ?? null,
      side: i.customization.side?.colorId ?? null,
      accent: i.customization.accent ? { type: i.customization.accent.type, colorId: i.customization.accent.colorId } : null,
    } : null,
    design_id: i.design_id ?? null, options: i.options ?? null,
    customized_sides: i.customized_sides ?? null,
    production_pdf_url: i.production_pdf_url ?? null, preview_urls: i.preview_urls ?? null,
  })).sort((a, b) => canonical(a).localeCompare(canonical(b)));
}
export function priceIdentity(priced: any) {
  return { subtotal: priced.subtotal, discount: priced.discount, total: priced.total,
    lines: priced.cart_items.map((i: any) => ({ id: i.id, lineKey: i.lineKey ?? null, quantity: i.quantity,
      base: i.pricing.baseUnitPrice, surcharge: i.pricing.surchargePct, price: i.price,
    })).sort((a: any, b: any) => canonical(a).localeCompare(canonical(b))) };
}
export async function digest(value: any) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(value)));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}
function encode(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decode(text: string) {
  return Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
}
async function key(secret: string) {
  if (!secret) throw new CheckoutError('PRICING_UNAVAILABLE', 'Не удалось проверить цены. Попробуйте позже.', 503);
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export async function signQuote(cart: string, prices: string, secret: string, now = Date.now()) {
  const payload = encode(new TextEncoder().encode(JSON.stringify({ v: 2, cart, prices, issued: now, expires: now + QUOTE_TTL_MS })));
  const signature = await crypto.subtle.sign('HMAC', await key(secret), new TextEncoder().encode(payload));
  return `${payload}.${encode(new Uint8Array(signature))}`;
}
export async function verifyQuote(token: any, secret: string, now = Date.now(), allowExpired = false) {
  try {
    if (typeof token !== 'string' || token.length > 2000) throw new Error();
    const parts = token.split('.');
    if (parts.length !== 2 || !await crypto.subtle.verify('HMAC', await key(secret), decode(parts[1]), new TextEncoder().encode(parts[0]))) throw new Error();
    const claims = JSON.parse(new TextDecoder().decode(decode(parts[0])));
    if (claims.v !== 2 || typeof claims.cart !== 'string' || typeof claims.prices !== 'string' || !Number.isFinite(claims.expires) || claims.expires - claims.issued !== QUOTE_TTL_MS || claims.issued > now + 60000) throw new Error();
    if (!allowExpired && claims.expires <= now) throw new CheckoutError('QUOTE_EXPIRED', 'Срок проверки цены истёк. Проверьте сумму заново.', 409);
    return claims;
  } catch (e) {
    if (e instanceof CheckoutError) throw e;
    throw new CheckoutError('INVALID_QUOTE', 'Не удалось подтвердить расчёт. Проверьте сумму заново.', 400);
  }
}
export function cleanOrder(raw: any, requireContact: boolean) {
  if (!raw || typeof raw !== 'object') throw new CheckoutError('INVALID_ORDER', 'Не удалось прочитать заказ.');
  validateItems(raw.cart_items);
  const out: any = { cart_items: raw.cart_items, subtotal: raw.subtotal, discount: raw.discount, total: raw.total };
  for (const field of ['name', 'phone', 'email', 'yandex_address', 'comment', 'payment', 'delivery']) {
    if (raw[field] !== undefined && (typeof raw[field] !== 'string' || raw[field].length > 5000)) throw new CheckoutError('INVALID_ORDER', 'Некорректные данные заказа.');
    out[field] = typeof raw[field] === 'string' ? raw[field].trim() : '';
  }
  out.subscribe = raw.subscribe !== false;
  if (requireContact && (!out.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email) || out.phone.replace(/\D/g, '').length < 10)) throw new CheckoutError('INVALID_CONTACT', 'Укажите имя, телефон и корректный email.');
  return out;
}
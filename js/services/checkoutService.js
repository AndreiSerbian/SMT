import { supabase } from '../utils/supabase.js';
export function checkoutIdentity(order) {
  return JSON.stringify({ ...order, cart_items: order.cart_items.map(({ price, pricing, ...item }) => item), subtotal: undefined, total: undefined, discount: undefined });
}
export async function checkoutRequest(body) {
  const response = await fetch(`${supabase.supabaseUrl}/functions/v1/order-processing`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: supabase.supabaseKey },
    body: JSON.stringify({ protocol: 2, ...body }), signal: AbortSignal.timeout(45000),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    const error = new Error(data.error || 'Не удалось проверить заказ. Попробуйте позже.');
    error.code = data.code; error.quote = data.quote; throw error;
  }
  return data;
}
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function confirmQuote(quote, previousTotal) {
  return new Promise(resolve => {
    const dialog = document.createElement('dialog');
    dialog.className = 'checkout-confirm';
    dialog.setAttribute('aria-labelledby', 'quote-title');
    dialog.innerHTML = `<h2 id="quote-title">Подтверждение суммы</h2>
      ${Number(previousTotal) !== quote.total ? `<p role="status">Сумма обновилась: ${escape(previousTotal)} ₽ → ${escape(quote.total)} ₽</p>` : ''}
      <div class="checkout-lines">${quote.cart_items.map(i => `<div><strong>${escape(i.name)}</strong><br>Арт. ${escape(i.artikul)} · ${escape(i.quantity)} × ${escape(i.price)} ₽ = ${escape(i.quantity * i.price)} ₽</div>`).join('')}</div>
      <p>Подытог: ${escape(quote.subtotal)} ₽<br>Скидка (${escape(quote.discountPct)}%): ${escape(quote.discount)} ₽</p>
      <p class="checkout-total">Итого: ${escape(quote.total)} ₽</p>
      <div class="checkout-actions"><button type="button" class="pricing-button pricing-button-secondary" data-cancel>Вернуться</button><button type="button" class="pricing-button" data-confirm>Подтвердить ${escape(quote.total)} ₽</button></div>`;
    const done = accepted => { dialog.close(); dialog.remove(); resolve(accepted); };
    dialog.querySelector('[data-cancel]').onclick = () => done(false);
    dialog.querySelector('[data-confirm]').onclick = () => done(true);
    dialog.addEventListener('cancel', e => { e.preventDefault(); done(false); });
    document.body.append(dialog); dialog.showModal();
  });
}
import { supabase } from '../utils/supabase.js';
import { validPrice, priceDifferences, patchSnapshotPrices } from '../services/priceManagement.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export class AdminPricesComponent {
  async mount(container) {
    this.container = container;
    container.innerHTML = `<section class="pricing-panel"><h2>Управление ценами</h2>
      <p class="pricing-message" data-message role="status">Загрузка цен...</p>
      <div class="pricing-toolbar"><label>Категория<select data-category><option value="">Все категории</option></select></label>
      <label>Цена категории, ₽<input data-bulk-price type="number" min="0.01" step="0.01"></label><button class="pricing-button" data-bulk>Сохранить для категории</button></div>
      <div class="pricing-toolbar"><button class="pricing-button pricing-button-secondary" data-check>Проверить цены на сайте</button><button class="pricing-button" data-export>Подготовить обновление</button>
      <a hidden data-download-snapshot download="products-public.json" class="pricing-button pricing-button-secondary">Скачать каталог</a><a hidden data-download-version download="catalog-version.json" class="pricing-button pricing-button-secondary">Скачать версию</a></div>
      <p class="pricing-message" data-published role="status">Публикация ещё не проверена.</p>
      <div class="pricing-table-wrap"><table class="pricing-table"><thead><tr><th>Артикул</th><th>Товар</th><th>Цена, ₽</th><th></th></tr></thead><tbody></tbody></table></div></section>`;
    this.urls = [];
    container.querySelector('[data-category]').onchange = () => this.renderRows();
    container.querySelector('[data-bulk]').onclick = () => this.saveBulk();
    container.querySelector('[data-check]').onclick = () => this.checkPublished();
    container.querySelector('[data-export]').onclick = () => this.prepareExport();
    container.querySelector('tbody').onclick = e => { const button = e.target.closest('[data-save]'); if (button) this.saveRow(button); };
    try {
      const { data: categories, error } = await supabase.from('categories').select('id, name').eq('is_active', true).order('sort_order');
      if (error) throw error;
      container.querySelector('[data-category]').innerHTML += categories.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
      await this.load();
    } catch (error) { this.message('Не удалось загрузить цены. Попробуйте позже.', true); }
  }
  message(text, error = false) { const el = this.container.querySelector('[data-message]'); el.textContent = text; el.dataset.error = String(error); }
  async load() {
    const { data, error } = await supabase.from('products').select('id, artikul, name, category_id, price_rub, is_active').order('artikul').limit(1000);
    if (error) throw error;
    this.products = data;
    this.renderRows(); this.message(`Загружено ${data.length} товаров. Сохранение цены и публикация на сайте — отдельные действия.`);
  }
  renderRows() {
    const category = this.container.querySelector('[data-category]').value;
    this.container.querySelector('tbody').innerHTML = this.products.filter(p => !category || p.category_id === category).map(p => `<tr data-id="${esc(p.id)}"><td>${esc(p.artikul)}</td><td>${esc(p.name)}${p.is_active ? '' : ' · скрыт'}</td><td><input aria-label="Цена ${esc(p.artikul)}" type="number" min="0.01" step="0.01" value="${esc(p.price_rub)}"></td><td><button class="pricing-button pricing-button-secondary" data-save>Сохранить</button></td></tr>`).join('');
  }
  invalidateExport() {
    this.urls.forEach(url => URL.revokeObjectURL(url)); this.urls = [];
    for (const selector of ['[data-download-snapshot]', '[data-download-version]']) this.container.querySelector(selector).hidden = true;
    this.container.querySelector('[data-published]').textContent = 'Цена сохранена в базе. Публикация на сайте не подтверждена; подготовьте обновление.';
  }
  async saveRow(button) {
    if (this.busy) return;
    const row = button.closest('tr');
    try {
      const price = validPrice(row.querySelector('input').value);
      this.busy = true; button.disabled = true;
      const { data, error } = await supabase.from('products').update({ price_rub: price }).eq('id', row.dataset.id).select('id, price_rub');
      if (error || data?.length !== 1) throw error || new Error('Нет разрешения на сохранение.');
      this.invalidateExport(); await this.load(); this.message(`Цена сохранена: ${price} ₽. На сайте она ещё не подтверждена.`);
    } catch (error) { this.message(error.message || 'Цена не сохранена. Попробуйте позже.', true); }
    finally { this.busy = false; button.disabled = false; }
  }
  async saveBulk() {
    if (this.busy) return;
    const category = this.container.querySelector('[data-category]').value;
    const button = this.container.querySelector('[data-bulk]');
    try {
      if (!category) throw new Error('Выберите одну категорию.');
      const price = validPrice(this.container.querySelector('[data-bulk-price]').value);
      const count = this.products.filter(p => p.category_id === category).length;
      if (!count) throw new Error('В категории нет товаров.');
      if (!confirm(`Установить ${price} ₽ для всех ${count} товаров категории, включая скрытые?`)) return;
      this.busy = true; button.disabled = true;
      const { data, error } = await supabase.from('products').update({ price_rub: price }).eq('category_id', category).select('id');
      if (error || !data?.length) throw error || new Error('Нет разрешения на сохранение.');
      this.invalidateExport(); await this.load(); this.message(`Сохранено: ${data.length} товаров по ${price} ₽. Подготовьте обновление сайта.`);
    } catch (error) { this.message(error.message, true); }
    finally { this.busy = false; button.disabled = false; }
  }
  async publishedSnapshot() {
    const origin = location.hostname === 'giftboxopt.ru' || location.hostname === 'www.giftboxopt.ru' ? location.origin : 'https://giftboxopt.ru';
    const response = await fetch(`${origin}/data/products-public.json?t=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('Не удалось проверить опубликованный каталог.');
    const snapshot = await response.json();
    if (!Array.isArray(snapshot.products)) throw new Error('Некорректный каталог сайта.');
    return snapshot;
  }
  async checkPublished() {
    const el = this.container.querySelector('[data-published]');
    el.textContent = 'Проверяем сайт...';
    try {
      await this.load();
      const snapshot = await this.publishedSnapshot();
      const diff = priceDifferences(this.products, snapshot);
      el.textContent = diff.changed.length || diff.removed.length ? `На сайте отличаются ${diff.changed.length} цен; удалённых или скрытых позиций: ${diff.removed.length}. Нужна публикация.` : `Цены совпадают с сайтом. Версия ${snapshot.version}. Проверено ${new Date().toLocaleString('ru-RU')}.`;
    } catch { el.textContent = 'Не удалось проверить сайт. Это не подтверждает публикацию; повторите проверку на giftboxopt.ru.'; }
  }
  async prepareExport() {
    if (this.busy) return;
    this.busy = true;
    const button = this.container.querySelector('[data-export]'); button.disabled = true;
    try {
      await this.load();
      const snapshot = patchSnapshotPrices(await this.publishedSnapshot(), this.products);
      delete snapshot.version;
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(snapshot)));
      snapshot.version = Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
      this.invalidateExport();
      const version = { version: snapshot.version, generatedAt: snapshot.generatedAt, productsCount: snapshot.products.length };
      for (const [selector, content] of [['[data-download-snapshot]', snapshot], ['[data-download-version]', version]]) {
        const url = URL.createObjectURL(new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }));
        this.urls.push(url); const link = this.container.querySelector(selector); link.href = url; link.hidden = false;
      }
      this.message('Обновление подготовлено. Загрузите каталог в папку data на TimeWeb, затем файл версии. После загрузки проверьте сайт.');
    } catch (error) { this.message(error.message || 'Не удалось подготовить обновление.', true); }
    finally { this.busy = false; button.disabled = false; }
  }
  destroy() { this.urls?.forEach(url => URL.revokeObjectURL(url)); }
}
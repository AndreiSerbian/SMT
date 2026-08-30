import { productsService } from './productsService.js';

/**
 * mockupService — статический справочник мокап-моделей (public/data/mockups.json).
 * Палитра берётся из существующего каталога (productsService.getActiveColors),
 * отдельного источника цветов не создаётся.
 * Никаких запросов к Supabase для POC: только локальный JSON + локальный SVG.
 */

const MOCKUPS_URL = '/data/mockups.json';

let _mockupsCache = null;
let _paletteCache = null;

async function loadMockups() {
  if (_mockupsCache) return _mockupsCache;
  const res = await fetch(MOCKUPS_URL, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`mockups.json HTTP ${res.status}`);
  _mockupsCache = await res.json();
  return _mockupsCache;
}

/**
 * Найти модель мокапа для товара.
 * Lookup строго по product.category_slug (значение уже присутствует в каталоге).
 */
async function getModelForProduct(product) {
  const data = await loadMockups();
  const slug = product?.category_slug;
  if (!slug) return null;
  const mapping = (data.product_mapping || []).find(m => m.category_slug === slug);
  if (!mapping) return null;
  return (data.models || []).find(
    m => m.id === mapping.model && (m.variant || 'default') === (mapping.variant || 'default')
  ) || null;
}

/**
 * Доступен ли предпросмотр конкретного view.
 * В POC кнопка привязана именно к closed_45: нужен ready-статус и непустой ассет.
 */
function isPreviewAvailable(model, view = 'closed_45') {
  if (!model || !model.views || !model.views[view]) return false;
  const v = model.views[view];
  return v.status === 'ready' && v.asset != null;
}

/**
 * Палитра из существующего каталога. Нормализуем к { id, name, hex }.
 * id = hex-ключ цвета (стабилен и уникален в каталоге).
 */
async function getPalette() {
  if (_paletteCache) return _paletteCache;
  const colors = await productsService.getActiveColors();
  _paletteCache = (colors || []).map(c => ({
    id: String(c.hex_code || '').toLowerCase(),
    name: c.russian_name || c.name || c.hex_code,
    hex: c.hex_code
  })).filter(c => c.hex);
  return _paletteCache;
}

/**
 * Запрет совпадения внешнего и второго цвета для two_color (бант не учитывается).
 */
function validateTwoColor(config, model) {
  if (!model || !model.two_color || !model.two_color.enabled) return { ok: true };
  if (!model.two_color.disallow_same_color) return { ok: true };
  if (config.outer_color_id && config.inner_side_color_id &&
      config.outer_color_id === config.inner_side_color_id) {
    return { ok: false, reason: 'Второй цвет не может совпадать с внешним цветом коробки.' };
  }
  return { ok: true };
}

/**
 * Предварительная цена: basePrice (текущая номинальная цена товара) × 1.10.
 * Округление до целого рубля.
 */
function estimatePrice(basePrice, model) {
  const percent = (model && typeof model.price_modifier_percent === 'number')
    ? model.price_modifier_percent : 10;
  return Math.round(Number(basePrice || 0) * (1 + percent / 100));
}

export const mockupService = {
  loadMockups,
  getModelForProduct,
  isPreviewAvailable,
  getPalette,
  validateTwoColor,
  estimatePrice
};

export default mockupService;

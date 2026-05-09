
# Sync `full cover small` + 4 other collections to local structure, add Media Resolver и Image Size Module

## 0. Поправка к исходным вводным

Проверка БД показала, что **исходное допущение из промпта неверно**: для `full cover small` в `products.photos` сейчас лежат пути вида
`images/Full%20Cover%20Small/Black/0702_1.JPG` (CamelCase + `{artikul}_{N}.JPG`),
а не `images/full cover small/Black/slide1.webp`.

Локально же действительно lowercase + `slide1.webp..slide4.webp`.

Поэтому без выравнивания БД resolver «никогда не попадёт» в локальные файлы.
Согласованное решение: **сначала привести Supabase к локальной схеме**, потом обновить `products.photos`, затем уже подключать resolver.

## 1. Scope — 5 локальных коллекций

```text
public/images/
  small with bow/
  medium with bow/
  big with bow/
  boxes with handles/
  full cover small/
```

В каждой — папки цветов и `slide1.webp..slide4.webp`. Только эти 5 коллекций трогаем на этой итерации. `designs/`, `hero.webp`, `logo.svg`, `placeholder.svg`, видео — не трогаем.

## 2. Этап A — синхронизация Supabase Storage и БД (под локальную схему)

### A1. Аудит-скрипт `scripts/audit-media-sync.mjs`
Read-only:
- Перечисляет ВСЕ объекты в bucket `product-media/images/` (через service role).
- Сравнивает с локальным деревом `public/images/` (5 коллекций).
- Для каждого товара из `products` (5 коллекций) проверяет, что каждая ссылка `photos[]` указывает на путь, который существует и локально, и в Storage в виде `images/<collection lowercase>/<Color>/slide{N}.webp`.
- Печатает отчёт: `match / missing-in-storage / missing-locally / wrong-name (старый artikul_N.JPG) / wrong-case`.

Никаких изменений не делает.

### A2. Заливка недостающих `slideN.webp` в Supabase
Скрипт `scripts/upload-local-to-storage.mjs`:
- Для каждой из 5 коллекций обходит локальные `slide{1..4}.webp`.
- Заливает в bucket `product-media` по пути `images/<collection lowercase>/<Color>/slide{N}.webp` через service role с `upsert: true`, `contentType: 'image/webp'`, `cacheControl: '31536000'`.
- Не удаляет старые `Full Cover Small/Black/0702_1.JPG` (оставляем как archive до подтверждения, чтобы не сломать никакие внешние ссылки/индексы).

### A3. SQL-миграция: переписать `products.photos`
Только для 5 коллекций, детерминированно по `artikul + color_hex`:

```sql
UPDATE products
SET photos = ARRAY[
  base_url || '/' || coll || '/' || color_folder || '/slide1.webp',
  base_url || '/' || coll || '/' || color_folder || '/slide2.webp',
  base_url || '/' || coll || '/' || color_folder || '/slide3.webp',
  base_url || '/' || coll || '/' || color_folder || '/slide4.webp'
]
```

Маппинг `color_hex → color_folder` и `artikul-range → collection` строится исходя из текущих данных:
- 0702..0708 → `full cover small` + Black/White/Red/Orange/Blue/Silver/Gold;
- остальные 4 коллекции — по аналогии с уже существующими корректными путями (там реально lowercase, проверим перед миграцией).

Файлы `videos[]` и любые товары вне 5 коллекций НЕ трогаем.

### A4. Резервная копия
Перед UPDATE — `CREATE TABLE products_backup_<date> AS SELECT id, photos, videos FROM products;` для отката.

## 3. Этап B — Media Resolver (frontend)

После A структура local ↔ Supabase идентична. Resolver становится максимально простым.

### B1. `public/media-manifest.json`
Генерируется скриптом `scripts/build-media-manifest.mjs` из `public/images/` и `public/videos/`. Содержит плоский set путей (с реальным регистром):
```json
{
  "version": 1,
  "files": {
    "images/full cover small/Black/slide1.webp": true,
    "images/full cover small/Black/slide1-320.webp": true,
    "images/full cover small/Black/slide1-480.webp": true,
    ...
  }
}
```
Никаких сетевых проверок, никакого `fetch()` на каждое фото.

### B2. `js/services/mediaResolver.js`
API:
- `loadMediaManifest()` — `fetch('/media-manifest.json')` один раз, кэш в памяти.
- `extractStoragePathFromSupabaseUrl(url)` — отрезает `…/product-media/`, возвращает `images/...`.
- `normalizeMediaPath(path)` — точечно приводит CamelCase для исторических ссылок (`Full Cover Small` → `full cover small`, `Small With Bow` → `small with bow` и т.д.). Без `toLowerCase()` всего пути и без переименования файлов.
- `resolveImageUrl(originalUrl, { width? })` — если файл (или его `-320`/`-480` вариант) есть в манифесте → возвращает локальный `/images/...`; иначе оригинальный Supabase URL.
- `resolveVideoUrl(originalUrl)` — то же для `videos/`.

Resolver НЕ знает про размеры контейнеров. Это ответственность Image Size Module.

## 4. Этап C — Image Size Module

### C1. `scripts/build-image-variants.mjs`
`sharp`-скрипт. Идёт по 5 коллекциям, для каждого `slideN.webp` создаёт:
- `slideN-320.webp` (quality 78)
- `slideN-480.webp` (quality 80)

Оригинал не перезаписывает. Уже существующие варианты пропускает. Не трогает `hero.webp`, `logo.svg`, `placeholder.svg`, видео, `designs/`. Выводит счётчики processed/generated/skipped/errors.

После этого — `build-media-manifest.mjs` пересобирает манифест с новыми путями.

### C2. `js/services/imageSizeService.js`
Чистый модуль про размеры/атрибуты. Никаких знаний про Supabase.

```js
const SCENARIOS = {
  PRODUCT_CARD:               { defaultWidth: 320, widths: [320,480,786], sizes: "(max-width: 768px) 50vw, 216px",  loading: "lazy",  fetchpriority: "low"  },
  PRODUCT_CARD_FIRST_SCREEN:  { defaultWidth: 480, widths: [320,480,786], sizes: "(max-width: 768px) 50vw, 216px",  loading: "eager", fetchpriority: "high" },
  CATEGORY_SLIDER:            { defaultWidth: 480, widths: [320,480,786], sizes: "(max-width: 768px) 90vw, 378px",  loading: "lazy",  fetchpriority: "low"  },
  PRODUCT_PAGE_MAIN:          { defaultWidth: 480, widths: [480,786],     sizes: "(max-width: 768px) 100vw, 600px", loading: "eager", fetchpriority: "high" },
  PRODUCT_GALLERY:            { defaultWidth: 786, widths: [480,786],     sizes: "(max-width: 768px) 100vw, 786px", loading: "lazy",  fetchpriority: "low"  },
  CART_THUMBNAIL:             { defaultWidth: 160, widths: [160,320],     sizes: "80px",                            loading: "lazy",  fetchpriority: "low"  },
  HERO:                       { sizes: "100vw",                                                                     loading: "eager", fetchpriority: "high" },
};

getImageAttrs(localOrFallbackUrl, scenario) → { src, srcset, sizes, loading, decoding, fetchpriority }
```

Логика для local URL: подставляет `-320`/`-480` суффиксы. Для Supabase fallback (если что-то не локально) — `srcset` опускается, отдаётся `src` как есть; warning только в dev.

### C3. CSS
Привести `.category-slide-image`, `.product-image`, `.product-gallery-image`, `.swiper-slide img`, `.hero img` к:
```css
width: 100%;
height: 100%;
object-fit: contain;
aspect-ratio: 786 / 1020;
```
Чтобы коробки не обрезались и не было CLS.

## 5. Component Integration

| Файл | Изменение |
|---|---|
| `js/services/storageHelper.js` / `getImageUrl()` | Прогонять результат через `mediaResolver.resolveImageUrl()` |
| `js/components/publicProductsComponent.js` | `renderCategoryCard` → `imageSizeService.getImageAttrs(url, 'CATEGORY_SLIDER')`; первая 1–2 видимых карточки → `PRODUCT_CARD_FIRST_SCREEN`; обычные → `PRODUCT_CARD` |
| `js/components/productComponent.js` | Главное фото → `PRODUCT_PAGE_MAIN`; галерея → `PRODUCT_GALLERY`; видео `preload="none"`, `poster` = первое фото товара |
| `js/components/homeComponent.js` | Убрать `/images/hero.jpg`, использовать `/images/hero.webp`, `eager + fetchpriority="high"` |
| `js/services/swiperService.js` | При `selectCategoryColor` пересоздавать `<img>` через `imageSizeService` |
| `js/components/adminProductsComponent.js` | Не трогаем медиа-логику, только убедиться, что превью продолжают работать (admin uploads → Supabase fallback путь) |

Корзина и order flow — нетронуты.

## 6. Что НЕ делаем

- Не удаляем старые `Full Cover Small/Black/0702_*.JPG` из Supabase (оставляем как archive).
- Не трогаем edge functions / `media-manager`.
- Не трогаем `designs/`, `videos/Video N.mp4` (только `preload="none"` атрибут).
- Не используем AVIF.
- Не делаем on-the-fly Supabase Image Transformations.
- Не делаем `fetch()` каждого изображения для проверки.

## 7. Risks & Mitigations

| Риск | Митигация |
|---|---|
| UPDATE products.photos сломает товары, если упустили коллекцию/цвет | Backup-таблица + dry-run report из A1 перед миграцией |
| Linux case-sensitivity на Timeweb | После A: и Storage, и local, и БД — все lowercase в именах коллекций; имена цветов оставляем как сейчас в БД (`Black/Blue/...`) |
| Старые внешние ссылки на `0702_1.JPG` | Файлы остаются в Storage, не удаляем |
| Sharp не установлен | Поставим dev-зависимость только для скрипта |
| Swiper ломается из-за нового `srcset` | `imageSizeService` отдаёт стандартный HTML-атрибут, Swiper к нему индифферентен; проверим вручную |

## 8. Testing Plan

Перед мерджем:
- `node scripts/audit-media-sync.mjs` → 0 mismatches для 5 коллекций.
- Главная (desktop+mobile): все карточки грузятся с `/images/...` (Network), нет 404, нет Supabase-запросов на фото 5 коллекций.
- Карточка `full cover small` (артикулы 0702–0708): открывается, цвета переключаются, slider работает, фото локальные.
- Страница товара: главное фото 480w/786w, галерея 786w, видео `preload="none"`.
- Cart: миниатюры 160w.
- Корзина → order: проходит без ошибок.
- PageSpeed: oversized images warning уменьшается.
- `npm run build` проходит, `dist/images/` содержит варианты `-320`/`-480`.

## 9. Порядок реализации (после approve)

1. A1: написать audit скрипт, прогнать, показать отчёт.
2. A2: залить slideN.webp в Storage (5 коллекций).
3. A3: миграция БД (UPDATE photos) + backup.
4. C1: сгенерировать `-320`/`-480` варианты локально.
5. B1: сгенерировать `media-manifest.json`.
6. B2 + C2: написать `mediaResolver.js` и `imageSizeService.js`.
7. Подключить в компоненты (раздел 5).
8. CSS-адаптация (C3).
9. Smoke-test по разделу 8, затем `npm run build`.

Жду подтверждения, чтобы начать с шага 1 (audit-скрипт без изменений).

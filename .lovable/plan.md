# Мокап-система двухцветной кастомизации — Этап 0 + POC

Подтверждённые решения: конструкция — **коробка на магнитах**, ракурс — **45° закрытая**, первая зона — **боковушка (side)**, источник мокапа — **векторный SVG** (SVG сам является мокапом, без фотоподложки и растровых масок).

Ревью учтено: палитра не дублируется, правила `two_color` и `ribbon` разделены, добавлен `view.status`, mapping идёт по фактическим `category_slug`, схема заложена под `model + variant`.

## 0. Обязательный read-only аудит перед кодом

Перед любыми изменениями провести read-only аудит и подтвердить фактические факты проекта:
- реальные пути и структура объекта товара в `products-public.json`;
- фактические `category_slug` (не выдумывать);
- реальное API `productsService` — точные имена методов получения товаров, категорий и цветов (`getActiveColors` / `getActiveCategories` считать гипотезой, пока не подтверждены в коде); если API называется иначе — использовать существующее;
- текущий механизм выбора цвета в карточке товара (`colorService` / `productComponent`) — базовый цвет берётся оттуда, а не заводится заново;
- существующий денежный форматтер/округление — новый не создавать.

Дублирующие сервисы или вторые источники тех же данных не создавать.

## Приоритет POC: качество SVG

Главный неизвестный фактор — сам ассет `public/mockups/magnet_box/closed_45.svg`. Геометрия должна соответствовать реальному товару: верхняя внешняя грань, передняя внешняя грань, видимая боковушка, честные границы между поверхностями, перспектива ~45°, тени и блики, без выдуманных конструктивных элементов. Ключевой тест: смена `--zone-side` перекрашивает ровно ту боковушку, что выделена на реальной фотографии. Если SVG выглядит плохо — доводим ассет, к `open_45` не переходим.



## 1. Справочник мокап-моделей — `public/data/mockups.json`

Статический файл, никаких запросов к Supabase (NFR-3). Содержит **только** модели, зоны, ассеты и mapping. **Палитры внутри нет.**

```json
{
  "models": [
    {
      "id": "magnet_box",
      "variant": "default",
      "zones": ["outer", "inner", "side"],
      "views": {
        "closed_45": { "asset": "/mockups/magnet_box/default/closed_45.svg", "status": "ready" },
        "open_45":   { "asset": null, "status": "planned" }
      },
      "two_color": {
        "enabled": true,
        "outer_zone": "outer",
        "secondary_zones": ["inner", "side"],
        "disallow_same_color": true
      },
      "ribbon": { "enabled": false },
      "price_modifier_percent": 10
    },
    {
      "id": "bow_box",
      "variant": "default",
      "zones": ["outer", "inner", "side", "ribbon"],
      "views": { "closed_45": { "asset": null, "status": "planned" } },
      "two_color": {
        "enabled": true,
        "outer_zone": "outer",
        "secondary_zones": ["inner", "side"],
        "disallow_same_color": true
      },
      "ribbon": { "enabled": true, "independent": true, "allow_same_color": true },
      "price_modifier_percent": 10
    },
    {
      "id": "bag_box",
      "variant": "default",
      "zones": ["outer", "side", "handle"],
      "views": { "closed_45": { "asset": null, "status": "planned" } },
      "two_color": {
        "enabled": true,
        "outer_zone": "outer",
        "secondary_zones": ["side"],
        "disallow_same_color": true
      },
      "ribbon": { "enabled": false },
      "price_modifier_percent": 10
    }
  ],
  "product_mapping": [
    { "category_slug": "full-cover-small", "model": "magnet_box", "variant": "default" }
  ]
}
```

**Category slugs не выдумывать.** Перед заполнением `product_mapping` прочитать фактические значения из `public/data/products-public.json`. Проверенные на текущий момент slug'и: `bow-box-small`, `bow-box-medium`, `bow-box-big`, `full-cover-small`, `handle-box-small` — при реализации перепроверить и использовать ровно то, что в файле. Если slug изменился — mapping пишется по фактическому.

Схема с `model + variant` заложена сразу: когда пропорции размеров одной конструкции разойдутся (например 21×15×8 против 30×24×10), добавляется отдельный variant со своим SVG — без переделки схемы. Naming convention: `public/mockups/{model}/{variant}/{view}.svg` (например `/mockups/magnet_box/default/closed_45.svg`, будущие `/mockups/magnet_box/small/closed_45.svg`, `/mockups/magnet_box/big/closed_45.svg`). Для POC variant = `default`.

## 2. Палитра — единственный источник

Палитра берётся из уже существующего `public/data/products-public.json` (блок `colors`) через фактический публичный API `productsService`, подтверждённый в ходе read-only аудита (раздел 0). Не создавать новый источник палитры. Если отдельного метода получения цветов нет — переиспользовать существующую JSON-first логику проекта. `mockupService` только нормализует форму к `{ id, name, hex }` (id = slug/hex-ключ цвета из каталога).

## 3. Ассет — `public/mockups/magnet_box/default/closed_45.svg`

Структура:

```text
<svg>
  <g id="zones">
    <path id="zone-outer-top" />
    <path id="zone-outer-front" />
    <path id="zone-side" />
  </g>
  <g id="lighting"> ... градиенты, тени, блики ... </g>
</svg>
```

- заливка: `#zone-side { fill: var(--zone-side, #E5E5E5); }`, аналогично для outer-зон;
- объём моделируется собственными средствами SVG: linearGradient/radialGradient, полупрозрачные shadow-полигоны, highlight-полигоны. `mix-blend-mode` допустим как дополнение, но критической зависимости от него нет (кросс-браузерная стабильность);
- боковушка = только видимый прямоугольник боковой панели (п. 11.3 PRD); клеевые и треугольные элементы зонами не являются;
- `zone-inner` в closed_45 отсутствует — внутренняя часть не видна. `inner` живёт в модели как семантическая зона; в closed_45 второй цвет применяется только к `zone-side`, в будущем open_45 тот же `inner_side_color_id` применится к `zone-inner` и `zone-side` одновременно;
- в ассете запрещены `<script>`, внешние `href`, `foreignObject`.

Перекраска выполняется локально изменением CSS custom properties на корневом SVG — без повторной загрузки ассета, без Canvas и без сетевого запроса.

Критерий качества первого SVG: пользователь однозначно видит, что боковая поверхность стала другого цвета. Фотореализм — задача второго этапа.

## 4. Frontend

### `js/services/mockupService.js`
- загрузка и кэш `mockups.json`;
- `getModelForProduct(product)` — lookup строго по `product.category_slug`; если у товара нет slug, сервис резолвит его один раз через фактический публичный API категорий, подтверждённый в ходе read-only аудита (не предполагать имя метода), по `category_id` → `slug`. Никаких многоступенчатых «попробуем то, потом это»;
- `isPreviewAvailable(model, view = "closed_45")` = `model.views[view]?.status === "ready" && model.views[view]?.asset != null`. Кнопка POC привязана именно к `closed_45`, а не к «любому готовому view»;
- `getPalette()` — из каталога (см. п.2), fallback-цвет при неизвестном `color_id` (17.1);
- `validateTwoColor(config, model)` — запрет совпадения `outer_color_id` и `inner_side_color_id` при `two_color.disallow_same_color`; правило не применяется к банту;
- `estimatePrice(basePrice, model)` = `basePrice * 1.10`. `basePrice` = текущая номинальная цена выбранного товара, которую карточка уже использует в момент открытия POC (не новая цена из отдельного справочника, не минимальная цена категории, не цена другого цветового SKU). Округление через существующий денежный форматтер проекта (никакого `516.999999999`).

### `js/components/mockupPreviewModal.js`
- inline-вставка SVG: `fetch(assetUrl)` → текст → `DOMParser.parseFromString(..., 'image/svg+xml')` → взять `<svg>` → вставить в контейнер → `previewEl.style.setProperty('--zone-side', color.hex)`;
- палитра второго цвета; базовый внешний цвет = текущий выбранный цвет товара (read-only в POC);
- совпадающий с базовым цвет нельзя подтвердить, UI явно объясняет причину;
- подпись текущей конфигурации + «Предварительная цена: 517 ₽ · Финальная стоимость подтверждается менеджером»;
- accessibility: `role="dialog"`, `aria-modal="true"`, закрытие по Escape и по backdrop, focus trap, возврат фокуса на кнопку запуска, body scroll lock;
- мобильная раскладка: палитра прокручиваемой лентой снизу, preview на всю ширину;
- fallback при сбое SVG: показываем фото товара и мягкое сообщение «Не удалось загрузить предпросмотр. Попробуйте открыть его ещё раз.»; технические детали (404, parse error, network) — только в console.

### `js/components/productComponent.js`
Кнопка «Двухцветная коробка — предпросмотр» рядом с «Кастомизировать», рендерится только если `isPreviewAvailable`.

Корзина, заказ, Telegram, Supabase, `products-public.json`, customizer и Storage — не трогаем.

## 5. Документация — `docs/mockup-system.md`
Конструкции, зоны по каждой модели, правила цвета (включая исключение для банта), naming convention (`public/mockups/{model}/{variant}/{view}.svg`, id зон `zone-{name}`), схема `mockups.json`, схема customization config, чек-лист добавления новой модели/ракурса/зоны.

## Customization config (POC, только в памяти модалки)

```json
{
  "type": "two_color",
  "product_id": "0629",
  "mockup_model": "magnet_box",
  "variant": "default",
  "view": "closed_45",
  "outer_color_id": "white",
  "inner_side_color_id": "red",
  "ribbon_color_id": null,
  "estimated_price_modifier_percent": 10
}
```

## Acceptance Criteria (POC)

- Для реального товара mapped-категории отображается кнопка «Двухцветная коробка — предпросмотр».
- Для товара без `ready` asset кнопка не отображается.
- Modal открывается без перехода со страницы.
- Загружается `magnet_box/closed_45.svg`.
- Базовый внешний цвет автоматически соответствует текущему выбранному цвету товара.
- Второй цвет выбирается из существующей палитры каталога.
- Цвет, совпадающий с базовым, нельзя подтвердить; UI объясняет причину.
- Смена второго цвета перекрашивает только видимую боковушку; `outer-top`, `outer-front`, геометрия, границы, блики и тени не меняются.
- Смена цвета не инициирует повторную загрузку SVG.
- Отображается предварительная цена `base × 1.10` с корректным округлением.
- Никаких записей в Supabase / корзину / заказ.
- Закрытие и повторное открытие модалки не ломает карточку товара.
- При отсутствующем или невалидном SVG карточка товара продолжает работать.
- Desktop и mobile проходят ручной smoke-test (включая Escape, backdrop, focus trap).

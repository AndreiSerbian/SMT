# Mockup-система двухцветной кастомизации

POC-система предпросмотра двухцветной кастомизации коробок в карточке товара.
Фокус POC: **magnet_box → closed_45 → side** (видимая боковушка).

## Архитектура

```text
public/data/mockups.json            — статический справочник моделей/зон/ассетов/mapping
public/mockups/{model}/{variant}/{view}.svg — векторные мокапы
js/services/mockupService.js       — загрузка справочника, lookup по category_slug, палитра, оценка цены
js/components/mockupPreviewModal.js — модалка предпросмотра (inline SVG, CSS-переменные)
src/styles/mockupPreviewModal.css   — стили модалки
js/components/productComponent.js   — кнопка «Двухцветная коробка — предпросмотр»
```

Палитра берётся из существующего каталога (`productsService.getActiveColors()`).
Никаких запросов к Supabase / корзине / заказу в POC.

## Naming convention

`public/mockups/{model}/{variant}/{view}.svg`

- `magnet_box/default/closed_45.svg` (POC, готов)
- будущие: `magnet_box/small/closed_45.svg`, `magnet_box/big/closed_45.svg`

## Зоны (id внутри SVG)

- `zone-outer-top` — верхняя внешняя грань
- `zone-outer-front` — передняя внешняя грань
- `zone-side` — видимая боковушка (единственная перекрашиваемая зона в POC closed_45)
- `zone-inner` — семантическая зона (не видна в closed_45; будет видна в open_45)

Перекраска — изменением CSS custom properties на корневом SVG:
`--zone-outer-top`, `--zone-outer-front`, `--zone-side`. Без повторной загрузки ассета.

## Правила цвета

- `two_color.disallow_same_color = true` — второй цвет не может совпадать с внешним.
- Бант (`ribbon`) — независимая настройка, `allow_same_color = true`; в POC `ribbon.enabled = false`.
- Базовый внешний цвет = текущий выбранный цвет товара (`product.color_hex`).
- Второй цвет выбирается из палитры каталога.

## Цена

`estimatedPrice = basePrice × (1 + price_modifier_percent / 100)`

- `basePrice` — текущая номинальная цена выбранного товара (`product.price_rub`).
- `price_modifier_percent = 10` → `× 1.10`, округление до целого рубля.
- Цена предварительная; финальная стоимость подтверждается менеджером.

## Mapping товара → модель

Lookup строго по `product.category_slug` (значение присутствует в `products-public.json`).

| category_slug      | model       | variant |
|--------------------|-------------|---------|
| `full-cover-small` | `magnet_box`| default |

Перед изменением mapping — сверить slug с актуальным `products-public.json`.

## Доступность предпросмотра

`isPreviewAvailable(model, view = "closed_45")` =
`model.views[view]?.status === "ready" && model.views[view]?.asset != null`.

Кнопка POC привязана именно к `closed_45`.

## Fallback

При сбое загрузки/парсинга SVG модалка показывает фото товара и сообщение
«Не удалось загрузить предпросмотр. Попробуйте открыть его ещё раз.»
Технические детали — только в console. Карточка товара продолжает работать.

## Чек-лист добавления новой модели/ракурса/зоны

1. Добавить модель в `mockups.json` (зоны, views, правила цвета, price_modifier).
2. Создать SVG по naming convention с id зон `zone-{name}`.
3. Добавить запись в `product_mapping` по фактическому `category_slug`.
4. Если зона должна быть видна/перекрашиваема в новом view — убедиться, что
   `mockupPreviewModal` применяет к ней CSS-переменную.
5. Проверить: смена цвета перекрашивает только целевую зону; геометрия и освещение не меняются.

## Безопасность SVG

В ассете запрещены `<script>`, `foreignObject`, внешние `href`.
Загрузчик модалки дополнительно удаляет эти элементы после парсинга.

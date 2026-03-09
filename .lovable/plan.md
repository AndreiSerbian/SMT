

# Update Hero, "Что мы продаём" and "Наши преимущества" sections

## Scope

Update `js/components/homeComponent.js` lines 146–295 (the three static sections before the catalog) with the new content provided. No changes to nav, catalog, footer, or JS logic.

## Changes — single file: `js/components/homeComponent.js`

### 1. Hero section (lines 146–152)
Replace with new markup:
- Title: "SMT Premium Box"
- Subtitle: "Оптовые продажи подарочных упаковок"
- CTA button stays the same (`#catalog` link)

### 2. "Что мы продаём" section (lines 155–240)
Replace 5 old cards with 5 new cards from the provided HTML:
1. **Самосборные подарочные коробки** — with gift-box SVG icon, new description text
2. **Удобная упаковка** — with package SVG icon
3. **Конструкция на магнитах и лентах** — with magnet/ribbon SVG icon
4. **Для корпоративных подарков, мероприятий и продаж в розницу** — with B2B/B2C text badge instead of SVG
5. **Оптовые заказы** — with shopping-bag SVG icon, mentions 10,000₽ minimum and Wildberries

Keep the existing `hover:shadow` transition effects on cards.

### 3. "Наши преимущества" section (lines 244–295)
Replace 5 old cards with 4 new cards:
1. **Удобна при работе с партиями** — with batch/package SVG
2. **Кастомизация** — with pen/design SVG
3. **Надежная конструкция и впечатляющий внешний вид** — with shield/box SVG
4. **Забота о доставке** — with truck SVG

### 4. `index.html` fallback
Update the static SEO fallback `<main class="seo-fallback">` to match the new section headings and card titles so crawlers see consistent content.

## Files changed

| File | Lines | Action |
|---|---|---|
| `js/components/homeComponent.js` | 146–295 | Replace hero + two sections with new HTML |
| `index.html` | fallback block | Update card titles/descriptions to match |


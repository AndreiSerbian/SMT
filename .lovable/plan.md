# Read-Only Audit Report — Mockup POC Integration Points

Read-only audit of the current repository. No files modified. Each claim cites exact file + function/field/class.

---

## AUDIT RESULTS

### 1. products-public.json

- Path: `public/data/products-public.json`
- Top-level keys: `version`, `generatedAt`, `products`, `categories`, `colors`
- Structure of one real product object (`artikul: "0708"`):
  - `id`, `artikul`, `name`, `category_id` (int), `category` (string), `category_slug`
  - `size`, `sizeType`, `dimensions` (`{length,width,height}` in cm), `weight`
  - `color` (e.g. `"Gold"`), `color_hex` (e.g. `"#FFD700"`)
  - `price_rub` (int, e.g. `260`), `price` (float), `quantity`
  - `photo`, `photos` (array of local `/images/...` paths), `videos`, `model_url`
  - `is_new`, `is_hit`, `is_active`, `sort_order`
- Category fields: `category_id`, `category`, `category_slug`
- Price fields: `price_rub` (nominal int), `price`
- Color fields: `color_hex`, `color`

### 2. Categories

- Source: `products-public.json` → `categories` array, each `{ id, name, slug, sort_order, description, ... }`
- Factual `category_slug` values:
  - `bow-box-small`
  - `bow-box-medium`
  - `bow-box-big`
  - `handle-box-small`
  - `full-cover-small`
- `full-cover-small` — CONFIRMED to exist (id 5, name "С крышкой на магнитах"). This is the magnet_box POC category.

### 3. productsService

- Path: `js/services/productsService.js`
- Real existing methods (no new methods proposed):
  - `getActiveProducts()` — public JSON-first, returns products array
  - `getActiveCategories()` — returns categories array
  - `getActiveColors()` — returns colors array (`{ hex_code, name, russian_name }`)
  - `getProductsByCategory(categoryId)` — filters by `category_id`
  - `getProductByArtikul(artikul)`
  - `getColorsMap()`
  - plus admin-side methods (Supabase) — `source: 'admin'`

### 4. Current selected product color

- File: `js/services/colorService.js`
  - `ColorService.selectedColors` — object keyed by product id
  - `getColorMap()`, `renderColorButtons()`, `updateButtonColor()`
- File: `js/components/productComponent.js`
  - In `render()` (≈ line 184–200): after loading the product it sets `ColorService.selectedColors[productId] = product.color`
  - Color switcher (≈ line 609–683): loads same-category products via `productsService.getProductsByCategory(product.category_id)` + `productsService.getActiveColors()`, renders color buttons, navigates to `#product/${artikul}` on switch
- The card reads the current color from `product.color_hex` / `product.color` of the currently-rendered product (the URL artikul determines the active product/color).

### 5. Price — nominal source

- The card gets the nominal price from `product.price_rub`.
- File: `js/components/productComponent.js`, rendered as `₽${product.price_rub}` (≈ line 285–349 area, price block).

### 6. Price formatting

- CONFIRMED: there is NO dedicated currency/price formatter utility in the public code.
- Only date formatting exists (`toLocaleString('ru-RU', ...)` in admin components).
- Therefore POC estimate uses plain rounding (`Math.round`) + `₽` prefix, matching the existing inline pattern `₽${price_rub}`.

### 7. productComponent.js — safe POC button hook point

- File: `js/components/productComponent.js`
- Safe insertion point: the actions row (≈ line 340–349), immediately after the "Кастомизировать" anchor and before the "Добавить в корзину" button. This is where the hidden POC preview button is wired in.
- The button visibility is gated asynchronously by a `closed_45` availability check.

### 8. Modal / UI utilities that can be reused

- `src/styles/product-modal.css` — fullscreen media viewer styles (`#imageModal`, `.show` toggle, fixed overlay, z-index 9999). Pattern: a fixed overlay toggled by a `.show` class.
- `js/components/productComponent.js` — `openImageModal()` (≈ line 490) demonstrates the existing open/close overlay pattern (add/remove `.show`).
- These are a media-viewer pattern, not a generic accessible dialog — so the POC modal implements its own dialog shell (Escape/backdrop/focus-trap) rather than extending `#imageModal`, but reuses the same overlay/CSS approach.

---

## CONFIRMED

- `public/data/products-public.json` exists with `products/categories/colors`.
- Product object exposes `category_slug`, `category_id`, `color_hex`, `color`, `price_rub`, `price`, `photos`.
- `full-cover-small` category exists and maps to the magnet (magnet_box) construction.
- `productsService.getActiveProducts/getActiveCategories/getActiveColors/getProductsByCategory/getProductByArtikul/getColorsMap` all exist (verified, not hypothetical).
- Current color derived from `product.color_hex`; selection persisted in `ColorService.selectedColors[productId]`.
- No dedicated price formatter — inline `₽${price_rub}` is the existing convention.

---

## CONFLICTS

- None. No real conflicts found between the approved PRD and the code:
  - `getActiveColors()` / `getActiveCategories()` are real (PRD no longer assumes them blindly — they are confirmed).
  - `full-cover-small` slug matches the `mockups.json` product_mapping.
  - The `default` variant path `public/mockups/magnet_box/default/closed_45.svg` is consistent with the `{model}/{variant}/{view}.svg` convention.
  - Base price source (`price_rub`) and rounding approach match existing display behavior.

---

## REQUIRED PRD ADJUSTMENTS

- None required. The PRD is implementable as approved.
- Note (informational, not an adjustment): there is no shared money formatter, so the estimate relies on `Math.round` — already accounted for in the PRD.

---

## READY FOR IMPLEMENTATION: YES

Implementation is complete and verified (see working state). Remaining known item: a one-line ordering fix in `js/components/mockupPreviewModal.js` `open()` so the palette cache is assigned before `_applyColors()` runs — confirmed fixed (initial side color now renders the non-base default `#E2A703`).

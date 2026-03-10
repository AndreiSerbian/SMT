

# Swiper Production CSS Hardening — Implementation Plan

## Changes

### 1. `js/app.js` — Reorder CSS imports (lines 1-9)

Replace the current import block with:

```js
// 1) Tailwind CSS (base resets first — lowest priority)
import '@/styles/tailwind.css';

// 2) Swiper CSS (after Tailwind so Swiper layout rules take precedence)
import 'swiper/swiper-bundle.css';

// 3) Custom styles (last — highest priority, can override both)
import '@/styles/grouped-products.css';
import '@/styles/product-modal.css';
```

This ensures Tailwind Preflight resets (`img { height: auto }`, `box-sizing`) load first and get overridden by Swiper's layout rules, which in turn can be overridden by custom CSS.

### 2. `src/styles/grouped-products.css` — Add defensive Swiper layout rules

Insert at the top of the file (before the existing `.products-grid` rule on line 3):

```css
/* Defensive Swiper layout — prevents vertical stacking if Swiper CSS is overridden */
.category-slider-container .swiper-wrapper {
  display: flex !important;
  position: relative;
  width: 100%;
  height: 100%;
  z-index: 1;
  box-sizing: content-box;
}

.category-slider-container .swiper-slide {
  flex-shrink: 0;
  width: 100% !important;
  height: 100%;
  position: relative;
}

.product-slider .swiper-wrapper {
  display: flex !important;
  position: relative;
  width: 100%;
  height: 100%;
  box-sizing: content-box;
}

.product-slider .swiper-slide {
  flex-shrink: 0;
  width: 100% !important;
  height: 100%;
  position: relative;
}
```

These rules use `!important` on critical layout properties (`display: flex`, `width: 100%`) as a last-resort defense. Even if Swiper CSS fails to load or is overridden by Tailwind Preflight, the slider structure will remain horizontal.

### No other files changed

- DB/media logic: untouched
- `swiperService.js`: lifecycle fixes (synchronous init, `observer: true`) already in place
- `homeComponent.js`: defensive fallback already removed

## Post-Implementation Answers

**Does this fix address CSS cascade risk?** Yes. Reordering imports ensures Swiper rules always beat Tailwind resets. Defensive `!important` rules guarantee layout even if the cascade is disrupted by CDN caching or partial bundle loads.

**Is a full clean redeploy still required?** Yes. Run `npm run build`, delete all files on Timeweb, upload the entire new `dist/` folder. This ensures no stale hashed assets remain.

**What to verify in DevTools after deploy:**
1. Elements tab: `.swiper-wrapper` must have `display: flex` (not `block`)
2. Elements tab: `.swiper` containers must have `.swiper-initialized` class
3. Network tab: single CSS bundle loads with 200 status, no 404s
4. Console: no Swiper errors
5. Visual: category cards show horizontal slider, not vertically stacked images




# Swiper Lifecycle Hardening — Implementation Plan

## Changes

### 1. `js/services/swiperService.js`

**`initCategorySliders()` (lines 41-69):** Remove `requestAnimationFrame` wrapper. Make synchronous. Add `observer: true, observeParents: true` to config. Keep destroy-before-reinit.

**`initSwipers()` (lines 30-34):** Add `observer: true, observeParents: true` to product slider config.

**`initModalSwiper()` (lines 91-108):** Add `observer: true, observeParents: true` to modal swiper config. Keep the `requestAnimationFrame` here since modal DOM may still be animating in.

### 2. `js/components/homeComponent.js`

**Lines 544-548:** Remove the defensive fallback block (checks for `.swiper:not(.swiper-initialized)` and calls `initCategorySliders`). This runs at t=100ms before catalog loads at t=300ms+, so it never finds anything.

## Verification Checklist

- Homepage category cards display horizontally in slider layout
- Swiper navigation arrows work on category sliders
- Color dot clicks update slider photos
- Product page modal Swiper works
- No Swiper-related console errors
- Works on dev, production, hard refresh, and mobile


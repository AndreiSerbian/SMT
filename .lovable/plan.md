

# Media Format Inconsistency Audit — Findings

## Investigation Results

### 1. DB Structure Difference Between Legacy and Uploaded Images

**Legacy products** store relative paths in `photos[]`:
```
"images/small with bow/pink/slide1.webp"
```

**Newly uploaded images** (via `media-manager` edge function) store **full absolute URLs**:
```
"https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/images/PRODUCT_ID_1234_1.jpg"
```

The DB column is `text[]` so both work, but the format is inconsistent.

### 2. URL Generation — Does It Assume WebP?

**No.** The `getImageUrl()` function is format-agnostic:
```js
if (photo.startsWith('http')) return photo;
return `https://...supabase.co/.../product-media/${photo}`;
```
It checks for absolute vs relative paths, not file extensions. WebP is not assumed. This is clean.

### 3. JPG Records and Media Normalization

The `media-manager` upload function stores the full public URL in the DB (line 122-123 of index.ts). The upload path is `images/${productId}_${timestamp}_${i}.${ext}` — flat, not organized by size/color. Legacy images follow `images/{size folder}/{color folder}/slide{n}.webp`.

**This is inconsistent but not a slider-breaking issue.** Both URL formats work with `getImageUrl()`.

### 4. Image Wrapper Sizing — STABLE

The `.category-slide-image` CSS uses:
```css
width: 100%; height: 100%; object-fit: contain; background: #f8f9fa;
```
The container `.category-slider-container` has a **fixed height of 280px**. This means images of any aspect ratio (landscape WebP, portrait JPG, square) will all fit within 280px without breaking the layout. **Sizing is stable.**

### 5. Swiper Updates After Image Replacement

`updateCategorySlider()` calls `swiper.removeAllSlides()` then `swiper.appendSlide()` then `swiper.update()`. The `category-slide-image` class is correctly applied to new slides. **This is correct.**

### 6. Bug Found — `renderProductCard` Missing `getImageUrl()`

Line 409: `<img src="${mainPhoto}"` uses the raw photo path without calling `getImageUrl()`. For legacy products with relative paths like `images/small with bow/...`, this will produce a broken image because there's no base URL prefix. The category card renderer at line 231 correctly calls `getImageUrl(photo)`.

This only affects the individual product listing view (when viewing products within a category), not the homepage category cards.

## Conclusion

**Media format inconsistency is NOT the root cause of the slider breakage.** The `getImageUrl()` normalization handles both formats correctly. Image sizing is stable via fixed container height + `object-fit: contain`. Swiper updates correctly after slide replacement.

**One real bug found:** `renderProductCard()` at line 409 doesn't call `getImageUrl()`, which would break images for products with relative paths.

## Proposed Fix

### File: `js/components/publicProductsComponent.js` (line 402)

Change:
```js
const mainPhoto = product.photos && product.photos[0] ? product.photos[0] : '';
```
To:
```js
const mainPhoto = product.photos && product.photos[0] ? this.getImageUrl(product.photos[0]) : '';
```

This is a one-line fix. No other changes needed for media normalization — the pipeline is already format-agnostic.


# Local Image Variants + Placeholder Fix Plan

## 1. Placeholder diagnosis

| Current reference | Current result | Problem | Fix |
|---|---|---|---|
| `/images/placeholder.svg` (used in 5 places in JS) | `200 text/html` (SPA fallback) | File does not exist at that path — only `public/placeholder.svg` exists | Change all references to `/placeholder.svg` |
| `onerror="this.onerror=null;..."` | OK pattern | None — already guards against loops | Keep, just fix the path |

Root cause: code points to `/images/placeholder.svg`, but the actual asset is `public/placeholder.svg`. SPA's `index.html` fallback returns HTML for the missing path, which the browser then keeps trying to render as an image — hence repeated requests.

## 2. Local collections for variants

Already generated in the previous step (idempotent script `scripts/build-image-variants.mjs`). No re-run needed unless new originals are added.

| Collection folder | 320w | 480w | Notes |
|---|---|---|---|
| `public/images/small with bow/` | done | done | |
| `public/images/medium with bow/` | done | done | |
| `public/images/big with bow/` | done | done | |
| `public/images/boxes with handles/` | done | done | |
| `public/images/full cover small/` | done | done | Lowercase + `Black/White/...` color folders |

## 3. ImageSizeService behavior (already implemented, verified)

| Source type | srcset? | Behavior |
|---|---|---|
| Local `/images/.../slideN.webp` | yes | Builds 320w + 480w + original srcset per scenario |
| Local non-slide image | no | Plain `src` only |
| Supabase URL (fallback) | no | Plain `src`, no transformations |

Scenarios PRODUCT_CARD / CATEGORY_SLIDER / PRODUCT_PAGE_MAIN / PRODUCT_GALLERY already match the PRD spec.

## 4. Files to change

| File | Change | Risk |
|---|---|---|
| `js/services/swiperService.js` | `/images/placeholder.svg` → `/placeholder.svg` (1 occurrence) | none |
| `js/components/publicProductsComponent.js` | same replacement (4 occurrences, lines 193/265/271/364) | none |
| `js/components/modernAdminComponent.js` | already uses `/placeholder.svg` — no change | none |

No DB, Supabase Storage, Edge Function, Swiper, color-button, or cart/order changes.

## 5. Testing plan

- Reload preview, check Network: no `/images/placeholder.svg` requests, no repeated placeholder requests during normal browsing.
- If placeholder fires on a real broken image, response is `image/svg+xml` from `/placeholder.svg`.
- Local product images load with `srcset` containing `-320.webp` and `-480.webp`.
- Supabase fallback images load as plain `src` (no srcset).
- Swiper, color buttons, product page, cart unaffected.
- `npm run build` passes.



# Hybrid PDF + Telegram File Delivery + Partial Customization

## DB Migration

Add two columns to `designs` table:
```sql
ALTER TABLE public.designs
ADD COLUMN IF NOT EXISTS customized_sides jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS production_pdf_filename text;
```

Also need `application/pdf` in `product-media` bucket allowed_mime_types (currently has image types + `application/json` from prior migration). Verify and add if missing.

## File Changes

### 1. `js/customizer/sceneManager.js` — Add `detectCustomizedSides()`

New static method that inspects all sides and returns array of side names that have user objects (filtering out `data.isSystem === true`).

```javascript
detectCustomizedSides(sidesData) {
  return SIDES.filter(side => {
    const sideInfo = sidesData[side];
    if (!sideInfo?.fabricJSON?.objects) return false;
    return sideInfo.fabricJSON.objects.some(o => !o.data?.isSystem);
  });
}
```

### 2. `js/customizer/exportPipeline.js` — Update `execute()`

After generating previews and uploading scene:
- Call `SceneManager.detectCustomizedSides(allSidesData)` to get `customized_sides`
- If `customized_sides.length === 0`: skip PDF generation, show message, still allow add-to-cart
- Pass `customized_sides` and `product_id` to `generate-design-pdf`
- Store `customized_sides` in design record
- Return `customized_sides` in result

### 3. `js/customizer/app.js` — Update `handleAddToCart()`

- Store `customized_sides` in cart item object alongside `design_id`, `preview_urls`, `production_pdf_url`

### 4. `supabase/functions/generate-design-pdf/index.ts` — Filter by customized_sides

- Accept `customized_sides` and `pdf_filename` in request body
- If `customized_sides` is provided and non-empty, filter `PAGE_ORDER` to only include those sides
- If `customized_sides` is empty, return `{ ok: false, message: "Нет кастомизации" }`
- Use `pdf_filename` for storage path (default `production.pdf`)
- Return `pages` array with side/page/dimensions mapping
- Update design with `customized_sides` and `production_pdf_filename`

### 5. `supabase/functions/order-processing/index.ts` — Telegram PDF + partial message

After order creation, before/during notifications:

**a) Assign castIndex per product_id:**
- Group cart items that have `design_id` by their product ID (`id` field)
- Assign incrementing castIndex per group

**b) Send PDF as Telegram document:**
- New function `sendTelegramDocument(pdfUrl, filename, caption)`
- Uses `sendDocument` API with multipart/form-data
- Fetches PDF bytes from `production_pdf_url`, sends as file
- Filename: `{product_id}_{castIndex}.pdf`
- Caption includes product_id, sku, qty, customized_sides

**c) Send non-customized sides message:**
- After document, if `customized_sides` doesn't cover all 7 sides:
- Send text message listing missing sides

**d) Update design record** with `production_pdf_filename`

**e) Email:** Add PDF link and customization summary to email HTML

### 6. `js/customizer/designService.js` — No structural changes needed

The existing `create()` and `update()` already pass through arbitrary fields, so `customized_sides` and `production_pdf_filename` will work automatically once the DB columns exist.

## Summary of files changed

| File | Change |
|---|---|
| DB migration | Add `customized_sides`, `production_pdf_filename` to designs; ensure `application/pdf` in bucket |
| `js/customizer/sceneManager.js` | Add `detectCustomizedSides()` method |
| `js/customizer/exportPipeline.js` | Detect customized sides, pass to PDF gen, skip if empty |
| `js/customizer/app.js` | Store `customized_sides` in cart item |
| `supabase/functions/generate-design-pdf/index.ts` | Filter pages by customized_sides, return pages map |
| `supabase/functions/order-processing/index.ts` | castIndex logic, sendDocument to Telegram, partial customization message |


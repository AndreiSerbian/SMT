

# Box Customizer -- Full Implementation Plan

## Overview

A standalone page (`customizer.html`) that lets users design custom box packaging using a Fabric.js canvas editor. It supports 7 box sides, stores geometry in millimeters, generates production PDFs, and integrates with the existing cart and order flow.

---

## Phase 1: Foundation (Database + Page + Routing)

### 1.1 Database Migration

Create the `designs` table:

```sql
CREATE TABLE public.designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  sku text NOT NULL,
  qty integer NOT NULL DEFAULT 1,
  comment text,
  options jsonb DEFAULT '{}',
  objects_mm jsonb DEFAULT '{}',
  preview_urls jsonb DEFAULT '{}',
  production_pdf_url text,
  status text DEFAULT 'saved' CHECK (status IN ('saved','attached_to_cart','ordered')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert designs"
  ON public.designs FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read own designs"
  ON public.designs FOR SELECT USING (true);

CREATE POLICY "Anyone can update own designs"
  ON public.designs FOR UPDATE USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER designs_updated_at
  BEFORE UPDATE ON public.designs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

Create a `designs` storage bucket (or use existing `product-media` with a `designs/` prefix).

### 1.2 New File: `customizer.html`

A separate HTML page (not part of the SPA):

```text
customizer.html
  - Loads Fabric.js from CDN
  - Loads Tailwind CSS (same build output or CDN)
  - Loads js/customizer/app.js (module entry point)
```

### 1.3 Vite Config Update

Add `customizer.html` as a second entry point in `vite.config.ts`:

```javascript
rollupOptions: {
  input: {
    main: path.resolve(__dirname, 'index.html'),
    customizer: path.resolve(__dirname, 'customizer.html'),
  },
},
```

### 1.4 Product Page Button

Add a "Customize" button to `js/components/productComponent.js` (after the "Add to cart" button):

```html
<a href="/customizer.html?product_id={artikul}"
   class="w-full bg-purple-500 text-white px-6 py-3 rounded-lg ...">
  Кастомизировать
</a>
```

---

## Phase 2: Customizer JavaScript Architecture

All customizer code lives in `js/customizer/`:

```text
js/customizer/
  app.js              -- Entry point, product loader, init
  sceneManager.js     -- 7-side state manager (stores Fabric JSON per side)
  canvasController.js -- Fabric.js wrapper (init, tools, object manipulation)
  inspector.js        -- Right panel: X/Y/W/H in mm, rotation, opacity, flip
  toolbar.js          -- Left toolbar: select, upload, image, patterns, stickers, text, etc.
  topbar.js           -- Undo/redo, zoom, grid, snap, save, back, add-to-cart
  confirmPanel.js     -- Bottom confirmation panel (qty, SKU, add-to-cart)
  exportPipeline.js   -- Preview PNG generation + PDF trigger
  storageService.js   -- Supabase storage upload helpers
  designService.js    -- Supabase DB CRUD for designs table
  geometry.js         -- px <-> mm conversion utilities
  templates.js        -- Built-in template definitions
  stickers.js         -- Built-in sticker library
  patterns.js         -- Pattern fill definitions
```

### 2.1 `app.js` -- Entry Point

```javascript
const productId = new URLSearchParams(location.search).get('product_id');
// Fetch product from Supabase
// If not found -> redirect to /
// Extract dimensions (mm), compute canvas aspect ratio
// Init sceneManager with 7 sides
// Init canvasController
// Init UI panels
```

### 2.2 `sceneManager.js` -- 7-Side State Manager

```javascript
const SIDES = ['top','bottom','left','right','front','back','inside'];

// State: { [side]: { fabricJSON, objectsMM[] } }
// Methods:
//   switchSide(side) -- serialize current canvas, restore target side
//   getCurrentSide()
//   getSideData(side)
//   getAllSidesData() -- for saving
//   restoreDraft() -- load from localStorage or DB
```

Key rule: switching sides serializes the current Fabric canvas to JSON and stores it, then loads the target side's JSON onto the canvas. State is never lost.

### 2.3 `canvasController.js` -- Fabric.js Wrapper

```javascript
// Init Fabric.Canvas
// Background: box face outline (dimensions from product)
// Safe zone overlay (configurable inset, e.g., 5mm)
// Grid overlay (toggle)
// Snap-to-grid (toggle)
// Methods:
//   addImage(file) -- max 25MB validation
//   addText(options) -- font, size, color, align
//   applyPattern(patternDef) -- pattern fill on selected object or background
//   addSticker(stickerUrl) -- preloaded sticker as Fabric.Image
//   applyTemplate(templateDef) -- load preset arrangement
//   deleteSelected()
//   undo() / redo() -- using Fabric canvas state history
//   setZoom(pct)
//   toggleGrid()
//   toggleSnap()
//   exportToPNG() -- returns data URL at print resolution
```

### 2.4 `geometry.js` -- px to mm Conversion

```javascript
// Product dimensions (mm) -> canvas dimensions (px)
// DPI constant (e.g., 300 for print, 72 for screen)
// mmToPx(mm, dpi) / pxToMm(px, dpi)
// All object positions/sizes stored in mm
// Canvas renders in px but inspector shows mm
// Before save: convert all object coords to mm
```

Each box side has its own dimensions derived from the product:
- front/back: width x height
- left/right: depth x height
- top/bottom: width x depth
- inside: width x depth (same as top)

---

## Phase 3: UI Layout

Based on the mockup described in the PRD:

```text
+--------------------------------------------------+
| TOP BAR: Undo | Redo | Zoom | Grid | Snap |      |
|          Back to product | Save | Add to cart     |
+----------+---------------------------+-----------+
| LEFT     |                           | RIGHT     |
| TOOLBAR  |     CANVAS                | INSPECTOR |
| Select   |     (box face preview)    | X/Y mm    |
| Upload   |     mm dimensions shown   | W/H mm    |
| Image    |     safe zone overlay     | Rotation  |
| Pattern  |                           | Opacity   |
| Stickers |                           | Flip      |
| Templates|                           | Pattern   |
| Text     |                           | Apply All |
| Align    |                           |           |
| Export   |                           |           |
+----------+---------------------------+-----------+
| SIDE TABS: top | bottom | left | right | front   |
|            back | inside                          |
+--------------------------------------------------+
| CONFIRM PANEL (hidden until "Confirm" clicked)    |
| Product: XXX | SKU: XXX | Qty: [-] [N] [+]       |
| [Add to Cart]                                     |
+--------------------------------------------------+
```

Responsive: on mobile, left toolbar collapses to bottom icons, inspector becomes a slide-up sheet.

---

## Phase 4: Tools Implementation

### 4.1 Upload Image
- File input accepting PNG/WebP/SVG
- Max 25MB validation
- Upload to Supabase Storage `designs/{design_id}/assets/`
- Add as Fabric.Image to canvas

### 4.2 Text Tool
- Add editable text object
- Font picker (subset of web-safe + Google Fonts)
- Size, color, bold/italic, alignment
- Rotation handle via Fabric controls

### 4.3 Pattern Fill
- Library of predefined patterns (stripes, dots, geometric)
- Apply to selected object or to entire side background
- "Apply to all sides" checkbox

### 4.4 Stickers
- Grid of preloaded SVG/PNG stickers
- Click to add to canvas center
- Draggable/resizable

### 4.5 Templates
- Predefined arrangements (e.g., "logo center + text bottom")
- Applying a template clears current side and loads preset objects
- Warning before applying

### 4.6 Alignment
- Align selected object: left/center/right/top/middle/bottom
- Center on canvas

---

## Phase 5: Export Pipeline

### 5.1 Preview PNGs (Client-Side)

For each of the 7 sides:
1. Switch to side
2. Hide grid/safe zone overlays
3. `canvas.toDataURL('image/png', 1.0)` at print resolution
4. Upload to `designs/{design_id}/previews/{side}.png`

### 5.2 Production PDF (Edge Function)

New edge function: `supabase/functions/generate-design-pdf/index.ts`

Input:
```json
{
  "design_id": "uuid",
  "preview_urls": { "top": "url", ... },
  "product_dimensions": { "width": 200, "height": 150, "depth": 100 },
  "options": { "print_type": "color", ... }
}
```

Process:
1. Download all 7 preview PNGs
2. Generate multi-page PDF using `pdf-lib` (Deno-compatible)
3. Page order: top, left, right, front, back, bottom, inside
4. Each page sized to actual mm dimensions
5. Upload PDF to `designs/{design_id}/production/production.pdf`
6. Update `designs` row with `production_pdf_url`
7. Return URL

Config in `supabase/config.toml`:
```toml
[functions.generate-design-pdf]
verify_jwt = false
```

### 5.3 Export Validation
- If PDF generation fails, "Add to Cart" stays disabled
- Show error message with retry option

---

## Phase 6: Confirmation Flow and Cart Integration

### 6.1 Confirmation Panel

"Confirm Customization" button at top bar. When clicked:
1. Save all 7 sides to scene.json
2. Show bottom panel with:
   - Product ID, SKU
   - Quantity selector (min 1)
   - Production options (print type: color/foil gold/foil silver)
   - Sticker options (enabled, size_mm, quantity)
3. "Add to Cart" button (initially disabled)

### 6.2 Add to Cart Flow

When "Add to Cart" clicked:
1. Generate preview PNGs for all 7 sides
2. Upload previews to Supabase Storage
3. Save `scene.json` to storage
4. Call `generate-design-pdf` edge function
5. Wait for PDF URL
6. Save design to `designs` table with status `attached_to_cart`
7. Add to cart via `cartService.addToCart()` with extended item:

```javascript
{
  id: productId,
  quantity: qty,
  design_id: designId,
  preview_urls: { ... },
  production_pdf_url: "...",
  options: { print_type, stickers }
}
```

8. Redirect back to product page: `window.location.href = '/#product/' + productId`

### 6.3 Cart Display Update

Update `cartService.js` to recognize and display `design_id` items differently -- show a "Customized" badge and a link to view the design.

### 6.4 Order Processing Update

Update `order-processing` edge function to include `design_id`, `production_pdf_url`, and `options` in the order data, Telegram notification, and Google Sheets row.

---

## Phase 7: Edge Cases and Polish

### 7.1 Validations
- File too large (over 25MB) -- reject with user-friendly error
- Object outside safe zone -- red overlay warning
- Image resolution too low for print size -- resolution warning icon
- Invalid `product_id` in URL -- redirect to homepage

### 7.2 Draft Persistence
- Auto-save to localStorage every 30 seconds
- On page refresh, restore draft if exists
- On explicit "Save", persist to Supabase `designs` table

### 7.3 Storage Error Handling
- If upload fails, rollback DB insert
- Retry logic for transient failures

---

## Files to Create

| File | Purpose |
|------|---------|
| `customizer.html` | Standalone HTML page |
| `js/customizer/app.js` | Entry point |
| `js/customizer/sceneManager.js` | 7-side state |
| `js/customizer/canvasController.js` | Fabric.js wrapper |
| `js/customizer/inspector.js` | Right panel |
| `js/customizer/toolbar.js` | Left toolbar |
| `js/customizer/topbar.js` | Top bar |
| `js/customizer/confirmPanel.js` | Bottom confirm panel |
| `js/customizer/exportPipeline.js` | PNG + PDF export |
| `js/customizer/storageService.js` | Supabase storage |
| `js/customizer/designService.js` | DB CRUD |
| `js/customizer/geometry.js` | px/mm conversion |
| `js/customizer/templates.js` | Template library |
| `js/customizer/stickers.js` | Sticker library |
| `js/customizer/patterns.js` | Pattern definitions |
| `supabase/functions/generate-design-pdf/index.ts` | PDF generation |

## Files to Modify

| File | Change |
|------|--------|
| `vite.config.ts` | Add customizer.html as second input |
| `js/components/productComponent.js` | Add "Customize" button |
| `js/services/cartService.js` | Support design_id in cart items |
| `supabase/functions/order-processing/index.ts` | Include design data in order |
| `supabase/config.toml` | Add generate-design-pdf function config |

## Database Changes

| Table | Action |
|-------|--------|
| `designs` | CREATE new table |

## Implementation Note

Due to the massive scope (15+ new files, 1 edge function, 1 DB table, 5 modified files), implementation will proceed incrementally within each approved step. The first implementation batch will focus on Phase 1-2 (foundation + core canvas), followed by Phase 3-4 (UI + tools), then Phase 5-7 (export + cart + polish).


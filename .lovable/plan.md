

# CSS & Tailwind Stability Audit — Diagnosis and Hardening Plan

## TL;DR

The #1 root cause of styles "randomly breaking" is a **dual Tailwind compilation problem**: two separate CSS entry points (`src/styles/tailwind.css` and `src/index.css`) both contain `@tailwind base/components/utilities` directives, creating two independent Tailwind builds that fight each other. Combined with **duplicate CSS files** in `public/css/` and `src/styles/`, aggressive **1-year cache headers** on production, and a **customizer.html entry point that imports Tailwind without custom styles**, you get unpredictable CSS behavior.

---

## BLOCK 1 — DIAGNOSIS (Ranked)

### Cause #1: Two Tailwind entry files generating separate outputs (CRITICAL)

- `src/styles/tailwind.css` — imported by `js/app.js` (main site) and `js/customizer/app.js`
- `src/index.css` — imported by `src/main.tsx` (React entry, unused in production but compiled by Vite)

Both contain `@tailwind base; @tailwind components; @tailwind utilities;`. Vite processes both through PostCSS/Tailwind independently. Each scans the `content` paths and generates its own utility set. If the React entry (`src/main.tsx`) isn't actually used but Vite still processes it as part of the build graph, you get **two competing base resets** (`* { border-color }`, `body { bg/text }` from `src/index.css`'s `@layer base`) that may override or conflict with the vanilla JS app's styles depending on chunk ordering.

**Verify**: Check production `dist/` — are there two CSS chunks? Does the base reset from `src/index.css` (`* { @apply border-border }`) get applied even though the React app isn't mounted?

### Cause #2: Duplicate CSS files — `public/css/` vs `src/styles/` (HIGH)

Both directories contain `grouped-products.css` and `product-modal.css` with identical or similar content. The `src/styles/` versions are bundled by Vite (imported in `js/app.js`). The `public/css/` versions are raw static files. If any code path loads the raw `public/css/` versions (e.g., old `<link>` tags, or the admin CSS loader accidentally), you get **double declarations** with unpredictable cascade order.

### Cause #3: 1-year cache headers on CSS/JS (HIGH)

`.htaccess` sets `ExpiresByType text/css "access plus 1 year"`. After each manual deploy, browsers serve **stale cached CSS** while HTML may reference new hashed filenames. Old CSS stays cached; new HTML can't find old hashes; or old HTML keeps referencing removed CSS files.

**Verify**: After deploy, check if the hashed CSS filename in `dist/index.html` matches what the browser actually loads.

### Cause #4: Customizer entry has no custom styles (MEDIUM)

`customizer.html` → `js/customizer/app.js` imports only `../../src/styles/tailwind.css` (no Swiper, no grouped-products, no product-modal). This is fine for the customizer itself, but since Vite builds both entries together, the Tailwind content scan is shared — so the generated utility set depends on which classes appear across ALL scanned files. If a class is only used in one entry's template, it still gets generated (good), but the **chunk splitting** may place it in the wrong CSS file.

### Cause #5: `src/index.css` base layer overrides (MEDIUM)

The `@layer base` block in `src/index.css` applies `* { @apply border-border }` and `body { @apply bg-background text-foreground }`. These use CSS custom properties (`--border`, `--background`, `--foreground`). If this CSS gets loaded on the main site, it overrides Tailwind's default border color and body background with HSL values that depend on CSS variables being defined. Since `index.html` doesn't use the React app, these variables may not have the expected values, causing invisible or wrong borders/backgrounds.

### Cause #6: Admin CSS loaded from `public/css/` bypasses Vite (LOW)

The admin CSS loader in `js/app.js` injects `<link>` tags pointing to `/css/admin-storage.css` etc. These are raw files in `public/css/`, not processed by PostCSS/Tailwind. This is fine as long as those files don't contain Tailwind classes — they use plain CSS. But they load **after** the Vite-bundled CSS, and since they're not part of the build graph, they can override bundled styles unpredictably.

---

## BLOCK 2 — PERMANENT FIX PLAN

### Step 1: Eliminate dual Tailwind compilation

- **Delete or empty `src/index.css`** — it's only used by the React entry (`src/main.tsx`) which isn't active in production. The base layer reset and CSS variables it defines can interfere.
- Alternatively, if the React entry must stay for Lovable preview: make `src/index.css` contain only `/* placeholder */` with no Tailwind directives. All Tailwind processing should go through `src/styles/tailwind.css` only.

### Step 2: Consolidate CSS files

- **Delete** `public/css/grouped-products.css` and `public/css/product-modal.css` — they are duplicates of `src/styles/` versions already bundled by Vite.
- Verify no code references these public paths for the storefront.

### Step 3: Fix production cache headers

- Change `.htaccess` CSS/JS expiry from 1 year to a shorter duration, OR add cache-busting query strings to asset references.
- Better: Vite already produces hashed filenames (`assets/index-[hash].css`). The issue is that `index.html` itself may be cached. Add a rule to `.htaccess` that sets `Cache-Control: no-cache` for HTML files specifically:

```text
# HTML — never cache
<FilesMatch "\.(html)$">
  Header set Cache-Control "no-cache, no-store, must-revalidate"
  Header set Pragma "no-cache"
  Header set Expires "0"
</FilesMatch>
```

### Step 4: Ensure single Tailwind source of truth

- `src/styles/tailwind.css` remains the only file with `@tailwind` directives.
- Both `js/app.js` and `js/customizer/app.js` import it — this is correct.
- Confirm `tailwind.config.ts` content paths cover all templates:
  - `./js/**/*.js` — covers all vanilla JS components ✓
  - `./index.html`, `./*.html` — covers both HTML entries ✓
  - `./src/**/*.{ts,tsx}` — covers React (if needed) ✓

### Step 5: Audit dynamic class usage

- No template-literal dynamic classes (`bg-${var}`) found — this is clean.
- `style=` attributes with inline `background-color` for color dots are safe (not Tailwind classes).
- No safelist needed currently.

### Step 6: Deployment checklist

- After `npm run build`, always upload the **entire** `dist/` directory, not selective files.
- Clear server cache / CDN cache after each deploy.
- Verify `dist/index.html` references match actual files in `dist/assets/`.

---

## BLOCK 3 — FILES TO CHANGE

| File | Action | What |
|---|---|---|
| `src/index.css` | Gut contents | Remove all `@tailwind` directives and `@layer base` block. Keep file empty or with a comment. This prevents a second Tailwind compilation from the React entry. |
| `src/main.tsx` | Modify import | Change `import './index.css'` to `import '@/styles/tailwind.css'` so it shares the same single Tailwind entry, OR remove the CSS import entirely. |
| `public/css/grouped-products.css` | Delete | Duplicate of `src/styles/grouped-products.css` |
| `public/css/product-modal.css` | Delete | Duplicate of `src/styles/product-modal.css` |
| `public/.htaccess` | Add HTML no-cache rule | Prevent stale HTML serving old CSS hashes |
| `tailwind.config.ts` | No change needed | Content paths are correct |
| `postcss.config.js` | No change needed | Config is correct |
| `vite.config.ts` | No change needed | Multi-entry setup is correct |

---

## MANDATORY CHECKS — ANSWERS

1. **Tailwind `content` paths complete?** — Yes. `./js/**/*.js`, `./index.html`, `./*.html`, `./src/**/*.{ts,tsx}` cover everything.
2. **Dynamic Tailwind classes not safelisted?** — No dynamic classes found. Safe.
3. **Production HTML referencing correct CSS bundle?** — Risk: if HTML is cached with 1-year expiry, old HTML references old hashes. Fix: no-cache on HTML.
4. **Browser/CDN cache causing old CSS?** — Yes, 1-year cache on CSS + no cache-busting on HTML = primary production breakage vector.
5. **Custom CSS overriding Tailwind?** — Yes: `src/index.css` `@layer base` block applies `border-border` to all elements and custom body styles.
6. **Multiple HTML entry points with inconsistent CSS?** — Yes: `index.html` (via `js/app.js`) gets Tailwind + custom CSS. `customizer.html` (via `js/customizer/app.js`) gets only Tailwind. The React entry (`src/main.tsx`) has its own Tailwind compilation via `src/index.css`.
7. **Incomplete dist upload?** — Possible with manual deployment. No automated check in place.
8. **Server modules altering CSS?** — PageSpeed is disabled in `.htaccess`. Low risk.

---

## REGRESSION PREVENTION CHECKLIST

1. Only ONE file should contain `@tailwind` directives: `src/styles/tailwind.css`
2. Never duplicate CSS files between `public/css/` and `src/styles/`
3. Always deploy full `dist/` directory
4. HTML files must have `no-cache` headers
5. After adding new components with new Tailwind classes, run `npm run build` and verify the output CSS contains those classes
6. Do not add inline `<link>` tags for CSS that's already bundled by Vite


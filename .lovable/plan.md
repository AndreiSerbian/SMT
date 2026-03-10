

# SEO Fixes Implementation Plan

## Changes

### 1. `index.html` — Full rewrite of HEAD + static fallback in body

Replace the entire file with the user's provided HTML: enriched `<head>` (title, description, canonical, robots, OG, Twitter cards, yandex-verification preserved, favicon preserved, Font Awesome preserved) and static semantic fallback content inside `<div id="app">` that JS replaces on load.

Key details:
- Keep existing: `lang="ru"`, charset, viewport, favicon, Font Awesome, yandex-verification, gptengineer script
- Add: canonical, robots meta, OG tags, Twitter card tags
- Add: inline `<style>` for fallback readability
- Add: static `<main>` with h1, h2s, paragraphs, cards, noscript block
- JS app replaces innerHTML of `#app` on load — no conflict

### 2. `public/robots.txt` — New file

```
User-agent: *
Allow: /
Sitemap: https://giftboxopt.ru/sitemap.xml
```

### 3. `public/sitemap.xml` — New file

Minimal sitemap with homepage only.

### 4. `public/.htaccess` — Add 301 redirects before SPA routing

Insert `www→non-www` + `http→https` rewrite rules at the top of the existing `<IfModule mod_rewrite.c>` block, before the SPA fallback rules.

## Files changed

| File | Action |
|---|---|
| `index.html` | Rewrite HEAD + add fallback body |
| `public/robots.txt` | Create |
| `public/sitemap.xml` | Create |
| `public/.htaccess` | Add 301 redirect rules |


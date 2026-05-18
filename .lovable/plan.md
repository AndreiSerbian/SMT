# Shell-first рендер главной + чистка видимого SEO fallback

## 1. Текущее поведение (узкое место)

```text
GET / → index.html
  └─ <div id="app"> содержит большой видимый <main class="seo-fallback">
     (H1, sub, 2 CTA, 2 grid секции по 6 карточек, блок «Коллекция»,
      footer + inline <style>.seo-fallback{…}). Пользователь видит
      это как «другой сайт».
  └─ js/app.js (module).

app.js → DOMContentLoaded → Router + initApp → HomeComponent.render(#app)
  └─ await this.loadProducts()         ← блокирует первый paint
  └─ await cartService.renderCart()    ← тоже до innerHTML
  └─ container.innerHTML = `<nav>…<hero>…секции…
                  #products-catalog-container (loader)…footer…cart`
  └─ loadProductsCatalog(container) — уже async, try/catch,
     локальный spinner, Swiper и color buttons после вставки HTML.
```

`loadProductsCatalog()` устроен правильно — его НЕ переписываем,
только вызываем позже (после первого paint shell-а).

## 2. Что меняем

| File | Change | Risk |
|---|---|---|
| `index.html` | Удалить весь `<main class="seo-fallback">…</main>` и блок `<style>.seo-fallback{…}</style>`. Оставить `<div id="app"></div>` пустым и сразу после него короткий `<noscript>Для работы каталога включите JavaScript.</noscript>`. `<head>` (title, description, canonical, OG, Twitter, favicon, Clarity, gtag, yandex-verification, FontAwesome, gpteng) НЕ трогаем. | Низкий |
| `js/components/homeComponent.js` | 1) Разбить `render(container)` на три метода: `renderShell(container)` (синхронно, без `await`), `hydrateStaticUI(container)` (бургер-меню, cookie consent, обработчики nav/cart, init пустого cart modal), `loadAndRenderCatalog(container)` (вызывает уже существующий `loadProductsCatalog`). 2) Убрать `await this.loadProducts()` и `await cartService.renderCart()` ДО первого `container.innerHTML`. 3) Cart modal вставлять как пустой shell `<div id="cartModal" class="hidden">…</div>`, наполнение — через `cartService.updateCartUI()` (уже вызывается из `initApp`). 4) `getCategories()` — только внутри `loadAndRenderCatalog`. | Средний |
| `src/styles/grouped-products.css` | Добавить `#products-catalog-container { min-height: 60vh; }` против CLS при позднем рендере каталога. | Низкий |
| `js/components/homeComponent.js` (hero) | Проверить, что hero `<img>`/background использует `/images/hero.webp`, не `.jpg`. Если уже webp — не трогать. | Низкий |

НЕ трогаем: `.htaccess`, `public/robots.txt`, `public/sitemap.xml`,
Supabase, products schema, Edge Functions, `mediaResolver`,
`imageSizeService`, `swiperService` API, `colorService`,
`PublicProductsComponent`, `cartService`, `orderComponent`, router,
customizer, существующий код внутри `loadProductsCatalog`.

## 3. Shell-first render plan

Синхронно (`renderShell`), без `await`:
- `<nav>` (desktop + mobile);
- `<section>` hero (`/images/hero.webp`, H1, sub, CTA `#catalog`);
- `<section id="about-boxes">` «Что мы продаём» — статика;
- `<section>` «Наши преимущества» — статика;
- `<section id="catalog">` с `<div id="products-catalog-container">`
  и текущим компактным loader «Загрузка каталога товаров…»;
- `<section id="contacts">` / footer;
- пустой shell cart modal `#cartModal`.

Асинхронно (`loadAndRenderCatalog`):
- `await productsService.getActiveProducts()`;
- существующий `loadProductsCatalog(container)` без изменений
  (PublicProductsComponent.render → initCategorySliders →
  Swiper + color buttons).

## 4. Catalog loading safety

States внутри `#products-catalog-container`:
- **loading** — отрисован из shell, виден сразу;
- **loaded** — HTML карточек + `initCategorySliders()` строго после
  `innerHTML`;
- **empty** — ветка «Каталог пока пуст», если `products.length === 0`;
- **error** — текущий try/catch с кнопкой «Повторить попытку».

Защита от гонок: флаг `this.catalogLoading`; перед вставкой нового
HTML `catalogContainer.innerHTML = ''`.

Swiper / color buttons — API не меняем, init остаётся внутри
`loadProductsCatalog` строго после успешного `innerHTML`.

## 5. Risk mitigation

| Risk | Mitigation |
|---|---|
| «Другой сайт» при загрузке | Удалён видимый `seo-fallback` из body. |
| Белый экран | `renderShell()` синхронный, до любого `await`. |
| Swiper падает | Init только после `catalogContainer.innerHTML = …` (как сейчас). |
| Color buttons не работают | Не трогаем; вешаются после рендера карточек. |
| Loader зависнет | try/catch/finally в `loadAndRenderCatalog`, снятие флага. |
| Дубли каталога | Очистка `catalogContainer` + флаг `catalogLoading`. |
| CLS | `min-height: 60vh` на `#products-catalog-container`. |
| Cart не найдёт DOM | Пустой `#cartModal` в shell, `cartService.updateCartUI()` асинхронно. |
| Потеря SEO | `<head>` (title/description/canonical/OG/Twitter/JSON-LD) сохраняется; контент секций индексируется WRS (Googlebot, Yandex). |
| No-JS юзер | Короткий `<noscript>` после `#app`. |
| Hero | Проверить, что `/images/hero.webp` (а не `.jpg`). |
| Placeholder | Network не должен содержать `/images/placeholder.jpg` — уже исправлено на `/placeholder.svg`. |

## 6. Testing checklist

- Hard refresh `/` — нет видимого `seo-fallback`, shell виден сразу.
- DevTools Network throttling Slow 3G — shell мгновенно, loader только в каталоге.
- Offline / эмуляция ошибки Supabase — shell остаётся, ошибка только в каталоге, кнопка «Повторить».
- Пустой каталог — сообщение «Каталог пока пуст».
- View Source `/` — `<head>` полный (title, description, canonical, OG, Twitter, Clarity, gtag), `<body>` содержит пустой `#app` + `<noscript>`.
- Без JS — виден только `<noscript>`.
- Network на `/` — нет запросов к `/images/placeholder.jpg`, нет запросов к `/sitemap.xml`/`/robots.txt`.
- `curl -I /robots.txt` → `Content-Type: text/plain`.
- `curl -I /sitemap.xml` → `Content-Type: application/xml`.
- Hero — отдаётся `/images/hero.webp` (Network → Type: webp).
- `#product/<id>` — открывается, Swiper работает, color buttons переключают слайдер.
- `#contacts`, `#order`, `#order-confirmation`, `#privacy-policy`, `#terms-of-use` — работают.
- Корзина: открытие, +/−, удаление, переход к заказу, оформление.
- Mobile ≤768 и desktop ≥1024.
- `npm run build` проходит.

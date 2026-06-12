## Проблема

На главной странице карточки категорий показывают пустые слайды или загружаются по 1–3 секунды, тогда как страница товара рендерит мгновенно.

## Диагностика (по сети из preview)

Все фото категорий на главной грузятся с Supabase, а не локально. URL’ы выглядят так:

```
https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media//images/medium%20with%20bow/peach/slide1.webp
                                                                              ^^ двойной слэш
```

Часть запросов даже падает с `net::ERR_BLOCKED_BY_ORB` (например, `boxes with handles/gold/*.jpg` — этих файлов в Supabase нет, локально они тоже не в манифесте webp). Из-за этого слайды на главной пустые или медленные.

## Причина

В `public/data/products-public.json` пути фото хранятся с ведущим слэшем: `/images/medium with bow/peach/slide1.webp`.

В `js/components/publicProductsComponent.js` → `getImageUrl()`:

```js
const absolute = photo.startsWith('http')
  ? photo
  : `https://...product-media/${photo}`;   // ← склейка даёт //images/...
return resolveImageUrl(absolute);
```

Дальше в `js/services/mediaResolver.js`:
- `extractStoragePathFromSupabaseUrl` возвращает `/images/medium with bow/peach/slide1.webp` (с ведущим `/`)
- ключи в `public/media-manifest.json` идут без ведущего слэша (`images/medium with bow/peach/slide1.webp`)
- лукап `manifestFiles[normalized]` промахивается → fallback на Supabase URL с двойным слэшем

Страница товара работает быстрее, потому что её разметка изначально использует относительные `/images/...` пути (resolveImageUrl выходит на первой же строке `if (originalUrl.startsWith('/images/'))`), минуя сломанный путь через `getImageUrl`.

## Что меняю

Только фронтенд‑резолвинг путей. Данные и медиафайлы не трогаю.

### 1. `js/components/publicProductsComponent.js` — `getImageUrl()`

Если `photo` уже относительный путь (`/images/...`, `/videos/...` или `images/...`) — не приклеивать Supabase‑префикс. Передавать как есть в `resolveImageUrl`, который уже умеет короткое замыкание для `/images/...`.

Псевдокод:

```js
getImageUrl(photo) {
  if (!photo) return '';
  if (photo.startsWith('http')) return resolveImageUrl(photo);
  if (photo.startsWith('/images/') || photo.startsWith('/videos/')) return resolveImageUrl(photo);
  if (photo.startsWith('images/') || photo.startsWith('videos/')) return resolveImageUrl('/' + photo);
  // storage-path вида "small with bow/..." — как и раньше клеим в Supabase URL
  return resolveImageUrl(`https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/${photo}`);
}
```

### 2. `js/services/mediaResolver.js` — защита от ведущего слэша в `extractStoragePathFromSupabaseUrl`

На случай, если где-то ещё в коде сформируется URL с двойным слэшем, нормализовать результат: срезать ведущий `/` перед лукапом в манифесте. Это сделает `resolveImageUrl` устойчивым к таким URL и в будущем.

```js
const storagePath = extractStoragePathFromSupabaseUrl(originalUrl);
const cleaned = storagePath.replace(/^\/+/, '');
const normalized = normalizeMediaPath(cleaned);
if (manifestFiles && manifestFiles[normalized]) return toLocalPath(normalized);
```

### 3. Проверка артикула 0629 (gold, `boxes with handles`)

Пути в JSON: `/images/boxes with handles/gold/slide1.jpg` — этих файлов нет ни локально (`public/images/boxes with handles/gold/` содержит только `.webp`), ни в Supabase (ORB‑ошибка). После фикса №1 они подхватятся локально, **если** локальные `.webp` версии для gold есть; если нет — нужно отдельно сконвертировать/залить (вне этого плана).

Сейчас я не трогаю данные, только фиксирую проблему путей. По результату подскажу, какие конкретные артикулы остались без локальных файлов и их нужно либо перевести на `.webp` пути в JSON, либо догенерировать.

## Проверка после правок

1. Открыть preview главной → сетевой лог: запросы фото должны идти на `/images/...` (тот же origin), а не на supabase.
2. Скриншот: слайды во всех видимых карточках непустые.
3. Открыть страницу товара одной из категорий — поведение не должно регрессировать.

## Что НЕ меняю

- `public/data/products-public.json` и `js/data/products.js` — пути остаются как есть.
- `media-manifest.json`, скрипты сборки вариантов webp.
- Логику `productComponent` / страницы товара.

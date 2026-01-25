
# План исправления Swiper — 2 блокера

## Текущие проблемы

### Блокер 1: Неправильные импорты Swiper 9

**js/services/swiperService.js (строки 1-6):**
```javascript
import Swiper, { Navigation, Pagination, Keyboard } from 'swiper';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
Swiper.use([Navigation, Pagination, Keyboard]);
```

Swiper 9.4.1 не экспортирует модули из корневого `'swiper'`. Синтаксис `Swiper.use()` устарел. Это вызывает ошибку сборки `Missing "./modules" specifier`.

**js/app.js (строки 1-3):**
```javascript
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
```

Эти пути могут конфликтовать с Vite — нужен bundle.

---

### Блокер 2: Слайдеры категорий не обновляются при смене цвета

**js/components/publicProductsComponent.js (строка 529):**
```javascript
if (swiperElement && swiperElement.swiper) {
```

Но в **js/services/swiperService.js (строка 61):**
```javascript
new Swiper(sliderEl, { ... });  // Ссылка теряется!
```

Инстанс Swiper создаётся, но не сохраняется. Свойство `.swiper` на DOM-элементе не всегда появляется — кнопки цветов не могут найти Swiper и обновить слайды.

---

## Шаги исправления

### Шаг 1: Исправить импорты в `js/services/swiperService.js`

Заменить строки 1-6 на bundle-импорт (только JS, без CSS):

```javascript
import Swiper from 'swiper/bundle';
```

Bundle уже включает Navigation, Pagination, Keyboard — не нужно `Swiper.use()` и `modules: [...]`.

---

### Шаг 2: Исправить импорты в `js/app.js`

Заменить строки 1-3 на один CSS bundle:

```javascript
import 'swiper/swiper-bundle.css';
```

CSS Swiper должен быть только в одном месте (app.js), чтобы избежать конфликтов каскада.

---

### Шаг 3: Добавить хранилище слайдеров категорий в `SwiperService`

В объект `SwiperService` (после строки 9) добавить:

```javascript
categorySwipersById: {},
```

---

### Шаг 4: Сохранять ссылки на слайдеры при инициализации

Изменить метод `initCategorySliders()` (строки 45-68):

```javascript
initCategorySliders() {
  requestAnimationFrame(() => {
    const categorySliders = document.querySelectorAll('.category-slider-container .swiper');
    
    categorySliders.forEach(sliderEl => {
      if (sliderEl.swiper) {
        sliderEl.swiper.destroy(true, true);
      }
      
      const slidesCount = sliderEl.querySelectorAll('.swiper-slide').length;
      
      const pagEl = sliderEl.querySelector('.swiper-pagination');
      const nextEl = sliderEl.querySelector('.swiper-button-next');
      const prevEl = sliderEl.querySelector('.swiper-button-prev');
      
      const swiper = new Swiper(sliderEl, {
        loop: slidesCount > 1,
        pagination: pagEl ? { el: pagEl, clickable: true } : undefined,
        navigation: nextEl && prevEl ? { nextEl, prevEl } : undefined,
      });
      
      // НОВОЕ: Сохраняем ссылку по ID
      if (sliderEl.id) {
        this.categorySwipersById[sliderEl.id] = swiper;
      }
    });
  });
},
```

---

### Шаг 5: Добавить метод обновления слайдеров категорий в `SwiperService`

Добавить новый метод после `updateSliderPhotos` (после строки 170):

```javascript
updateCategorySlider(categorySlug, newPhotos, getImageUrl) {
  const sliderId = `category-${categorySlug}-slider`;
  let swiper = this.categorySwipersById[sliderId];
  
  // Fallback: попробовать через DOM
  if (!swiper) {
    const swiperElement = document.getElementById(sliderId);
    if (swiperElement && swiperElement.swiper) {
      swiper = swiperElement.swiper;
    }
  }
  
  if (!swiper) return;
  
  swiper.removeAllSlides();
  
  newPhotos.forEach(photo => {
    const imageUrl = typeof getImageUrl === 'function' ? getImageUrl(photo) : photo;
    swiper.appendSlide(`
      <div class="swiper-slide">
        <img src="${imageUrl}" 
             alt="Товар" 
             class="category-slide-image"
             loading="lazy"
             onerror="this.src='/images/placeholder.jpg'" />
      </div>
    `);
  });
  
  swiper.update();
},
```

---

### Шаг 6: Обновить `publicProductsComponent.js`

Заменить метод `updateCategorySlider` (строки 525-551) на делегирование в SwiperService:

```javascript
updateCategorySlider(categorySlug, newPhotos) {
  SwiperService.updateCategorySlider(categorySlug, newPhotos, this.getImageUrl.bind(this));
},
```

---

## Сводка изменений

| Файл | Строки | Действие |
|------|--------|----------|
| `js/services/swiperService.js` | 1-6 | Заменить импорты на `import Swiper from 'swiper/bundle';` |
| `js/services/swiperService.js` | 9 | Добавить `categorySwipersById: {}` |
| `js/services/swiperService.js` | 45-68 | Сохранять swiper в `categorySwipersById` по ID |
| `js/services/swiperService.js` | после 170 | Добавить метод `updateCategorySlider()` |
| `js/app.js` | 1-3 | Заменить на `import 'swiper/swiper-bundle.css';` |
| `js/components/publicProductsComponent.js` | 525-551 | Делегировать в `SwiperService.updateCategorySlider()` |

---

## Техническое примечание: почему bundle

В `package.json` Swiper 9.4.1 экспорты настроены так:
- `"./bundle"` -> `swiper-bundle.esm.js` (всё включено)
- Нет экспорта `"./modules"` — именно поэтому ошибка `Missing "./modules" specifier`

Bundle включает Navigation, Pagination, Keyboard автоматически — не нужно `modules: [...]` в опциях.

---

## Важно: избежать ловушек

**Ловушка A — Двойной CSS импорт:**
CSS Swiper импортируем ТОЛЬКО в `app.js`. В `swiperService.js` — только JS.

**Ловушка B — ID слайдера:**
HTML использует `id="category-${categorySlug}-slider"` (строка 234 в publicProductsComponent).
Метод `updateCategorySlider` строит `sliderId = \`category-${categorySlug}-slider\`` — совпадает.

---

## Ожидаемый результат

1. `npm run build` проходит без ошибок
2. Каталог не зависает на "Загрузка..."
3. Swiper инициализируется корректно
4. Одинарный клик по цвету меняет фото в слайдере категории
5. Кнопка "К товару" работает

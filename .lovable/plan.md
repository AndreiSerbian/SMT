
# План миграции Swiper с CDN на npm/Vite

## Текущее состояние

```text
index.html:11-12
├── <link> swiper-bundle.min.css (CDN jsdelivr) ← УБРАТЬ
└── <script> swiper-bundle.min.js (CDN unpkg) ← УБРАТЬ

src/styles/tailwind.css:9-15
└── @import '../../public/css/*.css' × 7 ← УБРАТЬ все @import

js/app.js:1-2
└── import '@/styles/tailwind.css' ← расширить импорты

js/services/swiperService.js
├── initSwipers() — ловит ВСЕ .swiper (нет изоляции)
├── Нет initCategorySliders(), initModalSwiper()
└── updateSliderPhotos() — нет null-safe обновления

js/components/productComponent.js:503-549
├── window.modalSwiper = new Swiper(...) ← глобальный объект
├── Нет защиты от race condition
└── setTimeout в initCategorySliders()

js/components/publicProductsComponent.js:556-586
├── setTimeout(100) ← ненадёжно
├── new Swiper(...) напрямую
└── Нет изоляции селекторов

CSS с проблемами:
├── grouped-products.css:337-338 — font-size:0 !important, color:transparent !important
├── grouped-products.css:348-351 — content:'' !important, display:none !important
├── grouped-products.css:354-366 — SVG background-image
├── product-modal.css:65-68 — content:'', display:none
└── product-modal.css:79-84 — svg стили
```

---

## Шаги реализации

### Шаг 1: Установить Swiper через npm

```bash
npm install swiper
```

---

### Шаг 2: Удалить Swiper CDN из index.html

Удалить строки 11-12:
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@9/swiper-bundle.min.css"/>
<script src="https://unpkg.com/swiper/swiper-bundle.min.js"></script>
```

Оставить только Font Awesome CDN (строка 13).

---

### Шаг 3: Перенести CSS файлы в src/styles

Переместить:
- `public/css/grouped-products.css` → `src/styles/grouped-products.css`
- `public/css/product-modal.css` → `src/styles/product-modal.css`

---

### Шаг 4: Очистить src/styles/tailwind.css

Убрать все 7 строк `@import`, оставить только:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Порядок CSS контролируется в js/app.js */
```

---

### Шаг 5: Обновить js/app.js

Добавить импорты CSS в правильном порядке и динамическую загрузку admin CSS:

```javascript
// 1) Swiper CSS (bundle включает всё)
import 'swiper/css/bundle';

// 2) Tailwind CSS
import '@/styles/tailwind.css';

// 3) Кастомные стили (ПОСЛЕДНИМИ — побеждают по каскаду)
import '@/styles/grouped-products.css';
import '@/styles/product-modal.css';

// 4) Admin CSS — грузить/выгружать при смене hash
const loadAdminCss = () => {
  const hash = location.hash;
  const enabled = hash === '#admin' || hash.startsWith('#admin/');
  const links = document.querySelectorAll('link[data-admin-css="1"]');

  // Выгружаем при выходе из админки
  if (!enabled) {
    links.forEach(l => l.remove());
    return;
  }

  const adminStyles = [
    '/css/admin-storage.css',
    '/css/admin-drag-drop.css',
    '/css/admin-media.css',
    '/css/admin-media-modal.css',
    '/css/media-manager.css'
  ];

  adminStyles.forEach(href => {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.adminCss = '1';
    document.head.appendChild(link);
  });
};

loadAdminCss();
window.addEventListener('hashchange', loadAdminCss);

// ... остальной код без изменений
```

---

### Шаг 6: Переписать js/services/swiperService.js

Полная переработка с тремя изолированными методами и защитой от race condition:

```javascript
import Swiper from 'swiper/bundle';

const SwiperService = {
  swipersById: {},
  modalSwiper: null,
  modalInitToken: 0,
  
  // ТОВАРНЫЕ СЛАЙДЕРЫ: только .swiper[id^="product-slider-"]
  initSwipers() {
    const productSwipers = Array.from(document.querySelectorAll('.swiper')).filter(
      el => el.id?.startsWith('product-slider-')
    );
    
    productSwipers.forEach(swiperEl => {
      if (swiperEl.swiper) {
        swiperEl.swiper.destroy(true, true);
      }
      
      const productId = swiperEl.id.slice('product-slider-'.length);
      if (!productId) return;
      
      const slidesCount = swiperEl.querySelectorAll('.swiper-slide').length;
      
      // null-safe для pagination и navigation
      const pagEl = swiperEl.querySelector('.swiper-pagination');
      const nextEl = swiperEl.querySelector('.swiper-button-next');
      const prevEl = swiperEl.querySelector('.swiper-button-prev');
      
      const swiperInstance = new Swiper(swiperEl, {
        loop: slidesCount > 1,
        pagination: pagEl ? { el: pagEl, clickable: true } : undefined,
        navigation: nextEl && prevEl ? { nextEl, prevEl } : undefined,
      });
      
      this.swipersById[productId] = swiperInstance;
    });
  },
  
  // КАТЕГОРИИ: только .category-slider-container .swiper
  initCategorySliders() {
    requestAnimationFrame(() => {
      const categorySliders = document.querySelectorAll('.category-slider-container .swiper');
      
      categorySliders.forEach(sliderEl => {
        if (sliderEl.swiper) {
          sliderEl.swiper.destroy(true, true);
        }
        
        const slidesCount = sliderEl.querySelectorAll('.swiper-slide').length;
        
        // null-safe
        const pagEl = sliderEl.querySelector('.swiper-pagination');
        const nextEl = sliderEl.querySelector('.swiper-button-next');
        const prevEl = sliderEl.querySelector('.swiper-button-prev');
        
        new Swiper(sliderEl, {
          loop: slidesCount > 1,
          pagination: pagEl ? { el: pagEl, clickable: true } : undefined,
          navigation: nextEl && prevEl ? { nextEl, prevEl } : undefined,
        });
      });
    });
  },
  
  // МОДАЛКА: .modal-swiper с защитой от race condition
  initModalSwiper(startIndex = 0, totalSlides = 1, onReady) {
    this.modalInitToken += 1;
    const token = this.modalInitToken;
    
    if (this.modalSwiper) {
      this.modalSwiper.destroy(true, true);
      this.modalSwiper = null;
    }

    const el = document.querySelector('.modal-swiper');
    if (!el) return Promise.resolve(null);

    return new Promise(resolve => {
      requestAnimationFrame(() => {
        if (token !== this.modalInitToken) return resolve(null);
        
        const el2 = document.querySelector('.modal-swiper');
        if (!el2) return resolve(null);

        this.modalSwiper = new Swiper(el2, {
          loop: totalSlides > 1,
          initialSlide: startIndex,
          navigation: {
            nextEl: '.modal-swiper .swiper-button-next',
            prevEl: '.modal-swiper .swiper-button-prev',
          },
          pagination: {
            el: '.modal-swiper .swiper-pagination',
            clickable: true,
            type: 'fraction',
            formatFractionCurrent: (num) => num,
            formatFractionTotal: (num) => num,
            renderFraction: (currentClass, totalClass) => 
              `<span class="${currentClass}"></span> / <span class="${totalClass}"></span>`,
          },
          keyboard: { enabled: true, onlyInViewport: false },
          spaceBetween: 10,
        });

        if (typeof onReady === 'function') {
          onReady(this.modalSwiper);
        }

        resolve(this.modalSwiper);
      });
    });
  },
  
  destroyModalSwiper() {
    this.modalInitToken += 1;
    if (this.modalSwiper) {
      this.modalSwiper.destroy(true, true);
      this.modalSwiper = null;
    }
  },
  
  // null-safe обновление слайдов
  updateSliderPhotos(productId, newPhotos) {
    const swiper = this.swipersById[productId];
    if (!swiper) return;
    
    const swiperContainer = document.getElementById(`product-slider-${productId}`);
    if (!swiperContainer) return;
    
    const currentHeight = swiperContainer.offsetHeight;
    const currentWidth = swiperContainer.offsetWidth;
    
    swiperContainer.style.height = currentHeight + 'px';
    swiperContainer.style.width = currentWidth + 'px';
    
    const slideClass = swiper.slides[0]?.querySelector('img')?.className || 
                       'w-full h-80 object-contain hover:scale-105';
    
    swiper.removeAllSlides();
    
    newPhotos.forEach(image => {
      swiper.appendSlide(`
        <div class="swiper-slide">
          <img src="${image}" class="${slideClass}" />
        </div>
      `);
    });
    
    swiper.update();
    
    // null-safe обновление pagination и navigation
    if (swiper.pagination && swiper.pagination.render && swiper.pagination.update) {
      swiper.pagination.render();
      swiper.pagination.update();
    }
    
    if (swiper.navigation && swiper.navigation.update) {
      swiper.navigation.update();
    }
    
    setTimeout(() => {
      swiperContainer.style.height = '';
      swiperContainer.style.width = '';
    }, 100);
  }
};

export default SwiperService;
```

---

### Шаг 7: Обновить js/components/publicProductsComponent.js

Добавить импорт и заменить метод initCategorySliders():

```javascript
// В начало файла добавить:
import SwiperService from '../services/swiperService.js';

// Заменить метод initCategorySliders() (строки 556-586):
initCategorySliders() {
  SwiperService.initCategorySliders();
}

// Также обновить renderHTML() — убрать setTimeout(100):
// Строки 190-195:
const html = this.renderCategoryCards();

// Инициализируем слайдеры после рендера (без setTimeout)
requestAnimationFrame(() => {
  this.initCategorySliders();
});

return html;
```

---

### Шаг 8: Обновить js/components/productComponent.js

Добавить импорт и заменить работу с модалкой:

```javascript
// В начало файла добавить:
import SwiperService from '../services/swiperService.js';

// Строки 502-535 — заменить создание Swiper:
// БЫЛО:
if (window.modalSwiper) {
  window.modalSwiper.destroy(true, true);
}
window.modalSwiper = new Swiper('.modal-swiper', {...});

// СТАНЕТ:
SwiperService.initModalSwiper(startIndex, allMedia.length, (sw) => {
  // Можно добавить действия после создания
});

// Строки 545-549 — заменить уничтожение:
// БЫЛО:
if (window.modalSwiper) {
  window.modalSwiper.destroy(true, true);
  window.modalSwiper = null;
}

// СТАНЕТ:
SwiperService.destroyModalSwiper();
```

---

### Шаг 9: Исправить src/styles/grouped-products.css

Заменить строки 323-371 — убрать !important, SVG, использовать стандартные стрелки:

```css
/* Навигация слайдера */
.category-slider-container .swiper-button-next,
.category-slider-container .swiper-button-prev {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  width: 44px;
  height: 44px;
  margin-top: -22px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  /* УДАЛЕНО: font-size: 0 !important; */
  /* УДАЛЕНО: color: transparent !important; */
}

.category-slider-container .swiper-button-next:hover,
.category-slider-container .swiper-button-prev:hover {
  background: rgba(255, 255, 255, 1);
  transform: scale(1.05);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

/* Стандартные стрелки Swiper — только цвет и размер */
.category-slider-container .swiper-button-next::after,
.category-slider-container .swiper-button-prev::after {
  font-size: 18px;
  color: #374151;
  font-weight: bold;
  /* УДАЛЕНО: content: '' !important; */
  /* УДАЛЕНО: display: none !important; */
}

/* УДАЛЕНО: .swiper-button-prev с background-image SVG (строки 354-358) */
/* УДАЛЕНО: .swiper-button-next с background-image SVG (строки 361-366) */

/* Пагинация слайдера */
.category-slider-container .swiper-pagination {
  display: none;
}
```

---

### Шаг 10: Исправить src/styles/product-modal.css

Заменить строки 65-84 — убрать content:'', display:none, svg стили:

```css
/* Стандартные стрелки Swiper — только цвет и размер */
.modal-swiper .swiper-button-next::after,
.modal-swiper .swiper-button-prev::after {
  font-size: 20px;
  color: #374151;
  font-weight: bold;
  /* УДАЛЕНО: content: ''; */
  /* УДАЛЕНО: display: none; */
}

/* УДАЛЕНО: .swiper-button-prev svg, .swiper-button-next svg (строки 79-84) */
```

---

## Сводка изменений

| Файл | Действие |
|------|----------|
| `package.json` | npm install swiper |
| `index.html` | Удалить Swiper CDN (строки 11-12) |
| `public/css/grouped-products.css` | Переместить → `src/styles/` + очистить |
| `public/css/product-modal.css` | Переместить → `src/styles/` + очистить |
| `src/styles/tailwind.css` | Убрать все 7 `@import` |
| `js/app.js` | Импорт CSS в порядке + loadAdminCss() |
| `js/services/swiperService.js` | Полная переработка (3 метода + токен) |
| `js/components/publicProductsComponent.js` | Использовать SwiperService |
| `js/components/productComponent.js` | Использовать SwiperService |

---

## Три типа слайдеров (изолированы)

```text
initSwipers()          → .swiper[id^="product-slider-"]
                         (товары, null-safe pagination/navigation)

initCategorySliders()  → .category-slider-container .swiper
                         (категории, requestAnimationFrame, null-safe)

initModalSwiper()      → .modal-swiper
                         (модалка, Promise, токен отмены, callback onReady)
```

---

## Механизм токена отмены

```text
1. Открыли модалку → token = 1 → RAF запланирован
2. Быстро закрыли → destroyModalSwiper() → token = 2
3. RAF срабатывает → token !== this.modalInitToken → resolve(null)
4. Swiper НЕ создаётся на закрытом DOM ✓
```

---

## Порядок CSS в бандле

```text
1. swiper/css/bundle       — все стили Swiper (включая ::after стрелки)
2. tailwind base           — reset
3. tailwind components
4. tailwind utilities
5. grouped-products.css    — категории (последние, перебивают)
6. product-modal.css       — модалка (последние)

Admin CSS грузится/выгружается динамически при #admin или #admin/*.
```

---

## Чеклист результата

**Архитектура:**
- ❌ Нет Swiper CDN в index.html
- ✅ Swiper подключён через npm + import
- ✅ Один SwiperService — никакого new Swiper() в компонентах
- ❌ Нет window.modalSwiper
- ❌ Нет setTimeout(100)
- ✅ Есть защита от race condition (токен)
- ✅ CSS не импортируется через @import в tailwind.css

**CSS:**
- ❌ Нет !important, content:'', display:none
- ❌ Нет SVG background-image
- ✅ Стандартные ::after стрелки Swiper
- ✅ Admin CSS грузится только при #admin

**Поведение:**
- ✅ Модалка может открываться/закрываться быстро без ошибок
- ✅ updateSliderPhotos() не ломает pagination/navigation
- ✅ Нет ошибок "Swiper is not defined"
- ✅ Нет запросов к jsdelivr/unpkg
- ✅ Работает в dev и build

---

## Проверка после миграции

**Разработка:**
```bash
npm run dev
```

1. Network: Нет запросов к jsdelivr/unpkg
2. Console: Нет ошибок Swiper
3. UI: Стрелки `<` `>` видны на всех слайдерах
4. Модалка: Открывается/закрывается без ошибок
5. Категории: Навигация работает
6. Admin: Стили появляются при #admin, исчезают при выходе

**Продакшен:**
```bash
npm run build && npm run preview
```

7. dist/assets/: CSS бандл ~50KB
8. Сайт работает стабильно без CDN

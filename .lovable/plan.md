
Результат перепроверки: по текущему коду я не могу подтвердить, что на главной открывается первое изображение. Наоборот — последний фикс попал не в тот flow, поэтому баг у вас логично остался.

Что выяснено:
- Видимые карточки каталога на главной сейчас рендерит `js/components/publicProductsComponent.js`, не `homeComponent.js`.
- При смене цвета там используется цепочка:
  `PublicProductsComponent.selectCategoryColor()` → `PublicProductsComponent.updateCategorySlider()` → `SwiperService.updateCategorySlider()`
- Последний фикс был внесён в `SwiperService.updateSliderPhotos()`, а этот метод работает для другого/старого сценария (`.color-button`, `product-slider-*`), не для текущих карточек каталога.
- В `SwiperService.updateCategorySlider()` после пересборки слайдов есть только `swiper.update();` и нет сброса на нулевой слайд. В loop-режиме это и даёт сохранение старого индекса, из-за чего может показываться изображение с индексом 1.

План исправления:
1. Исправить `js/services/swiperService.js` в методе `updateCategorySlider()`.
2. После `swiper.update()` добавить такой же loop-safe reset, как уже сделано в `updateSliderPhotos()`:
   ```js
   if (swiper.params?.loop && typeof swiper.slideToLoop === 'function') {
     swiper.slideToLoop(0, 0);
   } else {
     swiper.slideTo(0, 0);
   }
   ```
3. Сразу после этого обновить pagination/navigation для category slider, чтобы не было регрессии в UI.
4. Ничего не менять в PDP, modal slider и логике перехода по товару.

Что проверить после патча:
- На главной в карточке категории клик по неактивному цвету показывает первое фото выбранного варианта, не второе.
- Повторное действие для перехода в товар работает как раньше.
- Пагинация/стрелки category slider не ломаются.
- PDP и modal slider ведут себя без изменений.

Техническая заметка:
- Это два разных пути:
  - старый: `homeComponent` / `.color-button` / `updateSliderPhotos()` / `product.photo`
  - текущий: `publicProductsComponent` / `.color-dot` / `updateCategorySlider()` / `product.photos`
- Поэтому прошлый фикс был локально правильным, но не для того компонента, который пользователь реально кликает на главной.

Если одобрите, следующий точечный фикс будет в одном месте: `SwiperService.updateCategorySlider()`.

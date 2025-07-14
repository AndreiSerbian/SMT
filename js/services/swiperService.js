
// Service for managing Swiper sliders
const SwiperService = {
  swipersById: {},
  
  // Инициализация всех слайдеров
  initSwipers() {
    const allSwiperContainers = document.querySelectorAll('.swiper');
    allSwiperContainers.forEach(swiperEl => {
      if (swiperEl.swiper) {
        swiperEl.swiper.destroy(true, true);
      }
      
      const productId = swiperEl.id.replace('product-slider-', '');
      
      // Проверяем количество слайдов
      const slides = swiperEl.querySelectorAll('.swiper-slide');
      const shouldUseLoop = slides.length > 1;
      
      const swiperInstance = new Swiper(swiperEl, {
        loop: shouldUseLoop, // Включаем loop только если слайдов больше 1
        pagination: {
          el: swiperEl.querySelector('.swiper-pagination'),
          clickable: true,
        },
        navigation: {
          nextEl: swiperEl.querySelector('.swiper-button-next'),
          prevEl: swiperEl.querySelector('.swiper-button-prev'),
        },
        // Скрываем навигацию если слайд один
        on: {
          init: function() {
            if (slides.length <= 1) {
              const nextBtn = swiperEl.querySelector('.swiper-button-next');
              const prevBtn = swiperEl.querySelector('.swiper-button-prev');
              const pagination = swiperEl.querySelector('.swiper-pagination');
              
              if (nextBtn) nextBtn.style.display = 'none';
              if (prevBtn) prevBtn.style.display = 'none';
              if (pagination) pagination.style.display = 'none';
            }
          }
        }
      });
      
      this.swipersById[productId] = swiperInstance;
    });
  },
  
  // Обновление фото в слайдере
  updateSliderPhotos(productId, newPhotos) {
    const swiper = this.swipersById[productId];
    if (!swiper) return;
    
    // Сохраняем текущие настройки слайдов
    const slideHeight = swiper.slides[0]?.querySelector('img')?.style.height;
    const slideWidth = swiper.slides[0]?.querySelector('img')?.style.width;
    const slideClass = swiper.slides[0]?.querySelector('img')?.className;
    
    // Удаляем старые слайды
    swiper.removeAllSlides();
    
    // Добавляем новые
    newPhotos.forEach(image => {
      swiper.appendSlide(`
        <div class="swiper-slide">
          <img src="${image}" class="${slideClass || 'w-full h-64 object-contain'}" />
        </div>
      `);
    });
    
    // Применяем сохраненные размеры к новым слайдам
    if (slideHeight && slideWidth) {
      swiper.slides.forEach(slide => {
        const img = slide.querySelector('img');
        if (img) {
          if (slideHeight) img.style.height = slideHeight;
          if (slideWidth) img.style.width = slideWidth;
        }
      });
    }
    
    // Обновляем настройки loop в зависимости от количества слайдов
    const shouldUseLoop = newPhotos.length > 1;
    if (swiper.params.loop !== shouldUseLoop) {
      swiper.params.loop = shouldUseLoop;
      swiper.loopDestroy();
      if (shouldUseLoop) {
        swiper.loopCreate();
      }
    }
    
    // Показываем/скрываем навигацию
    const swiperEl = swiper.el;
    const nextBtn = swiperEl.querySelector('.swiper-button-next');
    const prevBtn = swiperEl.querySelector('.swiper-button-prev');
    const pagination = swiperEl.querySelector('.swiper-pagination');
    
    if (newPhotos.length <= 1) {
      if (nextBtn) nextBtn.style.display = 'none';
      if (prevBtn) prevBtn.style.display = 'none';
      if (pagination) pagination.style.display = 'none';
    } else {
      if (nextBtn) nextBtn.style.display = 'block';
      if (prevBtn) prevBtn.style.display = 'block';
      if (pagination) pagination.style.display = 'block';
    }
    
    // Обновляем Swiper
    swiper.update();
  }
};

export default SwiperService;

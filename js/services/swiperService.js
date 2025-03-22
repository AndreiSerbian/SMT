
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
      
      const swiperInstance = new Swiper(swiperEl, {
        loop: true,
        pagination: {
          el: swiperEl.querySelector('.swiper-pagination'),
          clickable: true,
        },
        navigation: {
          nextEl: swiperEl.querySelector('.swiper-button-next'),
          prevEl: swiperEl.querySelector('.swiper-button-prev'),
        },
      });
      
      this.swipersById[productId] = swiperInstance;
    });
  },
  
  // Обновление фото в слайдере
  updateSliderPhotos(productId, newPhotos) {
    const swiper = this.swipersById[productId];
    if (!swiper) return;
    
    // Сохраняем текущие высоту и ширину слайдов
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
    
    // Обновляем Swiper
    swiper.update();
  }
};

export default SwiperService;

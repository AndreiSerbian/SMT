
// Service for managing Swiper sliders
const SwiperService = {
  swipersById: {},
  
  // Инициализация всех слайдеров
  initSwipers() {
    // Сначала уничтожаем существующие слайдеры, чтобы избежать дублирования
    Object.keys(this.swipersById).forEach(id => {
      if (this.swipersById[id] && typeof this.swipersById[id].destroy === 'function') {
        this.swipersById[id].destroy(true, true);
      }
    });
    this.swipersById = {};
    
    // Находим все контейнеры слайдеров
    const allSwiperContainers = document.querySelectorAll('.swiper');
    
    // Инициализируем каждый слайдер
    allSwiperContainers.forEach(swiperEl => {
      if (!swiperEl) return;
      
      const productId = swiperEl.id.replace('product-slider-', '');
      
      try {
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
      } catch (error) {
        console.error('Ошибка при инициализации слайдера:', error);
      }
    });
    
    return this.swipersById;
  },
  
  // Обновление фото в слайдере
  updateSliderPhotos(productId, newPhotos) {
    const swiper = this.swipersById[productId];
    if (!swiper) return;
    
    // Удаляем старые слайды
    swiper.removeAllSlides();
    
    // Добавляем новые
    newPhotos.forEach(image => {
      swiper.appendSlide(`
        <div class="swiper-slide">
          <img src="${image}" class="w-full h-64 object-contain" />
        </div>
      `);
    });
    
    // Обновляем Swiper
    swiper.update();
  }
};

export default SwiperService;

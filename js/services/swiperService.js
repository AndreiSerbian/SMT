
// Service for managing Swiper sliders
const SwiperService = {
  swipersById: {},
  
  // Инициализация всех слайдеров
  initSwipers() {
    const allSwiperContainers = document.querySelectorAll('.swiper');
    allSwiperContainers.forEach(swiperEl => {
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

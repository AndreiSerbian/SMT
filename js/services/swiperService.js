
const SwiperService = {
  swipersById: {},
  
  // инициализация всех слайдеров
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
  
  // обновление фото в слайдере
  updateSliderPhotos(productId, newPhotos) {
    const swiper = this.swipersById[productId];
    if (!swiper) return;
    
    // Сохранение высоты и ширины слайдов
    const slideHeight = swiper.slides[0]?.querySelector('img')?.style.height;
    const slideWidth = swiper.slides[0]?.querySelector('img')?.style.width;
    const slideClass = swiper.slides[0]?.querySelector('img')?.className;
    
    // удаление старые слайды
    swiper.removeAllSlides();
    
    // добавляем новые
    newPhotos.forEach(image => {
      swiper.appendSlide(`
        <div class="swiper-slide">
          <img src="${image}" class="${slideClass || 'w-full h-64 object-contain'}" />
        </div>
      `);
    });
    
    // принение сохраненных размеров к новым слайдам
    if (slideHeight && slideWidth) {
      swiper.slides.forEach(slide => {
        const img = slide.querySelector('img');
        if (img) {
          if (slideHeight) img.style.height = slideHeight;
          if (slideWidth) img.style.width = slideWidth;
        }
      });
    }
    
    // обновление Swiper
    swiper.update();
  }
};

export default SwiperService;

import Swiper from 'swiper';

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
      
      // Подсчитываем количество слайдов
      const slidesCount = swiperEl.querySelectorAll('.swiper-slide').length;
      
      const swiperInstance = new Swiper(swiperEl, {
        loop: slidesCount > 1, // Включаем loop только если больше одного слайда
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
    
    // Находим контейнер слайдера для фиксации размеров
    const swiperContainer = document.getElementById(`product-slider-${productId}`);
    if (!swiperContainer) return;
    
    // Сохраняем текущие размеры контейнера для предотвращения скачков
    const currentHeight = swiperContainer.offsetHeight;
    const currentWidth = swiperContainer.offsetWidth;
    
    // Фиксируем размеры контейнера
    swiperContainer.style.height = currentHeight + 'px';
    swiperContainer.style.width = currentWidth + 'px';
    
    // Сохраняем класс изображения
    const slideClass = swiper.slides[0]?.querySelector('img')?.className || 'w-full h-80 object-contain hover:scale-105';
    
    // Удаляем старые слайды
    swiper.removeAllSlides();
    
    // Добавляем новые слайды
    newPhotos.forEach(image => {
      swiper.appendSlide(`
        <div class="swiper-slide">
          <img src="${image}" class="${slideClass}" />
        </div>
      `);
    });
    
    // Обновляем Swiper
    swiper.update();
    
    // Убираем фиксированные размеры после короткой задержки
    setTimeout(() => {
      swiperContainer.style.height = '';
      swiperContainer.style.width = '';
    }, 100);
  }
};

export default SwiperService;

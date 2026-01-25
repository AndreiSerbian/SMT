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

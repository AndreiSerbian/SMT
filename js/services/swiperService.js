import Swiper from 'swiper/bundle';
import { getImageAttrsHtml } from './imageSizeService.js';

const SwiperService = {
  swipersById: {},
  categorySwipersById: {},
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
      
      const pagEl = swiperEl.querySelector('.swiper-pagination');
      const nextEl = swiperEl.querySelector('.swiper-button-next');
      const prevEl = swiperEl.querySelector('.swiper-button-prev');
      
      const swiperInstance = new Swiper(swiperEl, {
        loop: slidesCount > 1,
        observer: true,
        observeParents: true,
        pagination: pagEl ? { el: pagEl, clickable: true } : undefined,
        navigation: nextEl && prevEl ? { nextEl, prevEl } : undefined,
      });
      
      this.swipersById[productId] = swiperInstance;
    });
  },
  
  // КАТЕГОРИИ: только .category-slider-container .swiper
  initCategorySliders() {
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
        observer: true,
        observeParents: true,
        pagination: pagEl ? { el: pagEl, clickable: true } : undefined,
        navigation: nextEl && prevEl ? { nextEl, prevEl } : undefined,
      });
      
      if (sliderEl.id) {
        this.categorySwipersById[sliderEl.id] = swiper;
      }
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
          observer: true,
          observeParents: true,
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

    if (swiper.params?.loop && typeof swiper.slideToLoop === 'function') {
      swiper.slideToLoop(0, 0);
    } else {
      swiper.slideTo(0, 0);
    }
    
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
  },
  
  // Обновление слайдера категории при смене цвета
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
          <img ${getImageAttrsHtml(imageUrl, 'CATEGORY_SLIDER', { alt: 'Товар', class: 'category-slide-image', onerror: "this.onerror=null;this.src='/images/placeholder.svg'" })} />
        </div>
      `);
    });
    
    swiper.update();

    if (swiper.params?.loop && typeof swiper.slideToLoop === 'function') {
      swiper.slideToLoop(0, 0);
    } else {
      swiper.slideTo(0, 0);
    }

    if (swiper.pagination && swiper.pagination.render && swiper.pagination.update) {
      swiper.pagination.render();
      swiper.pagination.update();
    }

    if (swiper.navigation && swiper.navigation.update) {
      swiper.navigation.update();
    }
  }
};

export default SwiperService;


// Service for managing Swiper sliders
const SwiperService = {
  swipersById: {},
  
  // Initialize all sliders
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
        on: {
          slideChange: function() {
            // Update slide counter if it exists
            const counter = swiperEl.querySelector('.slide-counter');
            if (counter) {
              const activeIndex = this.realIndex + 1;
              const total = this.slides.length - 2; // Adjust for loop duplicates
              counter.textContent = `${activeIndex}/${total}`;
            }
          }
        }
      });
      
      this.swipersById[productId] = swiperInstance;
    });
  },
  
  // Update photos in a slider
  updateSliderPhotos(productId, newPhotos) {
    const swiper = this.swipersById[productId];
    if (!swiper) return;
    
    // Save current height and width of slides
    const slideHeight = swiper.slides[0]?.querySelector('img')?.style.height;
    const slideWidth = swiper.slides[0]?.querySelector('img')?.style.width;
    const slideClass = swiper.slides[0]?.querySelector('img')?.className;
    
    // Remove old slides
    swiper.removeAllSlides();
    
    // Add new slides
    newPhotos.forEach(image => {
      swiper.appendSlide(`
        <div class="swiper-slide">
          <img src="${image}" class="${slideClass || 'w-full h-96 object-contain'}" />
        </div>
      `);
    });
    
    // Apply saved dimensions to new slides
    if (slideHeight && slideWidth) {
      swiper.slides.forEach(slide => {
        const img = slide.querySelector('img');
        if (img) {
          if (slideHeight) img.style.height = slideHeight;
          if (slideWidth) img.style.width = slideWidth;
        }
      });
    }
    
    // Update the slide counter
    const counter = swiper.el.querySelector('.slide-counter');
    if (counter) {
      counter.textContent = `1/${newPhotos.length}`;
    }
    
    // Update Swiper
    swiper.update();
  },
  
  // Create product video player
  initProductVideos(videos, container) {
    if (!videos || videos.length === 0 || !container) return;
    
    // Clear existing videos if any
    container.innerHTML = '';
    
    // Create video elements
    videos.forEach(videoSrc => {
      const videoElement = document.createElement('video');
      videoElement.className = 'w-full rounded-lg mb-3';
      videoElement.controls = true;
      
      const sourceElement = document.createElement('source');
      sourceElement.src = videoSrc;
      sourceElement.type = 'video/mp4';
      
      videoElement.appendChild(sourceElement);
      videoElement.appendChild(document.createTextNode('Ваш браузер не поддерживает видео.'));
      
      container.appendChild(videoElement);
    });
  }
};

export default SwiperService;

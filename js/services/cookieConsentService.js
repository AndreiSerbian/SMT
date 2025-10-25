const CookieConsentService = {
  STORAGE_KEY: 'cookieConsent',
  AUTO_CLOSE_DELAY: 10000, // 10 секунд
  banner: null,
  autoCloseTimer: null,
  styleElement: null,

  // Проверка согласия
  hasConsent() {
    return localStorage.getItem(this.STORAGE_KEY) === 'true';
  },

  // Сохранение согласия
  saveConsent() {
    localStorage.setItem(this.STORAGE_KEY, 'true');
  },

  // Добавление стилей анимации
  injectStyles() {
    if (this.styleElement) return;
    
    this.styleElement = document.createElement('style');
    this.styleElement.textContent = `
      @keyframes slideUpCookie {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      @keyframes slideDownCookie {
        from {
          transform: translateY(0);
          opacity: 1;
        }
        to {
          transform: translateY(100%);
          opacity: 0;
        }
      }

      .cookie-slide-up {
        animation: slideUpCookie 0.4s ease-out forwards;
      }

      .cookie-slide-down {
        animation: slideDownCookie 0.4s ease-out forwards;
      }
    `;
    document.head.appendChild(this.styleElement);
  },

  // Показать баннер
  show() {
    if (this.hasConsent()) return;

    // Добавляем стили
    this.injectStyles();

    // Создаем баннер
    this.banner = document.createElement('div');
    this.banner.id = 'cookie-consent-banner';
    this.banner.className = 'fixed bottom-0 left-0 right-0 bg-blue-950 text-white p-4 shadow-lg z-50 cookie-slide-up';
    this.banner.innerHTML = `
      <div class="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="flex-1 text-sm md:text-base">
          Мы используем файлы cookie для улучшения работы сайта. 
          Подробную информацию вы найдете в 
          <a href="#privacy-policy" class="underline hover:text-blue-300 transition">Политике конфиденциальности</a>. 
          Продолжая просматривать этот сайт, вы соглашаетесь с условиями использования cookie–файлов, 
          а также с <a href="#terms-of-use" class="underline hover:text-blue-300 transition">условиями пользования</a> сайта.
        </div>
        <div class="flex items-center gap-3">
          <button id="cookie-accept-btn" class="bg-white text-blue-950 px-6 py-2 rounded hover:bg-gray-100 font-semibold transition">
            Согласен
          </button>
          <button id="cookie-close-btn" class="text-white hover:text-gray-300 transition" aria-label="Закрыть">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.banner);

    // Обработчики событий
    const acceptBtn = document.getElementById('cookie-accept-btn');
    const closeBtn = document.getElementById('cookie-close-btn');
    
    if (acceptBtn) {
      acceptBtn.addEventListener('click', () => this.accept());
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.accept());
    }

    // Автозакрытие через 10 секунд
    this.autoCloseTimer = setTimeout(() => this.accept(), this.AUTO_CLOSE_DELAY);
  },

  // Закрыть баннер и сохранить согласие
  accept() {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = null;
    }
    this.saveConsent();
    this.hide();
  },

  // Скрыть баннер с анимацией
  hide() {
    if (this.banner) {
      this.banner.classList.remove('cookie-slide-up');
      this.banner.classList.add('cookie-slide-down');
      
      setTimeout(() => {
        if (this.banner && this.banner.parentNode) {
          this.banner.remove();
        }
        this.banner = null;
      }, 400);
    }
  }
};

export default CookieConsentService;

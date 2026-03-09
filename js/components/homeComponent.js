import { cartService } from "../services/cartService.js";
import SwiperService from "../services/swiperService.js";
import { ColorService } from "../services/colorService.js";
import { productsService } from "../services/productsService.js";
import { PublicProductsComponent } from "./publicProductsComponent.js";
import CookieConsentService from "../services/cookieConsentService.js";

const HomeComponent = {
  swipersById: {},
  eventListeners: [],
  timeouts: [],
  productsWithPrices: [],

  // Получение уникальных категорий
  getCategories() {
    const categories = new Set();
    this.productsWithPrices.forEach((product) => {
      categories.add(`${product.name} (${product.sizeType})`);
    });
    return Array.from(categories);
  },

  // Загрузка товаров с ценами
  async loadProducts() {
    try {
      this.productsWithPrices = await productsService.getActiveProducts();
      console.log("Товары загружены:", this.productsWithPrices.length);
    } catch (error) {
      console.error("Ошибка загрузки товаров:", error);
      this.productsWithPrices = [];
    }
  },

  // Обновление отображения цены
  updatePriceDisplay(productId, newPrice) {
    // Можно добавить логику обновления цен в UI если нужно
    console.log(`Цена товара ${productId} обновлена до ${newPrice}`);
  },

  destroy(container) {
    // Очищаем таймеры
    this.timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    this.timeouts = [];

    // Очищаем слушатели событий
    this.eventListeners.forEach(({ element, event, handler }) => {
      if (element && element.removeEventListener) {
        element.removeEventListener(event, handler);
      }
    });
    this.eventListeners = [];

    // Очищаем слайдеры
    if (SwiperService && SwiperService.destroyAll) {
      SwiperService.destroyAll();
    }
    this.swipersById = {};
  },

  addEventListenerWithCleanup(element, event, handler) {
    element.addEventListener(event, handler);
    this.eventListeners.push({ element, event, handler });
  },

  // Загрузка каталога товаров
  async loadProductsCatalog(container) {
    const catalogContainer = container.querySelector("#products-catalog-container");
    if (catalogContainer) {
      try {
        // Показываем индикатор загрузки
        catalogContainer.innerHTML = `
          <div class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p class="mt-2 text-gray-500">Загрузка каталога товаров...</p>
          </div>
        `;

        const catalogHTML = await PublicProductsComponent.render();
        catalogContainer.innerHTML = catalogHTML;
        console.log("Products catalog loaded successfully");
      } catch (error) {
        console.error("Error loading products catalog:", error);
        catalogContainer.innerHTML = `
          <div class="text-center py-8">
            <p class="text-gray-500">Ошибка загрузки каталога товаров: ${error.message}</p>
            <button onclick="location.reload()" class="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Повторить попытку
            </button>
          </div>
        `;
      }
    }
  },

  async render(container) {
    if (!container) {
      console.error("Container not provided to HomeComponent");
      return;
    }

    // Загружаем товары с актуальными ценами
    await this.loadProducts();

    const categories = HomeComponent.getCategories();
    const cartHTML = await cartService.renderCart();

    container.innerHTML = `
      <nav class="bg-white shadow-md relative">
        <div class="container mx-auto px-6 py-3">
          <div class="flex justify-between items-center">
            <a href="#" class="flex items-center text-xl font-bold text-gray-800">
              <img src="/images/logo.svg" alt="Logo" class="w-8 h-8 mr-2" />
              <span>SMT Premium Box</span>
            </a>
            
            <!-- Десктопное меню -->
            <div class="hidden md:flex space-x-4">
              <a href="#" class="text-gray-600 hover:text-gray-800">Главная</a>
              <a href="#contacts" class="text-gray-600 hover:text-gray-800">Контакты</a>
            </div>
            
            <!-- Мобильный бургер -->
            <button class="md:hidden text-2xl text-gray-800" id="mobile-menu-toggle">
              <span id="burger-icon">☰</span>
            </button>
          </div>
        </div>
        
        <!-- Мобильное меню -->
        <div id="mobile-menu" class="fixed inset-0 bg-white z-50 hidden md:hidden">
          <div class="flex justify-between items-center p-6 border-b">
            <a href="#" class="flex items-center text-xl font-bold text-gray-800">
              <img src="/images/logo.svg" alt="Logo" class="w-8 h-8 mr-2" />
              <span>SMT Premium Box</span>
            </a>
            <button class="text-2xl text-gray-800" id="mobile-menu-close">✕</button>
          </div>
          <div class="flex flex-col p-6 space-y-4">
            <a href="#" class="text-xl text-gray-800 py-2 border-b" id="mobile-home">Главная</a>
            <a href="#contacts" class="text-xl text-gray-800 py-2 border-b" id="mobile-contacts">Контакты</a>
          </div>
        </div>
      </nav>


<!-- Hero Section -->
<section class="bg-white">
  <div class="max-w-6xl mx-auto px-4 py-14 md:py-20">
    <div class="grid md:grid-cols-2 gap-10 md:items-center">
      <div>
        <h1 class="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
          Подарочные коробки оптом для&nbsp;бизнеса
        </h1>
        <p class="text-lg md:text-xl text-gray-500 mt-5 max-w-lg leading-relaxed">
          Премиальная упаковка для магазинов, флористов, корпоративных подарков и&nbsp;брендированных наборов.
        </p>
        <div class="mt-8 flex flex-wrap gap-3">
          <a href="#catalog"
             class="inline-flex items-center justify-center bg-gray-900 hover:bg-gray-700 text-white font-semibold py-3 px-7 rounded-xl transition shadow-lg shadow-gray-900/10">
            Перейти в каталог
          </a>
          <a href="#contacts"
             class="inline-flex items-center justify-center border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold py-3 px-7 rounded-xl transition">
            Оставить заявку
          </a>
        </div>
      </div>
      <div class="flex justify-center">
        <img src="/images/hero.jpg"
             alt="Подарочные коробки с бантом — розовая и белая"
             class="w-full max-w-lg h-auto rounded-2xl shadow-xl"
             loading="eager" />
      </div>
    </div>
  </div>
</section>

<!-- Что мы продаём -->
<section class="bg-white py-16 px-4" id="about-boxes">
  <div class="max-w-6xl mx-auto">
    <h2 class="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">Что мы продаём</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

      <!-- 1. Самосборные коробки -->
      <article class="bg-gray-50 rounded-2xl p-6 shadow-sm hover:shadow transition h-full">
        <div class="flex items-start gap-4">
          <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true" class="h-12 w-12 block">
              <g>
                <path fill="#80d261" d="M486.245 0H25.755C11.531 0 0 11.531 0 25.755v144L342.245 512h144C500.469 512 512 500.469 512 486.245V25.755C512 11.531 500.469 0 486.245 0z"/>
                <path fill="#68ca44" d="M486.245 0h-5.666a25.86 25.86 0 0 1 .515 5.151v408.632c0 42.865-34.749 77.613-77.613 77.613h-81.839L342.245 512h144C500.469 512 512 500.469 512 486.245V25.755C512 11.531 500.469 0 486.245 0z"/>
                <path fill="#ffc344" d="M342.245 144H25.755C11.531 144 0 155.531 0 169.755v144L198.245 512h144C356.469 512 368 500.469 368 486.245v-316.49C368 155.531 356.469 144 342.245 144z"/>
                <path fill="#feb237" d="M177.642 491.396 198.245 512h144c12.46 0 22.853-8.848 25.239-20.604z"/>
                <path fill="#fd6930" d="M198.245 288H25.755C11.531 288 0 299.531 0 313.755v172.491C0 500.469 11.531 512 25.755 512h172.491C212.469 512 224 500.469 224 486.245v-172.49C224 299.531 212.469 288 198.245 288z"/>
                <path fill="#fd5426" d="M.515 491.396C2.902 503.152 13.295 512 25.755 512h172.491c12.46 0 22.853-8.848 25.239-20.604z"/>
                <path fill="#000000" d="M458.539 48H341.472c-4.866 0-7.302 5.883-3.862 9.323l41.563 41.563L98.886 379.173 57.323 337.61c-3.44-3.441-9.323-1.004-9.323 3.862v117.067A5.461 5.461 0 0 0 53.461 464h117.067c4.865 0 7.302-5.883 3.862-9.323l-41.563-41.563 280.288-280.288 41.563 41.563c3.44 3.441 9.323 1.004 9.323-3.862V53.461A5.463 5.463 0 0 0 458.539 48z"/>
              </g>
              <g transform="translate(56 56) scale(12.5)">
                <g fill="#2979ff">
                  <path d="M20.44 11C18.14 11 15 11 15 8.83 15 7.44 19.49 2 22.67 2c5.1 0 7.24 9-2.22 9zM17 9c.67.27 2.68 0 3.44 0 6.64 0 4.81-5 2.22-5-1.74 0-4.99 3.73-5.67 5z" fill="#2563eb"/>
                  <path d="M11.56 11c-9.54 0-7.28-9-2.23-9C12.51 2 17 7.44 17 8.83 17 11 13.85 11 11.56 11zM9.34 4C8.05 4 7.01 5.12 7.01 6.5c0 2.26 3.19 2.5 4.56 2.5.77 0 2.77.27 3.44 0-.68-1.27-3.93-5-5.67-5zM27 14H5c-.55 0-1 .45-1 1v12c0 1.65 1.35 3 3 3h18c1.65 0 3-1.35 3-3V15c0-.55-.45-1-1-1z" fill="#2563eb"/>
                  <rect width="28" height="7" x="2" y="9" rx="1" fill="#2563eb"/>
                </g>
                <path fill="#1e3a8a" d="M4 16h24v1H4z"/>
                <path fill="#1e3a8a" d="M13 9h6v21h-6z"/>
              </g>
            </svg>
          </div>
          <div>
            <h3 class="text-xl font-semibold text-gray-800">Самосборные коробки</h3>
            <p class="text-gray-600 mt-1 leading-relaxed">Практичные коробки для упаковки наборов, подарков и товаров для бизнеса.</p>
          </div>
        </div>
      </article>

      <!-- 2. Коробки с лентой -->
      <article class="bg-gray-50 rounded-2xl p-6 shadow-sm hover:shadow transition h-full">
        <div class="flex items-start gap-4">
          <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" xml:space="preserve" aria-hidden="true" class="h-12 w-12 block">
              <g>
                <path d="m86.73 27.65-5-4.29-2.52-4.08a1 1 0 0 0-.85-.47H65.67a1 1 0 0 0-.85.47l-.75 1.22c0-15.23 0-14.46-.09-14.74s.27.24-4.55-5.41a1 1 0 0 0-.76-.35H37.33a1 1 0 0 0-.76.35c-5 5.86-4.48 5.21-4.57 5.47s-.07-.44-.07 14.68l-.75-1.22a1 1 0 0 0-.85-.47H17.68a1 1 0 0 0-.85.47l-2.52 4.08-5 4.29a1 1 0 0 0-.35.76v21.34a1 1 0 0 0 .35.76l5 4.3 2.52 4.07a1 1 0 0 0 .85.47h12.65a1 1 0 0 0 .85-.47l.75-1.22v13.79l-3.73 2.31a1 1 0 0 0-.47.85v12.65a1 1 0 0 0 .47.85l4.07 2.52 4.3 5a1 1 0 0 0 .76.35h21.34a1 1 0 0 0 .76-.35l4.3-5 4.07-2.52a1 1 0 0 0 .47-.85V74.61a1 1 0 0 0-.47-.85l-3.73-2.31V57.66l.75 1.22a1 1 0 0 0 .85.47h12.65a1 1 0 0 0 .85-.47l2.52-4.07 5-4.3a1 1 0 0 0 .35-.76V28.41a1 1 0 0 0-.31-.76z" fill="#172554"></path>
              </g>
            </svg>
          </div>
          <div>
            <h3 class="text-xl font-semibold text-gray-800">Коробки с лентой</h3>
            <p class="text-gray-600 mt-1 leading-relaxed">Подарочная упаковка с аккуратной подачей для корпоративных заказов и розничных магазинов.</p>
          </div>
        </div>
      </article>

      <!-- 3. Коробки для корпоративных подарков -->
      <article class="bg-gray-50 rounded-2xl p-6 shadow-sm hover:shadow transition h-full">
        <div class="flex items-start gap-4">
          <div class="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200">
            <span class="text-sm font-extrabold leading-none tracking-tight text-blue-900">B2B</span>
            <span class="my-1 h-px w-8 bg-slate-200"></span>
            <span class="text-sm font-extrabold leading-none tracking-tight text-blue-900">B2C</span>
          </div>
          <div>
            <h3 class="text-xl font-semibold text-gray-800">Коробки для корпоративных подарков</h3>
            <p class="text-gray-600 mt-1 leading-relaxed">Решения для упаковки клиентских, партнёрских и внутренних корпоративных наборов.</p>
          </div>
        </div>
      </article>

      <!-- 4. Упаковка для флористики и наборов -->
      <article class="bg-gray-50 rounded-2xl p-6 shadow-sm hover:shadow transition h-full">
        <div class="flex items-start gap-4">
          <div class="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true" class="h-12 w-12 block">
              <g>
                <path d="M465.589 429.5c-7.679 0-15.357 2.929-21.216 8.787l-27.431 27.425c-11.718 11.716-30.715 11.716-42.434 0l-27.429-27.424c-11.718-11.716-30.715-11.716-42.434 0l-27.429 27.424c-11.718 11.716-30.715 11.716-42.434 0l-27.429-27.424c-11.718-11.716-30.715-11.716-42.434 0l-27.429 27.424c-11.718 11.716-30.715 11.716-42.434 0l-27.431-27.425c-5.859-5.858-13.537-8.787-21.216-8.787M473.089 52.5v-45H38.911v242" fill="none" stroke="#162456" stroke-width="15" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10"></path>
                <path d="M38.911 279.5v225h434.178v-422M473.089 429.5H38.911M473.089 399.5H38.911" fill="none" stroke="#162456" stroke-width="15" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10"></path>
                <path d="M465.589 354.5c-7.679 0-15.357 2.929-21.216 8.787l-27.431 27.425c-11.718 11.716-30.715 11.716-42.434 0l-27.429-27.424c-11.718-11.716-30.715-11.716-42.434 0l-27.429 27.424c-11.718 11.716-30.715 11.716-42.434 0l-27.429-27.424c-11.718-11.716-30.715-11.716-42.434 0l-27.429 27.424c-11.718 11.716-30.715 11.716-42.434 0l-27.431-27.425c-5.859-5.858-13.537-8.787-21.216-8.787M473.089 354.5H38.911M473.089 324.5H38.911M473.089 474.5H38.911" fill="none" stroke="#162456" stroke-width="15" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10"></path>
              </g>
            </svg>
            <div class="absolute inset-0 flex items-baseline justify-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true" class="h-8 w-8 block">
                <g>
                  <path d="M435.999 120.003H336c-5.522 0-10 4.477-10 10v191.999c0 38.598-31.402 70-70 70-38.525 0-70-31.168-70-70V130.003c0-5.523-4.478-10-10-10H76.001c-5.522 0-10 4.477-10 10v191.999C66.001 426.767 151.234 512 256 512s189.999-85.233 189.999-189.999V130.003c0-5.523-4.478-10-10-10zm-349.998 20h80v72h-80v-72zm339.998 181.999c0 93.737-76.262 169.999-169.999 169.999S86.001 415.739 86.001 322.002v-89.999h80v89.999c0 49.533 40.074 90 89.999 90 49.626 0 89.999-40.374 89.999-90v-89.999h80v89.999zm0-110h-80v-72h80v72z" fill="#172554"></path>
                </g>
              </svg>
            </div>
          </div>
          <div>
            <h3 class="text-xl font-semibold text-gray-800">Упаковка для флористики и наборов</h3>
            <p class="text-gray-600 mt-1 leading-relaxed">Коробки для композиций, подарочных комплектов и сезонных предложений.</p>
          </div>
        </div>
      </article>

      <!-- 5. Брендируемая упаковка -->
      <article class="bg-gray-50 rounded-2xl p-6 shadow-sm hover:shadow transition h-full">
        <div class="flex items-start gap-4">
          <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden">
            <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="512" height="512" viewBox="0 0 512 512" class="h-12 w-12 block">
              <g><path d="M69 239v-7.4c0-7.2-5.9-13.1-13.1-13.1h-6.3c-7.2 0-13.1 5.9-13.1 13.1v7.4c-2.8.9-4.8 3.4-4.8 6.5v11.1H21.1C13.3 256.6 7 263 7 270.7v37.7c0 3.8 3 6.8 6.8 6.8s6.8-3 6.8-6.8v-37.7c0-.2.2-.5.5-.5h10.5V435c0 2.1.9 3.9 2.4 5.2l12 27.2c1.1 2.4 3.5 4 6.2 4.1h.1c2.6 0 5-1.5 6.2-3.9l12.8-27.3c1.5-1.2 2.5-3.1 2.5-5.3V245.6c0-3.1-2.1-5.7-4.8-6.6zm-23.7 13.4h14.9v26H45.3zm0 175.8V292h14.9v136.3H45.3zm10-196v6.6H50v-6.6zm-5.7 209.7h5.8l-3 6.4z" fill="#1c398e" opacity="1"></path></g>
            </svg>
          </div>
          <div>
            <h3 class="text-xl font-semibold text-gray-800">Брендируемая упаковка</h3>
            <p class="text-gray-600 mt-1 leading-relaxed">Основа для кастомизации, брендирования и более узнаваемой подачи вашей продукции.</p>
          </div>
        </div>
      </article>

      <!-- 6. Оптовые поставки для бизнеса -->
      <article class="bg-gray-50 rounded-2xl p-6 shadow-sm hover:shadow transition h-full">
        <div class="flex items-start gap-4">
          <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" aria-hidden="true" class="h-12 w-12 block">
              <g>
                <g fill-rule="evenodd" clip-rule="evenodd">
                  <path fill="#3d7d33" d="M250.48 152.81h24.62v24.62h-24.62z"></path>
                  <path fill="#34668e" d="M117.62 44.7v4.54H90.01V35.97h27.61z"></path>
                  <path fill="#34668e" d="M133.29 55.5v13.13H74.35V50.62c0-1.03.84-1.88 1.88-1.88h5.69v4.54c0 2.24 1.82 4.05 4.05 4.05h35.71c2.24 0 4.05-1.81 4.05-4.05v-4.54h5.69c1.03 0 1.88.84 1.88 1.88z"></path>
                  <path fill="#34668e" d="M167.44 148.76v72.39H40.2V59.56h26.05v13.13c0 2.24 1.81 4.05 4.05 4.05h67.04c2.24 0 4.05-1.81 4.05-4.05V59.56h26.05z"></path>
                  <path fill="#3d7d33" d="M195.95 152.81v101.56H78.47v-25.12h93.02c2.24 0 4.05-1.81 4.05-4.05v-72.39zM321.53 152.81v101.56H204.05V152.81h38.33v28.67c0 2.24 1.81 4.05 4.05 4.05h32.72c2.24 0 4.05-1.81 4.05-4.05v-28.67z"></path>
                  <path fill="#3d7d33" d="M133.16 262.47v101.56H15.68V262.47h38.33v28.67c0 2.24 1.81 4.05 4.05 4.05h32.72c2.24 0 4.05-1.81 4.05-4.05v-28.67zM258.74 262.47v101.56H141.26V262.47h38.33v28.67c0 2.24 1.81 4.05 4.05 4.05h32.72c2.24 0 4.05-1.81 4.05-4.05v-28.67zM384.32 262.47v101.56H266.84V262.47h38.33v28.67c0 2.24 1.81 4.05 4.05 4.05h32.72c2.24 0 4.05-1.81 4.05-4.05v-28.67z"></path>
                </g>
              </g>
            </svg>
          </div>
          <div>
            <h3 class="text-xl font-semibold text-gray-800">Оптовые поставки для бизнеса</h3>
            <p class="text-gray-600 mt-1 leading-relaxed">Упаковка для компаний, которым важны объём, аккуратная подача и повторяемость заказов.</p>
          </div>
        </div>
      </article>

    </div>
  </div>
</section>

<!-- Наши преимущества -->
<section class="bg-gray-50 py-16 px-4">
  <div class="max-w-6xl mx-auto">
    <h2 class="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">Наши преимущества</h2>
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">

      <!-- 1. Оптовый формат работы -->
      <div class="bg-white rounded-2xl shadow-sm hover:shadow transition p-6 flex items-start gap-4 h-full">
        <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true" class="h-12 w-12 block">
            <g>
              <g data-name="Delivery">
                <path fill="#3a85de" d="M464 264H48a32 32 0 0 0-32 32v16a32 32 0 0 0 32 32h416a32 32 0 0 0 32-32v-16a32 32 0 0 0-32-32z"></path>
                <g fill="#153152">
                  <path d="M464 256h-24V152a8 8 0 0 0-8-8H320a8 8 0 0 0-8 8v104h-16V152a8 8 0 0 0-8-8H176a8 8 0 0 0-8 8v104H48a40.045 40.045 0 0 0-40 40v16a40.045 40.045 0 0 0 40 40h416a40.045 40.045 0 0 0 40-40v-16a40.045 40.045 0 0 0-40-40z"></path>
                </g>
              </g>
            </g>
          </svg>
        </div>
        <div>
          <h3 class="text-xl font-semibold text-gray-800">Оптовый формат работы</h3>
          <p class="text-gray-600 leading-relaxed">Работаем с бизнес-заказами и помогаем подобрать упаковку под ваши задачи.</p>
        </div>
      </div>

      <!-- 2. Презентабельный внешний вид -->
      <div class="bg-white rounded-2xl shadow-sm hover:shadow transition p-6 flex items-start gap-4 h-full">
        <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true" class="h-12 w-12 block">
            <g fill-rule="evenodd" clip-rule="evenodd">
              <path fill="#efd166" d="M279.78 26.741c37.271 27.898 28.818 24.822 75.302 27.407 17.854.993 32.355 13.16 36.434 30.571 3.852 16.444 5.737 37.178 18.291 48.961l21.776 20.438c13.039 12.237 16.325 30.879 8.259 46.837-21.002 41.549-19.44 32.691-13.915 78.917 2.122 17.755-7.343 34.149-23.78 41.189-42.796 18.328-35.905 12.546-61.387 51.509-9.787 14.965-27.575 21.439-44.692 16.266-44.564-13.468-35.57-13.468-80.134 0-17.117 5.173-34.905-1.301-44.692-16.266-25.482-38.963-18.591-33.181-61.387-51.509-16.438-7.04-25.902-23.433-23.78-41.189 5.525-46.226 7.087-37.368-13.915-78.917-8.067-15.958-4.78-34.6 8.258-46.837 33.946-31.861 29.449-24.07 40.067-69.399 4.078-17.411 18.579-29.578 36.434-30.571 46.483-2.586 38.031.491 75.302-27.407 14.314-10.716 33.244-10.716 47.559 0z"/>
              <ellipse cx="256" cy="204.651" fill="#eceff1" rx="112.839" ry="112.84" transform="rotate(-9.73 255.735 204.462)"/>
            </g>
            <g transform="translate(166.4 115.4) scale(1.4)">
              <path d="M124 51h-6.173l-.67-7.362A3.981 3.981 0 0 0 113.173 40H100V29.709A7.013 7.013 0 0 0 105 23v-5a4.004 4.004 0 0 0-4-4H27a4.004 4.004 0 0 0-4 4v5a7.013 7.013 0 0 0 5 6.709V40H14.827a3.981 3.981 0 0 0-3.984 3.639L10.173 51H4a4.004 4.004 0 0 0-4 4v18a4.004 4.004 0 0 0 4 4h6.173l.67 7.362A3.981 3.981 0 0 0 14.827 88H28v10.291A7.013 7.013 0 0 0 23 105v5a4.004 4.004 0 0 0 4 4h74a4.004 4.004 0 0 0 4-4v-5a7.013 7.013 0 0 0-5-6.709V88h13.173a3.981 3.981 0 0 0 3.984-3.639l.67-7.361H124a4.004 4.004 0 0 0 4-4V55a4.004 4.004 0 0 0-4-4Z" fill="#0b3372"/>
            </g>
          </svg>
        </div>
        <div>
          <h3 class="text-xl font-semibold text-gray-800">Презентабельный внешний вид</h3>
          <p class="text-gray-600 leading-relaxed">Коробки помогают сделать подачу подарков, наборов и товаров более аккуратной и заметной.</p>
        </div>
      </div>

      <!-- 3. Подходит для разных бизнес-сценариев -->
      <div class="bg-white rounded-2xl shadow-sm hover:shadow transition p-6 flex items-start gap-4 h-full">
        <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" aria-hidden="true" class="h-12 w-12 block">
            <g>
              <g fill-rule="evenodd" clip-rule="evenodd">
                <path fill="#3d7d33" d="M250.48 152.81h24.62v24.62h-24.62z"></path>
                <path fill="#34668e" d="M167.44 148.76v72.39H40.2V59.56h26.05v13.13c0 2.24 1.81 4.05 4.05 4.05h67.04c2.24 0 4.05-1.81 4.05-4.05V59.56h26.05z"></path>
                <path fill="#3d7d33" d="M195.95 152.81v101.56H78.47v-25.12h93.02c2.24 0 4.05-1.81 4.05-4.05v-72.39zM321.53 152.81v101.56H204.05V152.81h38.33v28.67c0 2.24 1.81 4.05 4.05 4.05h32.72c2.24 0 4.05-1.81 4.05-4.05v-28.67z"></path>
                <path fill="#3d7d33" d="M133.16 262.47v101.56H15.68V262.47h38.33v28.67c0 2.24 1.81 4.05 4.05 4.05h32.72c2.24 0 4.05-1.81 4.05-4.05v-28.67zM258.74 262.47v101.56H141.26V262.47h38.33v28.67c0 2.24 1.81 4.05 4.05 4.05h32.72c2.24 0 4.05-1.81 4.05-4.05v-28.67zM384.32 262.47v101.56H266.84V262.47h38.33v28.67c0 2.24 1.81 4.05 4.05 4.05h32.72c2.24 0 4.05-1.81 4.05-4.05v-28.67z"></path>
              </g>
            </g>
          </svg>
        </div>
        <div>
          <h3 class="text-xl font-semibold text-gray-800">Подходит для разных бизнес-сценариев</h3>
          <p class="text-gray-600 leading-relaxed">Упаковка для магазинов, флористов, корпоративных подарков и агентских проектов.</p>
        </div>
      </div>

      <!-- 4. Ассортимент размеров и форматов -->
      <div class="bg-white rounded-2xl shadow-sm hover:shadow transition p-6 flex items-start gap-4 h-full">
        <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" xml:space="preserve" aria-hidden="true" class="h-12 w-12 block">
            <g>
              <path d="m86.73 27.65-5-4.29-2.52-4.08a1 1 0 0 0-.85-.47H65.67a1 1 0 0 0-.85.47l-.75 1.22c0-15.23 0-14.46-.09-14.74s.27.24-4.55-5.41a1 1 0 0 0-.76-.35H37.33a1 1 0 0 0-.76.35c-5 5.86-4.48 5.21-4.57 5.47s-.07-.44-.07 14.68l-.75-1.22a1 1 0 0 0-.85-.47H17.68a1 1 0 0 0-.85.47l-2.52 4.08-5 4.29a1 1 0 0 0-.35.76v21.34a1 1 0 0 0 .35.76l5 4.3 2.52 4.07a1 1 0 0 0 .85.47h12.65a1 1 0 0 0 .85-.47l.75-1.22v13.79l-3.73 2.31a1 1 0 0 0-.47.85v12.65a1 1 0 0 0 .47.85l4.07 2.52 4.3 5a1 1 0 0 0 .76.35h21.34a1 1 0 0 0 .76-.35l4.3-5 4.07-2.52a1 1 0 0 0 .47-.85V74.61a1 1 0 0 0-.47-.85l-3.73-2.31V57.66l.75 1.22a1 1 0 0 0 .85.47h12.65a1 1 0 0 0 .85-.47l2.52-4.07 5-4.3a1 1 0 0 0 .35-.76V28.41a1 1 0 0 0-.31-.76z" fill="#172554"></path>
            </g>
          </svg>
        </div>
        <div>
          <h3 class="text-xl font-semibold text-gray-800">Ассортимент размеров и форматов</h3>
          <p class="text-gray-600 leading-relaxed">Можно подобрать решение под разные типы наборов, подарков и сезонных коллекций.</p>
        </div>
      </div>

      <!-- 5. Возможность кастомизации -->
      <div class="bg-white rounded-2xl shadow-sm hover:shadow transition p-6 flex items-start gap-4 h-full">
        <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden">
          <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="512" height="512" viewBox="0 0 512 512" class="h-12 w-12 block">
            <g><path d="M69 239v-7.4c0-7.2-5.9-13.1-13.1-13.1h-6.3c-7.2 0-13.1 5.9-13.1 13.1v7.4c-2.8.9-4.8 3.4-4.8 6.5v11.1H21.1C13.3 256.6 7 263 7 270.7v37.7c0 3.8 3 6.8 6.8 6.8s6.8-3 6.8-6.8v-37.7c0-.2.2-.5.5-.5h10.5V435c0 2.1.9 3.9 2.4 5.2l12 27.2c1.1 2.4 3.5 4 6.2 4.1h.1c2.6 0 5-1.5 6.2-3.9l12.8-27.3c1.5-1.2 2.5-3.1 2.5-5.3V245.6c0-3.1-2.1-5.7-4.8-6.6z" fill="#1c398e" opacity="1"></path></g>
          </svg>
        </div>
        <div>
          <h3 class="text-xl font-semibold text-gray-800">Возможность кастомизации</h3>
          <p class="text-gray-600 leading-relaxed">Упаковку можно адаптировать под бренд, подачу и специфику вашего предложения.</p>
        </div>
      </div>

      <!-- 6. Удобно для повторных заказов -->
      <div class="bg-white rounded-2xl shadow-sm hover:shadow transition p-6 flex items-start gap-4 h-full">
        <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 406.783 406.783" aria-hidden="true" class="h-12 w-12 block">
            <g><path d="M127.12 256.572c-19.742 0-35.741 15.993-35.741 35.737 0 19.745 15.999 35.738 35.741 35.738 19.749 0 35.744-15.993 35.744-35.738 0-19.744-15.995-35.737-35.744-35.737zM315.588 256.572c-19.742 0-35.74 15.993-35.74 35.737 0 19.745 15.998 35.738 35.74 35.738 19.75 0 35.744-15.993 35.744-35.738 0-19.744-15.994-35.737-35.744-35.737z" fill="#172554" opacity="1"></path><path d="M385.623 200.066c-13.105-3.407-20.604-5.549-25.75-15.487l-17.207-34.839c-5.148-9.938-18.518-18.07-29.707-18.07h-23.535s-3.166.066-3.166-3.12V99.331c0-11.327-6.41-20.595-20.045-20.595H74.405c-19.521 0-28.789 9.269-28.789 20.595v18.311s0 5.446 5.271 5.446h107.337c10.041 0 18.21 8.168 18.21 18.209v5.463c0 10.041-8.169 18.209-18.21 18.209H50.887s-5.271-.438-5.271 5.252v6.297c0 5.008 6.864 5.005 6.864 5.005h72.254c10.041 0 18.21 8.169 18.21 18.209v5.463c0 10.041-8.169 18.209-18.21 18.209H53.62s-8.004-.148-8.004 6.225v44.246c0 11.326 9.268 20.595 20.595 20.595h11.376c2.58 0 2.96-1.437 2.96-2.159 0-25.679 20.894-46.568 46.574-46.568 25.682 0 46.575 20.891 46.575 46.568 0 .725-.206 2.159 1.767 2.159h91.806c1.82 0 1.746-1.534 1.746-2.159 0-25.679 20.893-46.568 46.574-46.568s46.574 20.891 46.574 46.568c0 .725-.018 2.159 1.121 2.159h23.146c11.195 0 20.352-9.157 20.352-20.351v-38.664c.001-32.561-10.28-32.561-21.159-35.389z" fill="#172554" opacity="1"></path></g>
          </svg>
        </div>
        <div>
          <h3 class="text-xl font-semibold text-gray-800">Удобно для повторных заказов</h3>
          <p class="text-gray-600 leading-relaxed">Практичный формат для регулярных закупок, партий и повторяемых бизнес-задач.</p>
        </div>
      </div>

    </div>
  </div>
</section>

    </div>
  </div>
</section>

      <section id="catalog" class="bg-white py-16 px-4">
        <div class="max-w-6xl mx-auto">
          <h2 class="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
            Коллекция подарочных упаковок
          </h2>
          <div id="products-catalog-container">
            <!-- Здесь будет загружен компонент группировки товаров по категориям -->
          </div>
        </div>
      </section>
      ${cartHTML}
      
      <footer class="bg-blue-950 text-white py-8 mt-12">
        <div class="container mx-auto px-6">
          <div class="flex flex-col md:flex-row justify-between">
            <div class="mb-6 md:mb-0">
              <h3 class="text-xl font-bold mb-4">SMT Premium Box</h3>
              <p class="text-gray-400">Красивые подарочные коробки оптом</p>
            </div>
            <div>
              <h4 class="text-lg font-semibold mb-3">Контакты</h4>
              <p class="text-white-400">Телефон: +79153474616</p>
              <p class="text-white-400">Email: smtpremiumbox@serbiyan.ru</p>
            </div>
          </div>
          <div class="border-t border-gray-700 mt-8 pt-6 text-center">
            <div class="mb-4 space-x-4">
              <a href="#privacy-policy" class="text-gray-400 hover:text-white">Политика конфиденциальности</a>
              <a href="#terms-of-use" class="text-gray-400 hover:text-white">Условия пользования</a>
            </div>
            <p class="text-gray-400">&copy; 2025 SMT Premium Box. Все права защищены.</p>
          </div>
        </div>
      </footer>
    `;

    // Добавляем обработчики для мобильного меню
    const mobileMenuToggle = container.querySelector("#mobile-menu-toggle");
    const mobileMenu = container.querySelector("#mobile-menu");
    const mobileMenuClose = container.querySelector("#mobile-menu-close");
    const mobileHome = container.querySelector("#mobile-home");
    const mobileContacts = container.querySelector("#mobile-contacts");

    const openMobileMenu = () => {
      // Проверяем что это действительно мобильное устройство
      if (window.innerWidth < 768) {
        mobileMenu.classList.remove("hidden");
        document.body.style.overflow = "hidden";
      }
    };

    const closeMobileMenu = () => {
      mobileMenu.classList.add("hidden");
      document.body.style.overflow = "";
    };

    if (mobileMenuToggle) {
      HomeComponent.addEventListenerWithCleanup(mobileMenuToggle, "click", openMobileMenu);
    }

    if (mobileMenuClose) {
      HomeComponent.addEventListenerWithCleanup(mobileMenuClose, "click", closeMobileMenu);
    }

    if (mobileHome) {
      HomeComponent.addEventListenerWithCleanup(mobileHome, "click", () => {
        closeMobileMenu();
        window.location.href = "#";
      });
    }

    if (mobileContacts) {
      HomeComponent.addEventListenerWithCleanup(mobileContacts, "click", () => {
        closeMobileMenu();
        window.location.href = "#contacts";
      });
    }

    // Плавный скролл к каталогу по кнопке в герое
    const catalogBtn = container.querySelector('a[href="#catalog"]');
    const catalogSection = container.querySelector("#catalog");
    if (catalogBtn && catalogSection) {
      HomeComponent.addEventListenerWithCleanup(catalogBtn, "click", (e) => {
        e.preventDefault();
        catalogSection.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    // Инициализируем все слайдеры
    const timeoutId = setTimeout(() => {
      SwiperService.initSwipers();

      // Добавляем обработчики для кнопок цветов
      container.querySelectorAll(".color-button").forEach((button) => {
        let clickCount = 0;
        let clickTimer = null;

        const clickHandler = function (e) {
          e.preventDefault();
          e.stopPropagation();

          clickCount++;

          if (clickCount === 1) {
            clickTimer = setTimeout(() => {
              // Первый клик - меняем изображения
              const productId = this.dataset.productId;
              const baseName = this.dataset.baseName;
              const baseSize = this.dataset.baseSize;
              const chosenColor = this.dataset.color;

              console.log("First click on color:", chosenColor, "for product:", productId);

              // Находим соответствующий продукт с выбранным цветом
              const matchingProduct = HomeComponent.productsWithPrices.find(
                (p) => p.name === baseName && p.sizeType === baseSize && p.color === chosenColor,
              );

              if (matchingProduct) {
                // Обновляем изображения в слайдере
                SwiperService.updateSliderPhotos(productId, matchingProduct.photo);

                // Обновляем активную кнопку цвета
                ColorService.updateButtonColor(productId, chosenColor);
              }

              clickCount = 0;
            }, 300);
          } else if (clickCount === 2) {
            // Второй клик - переходим к товару
            clearTimeout(clickTimer);

            const productId = this.dataset.productId;
            const baseName = this.dataset.baseName;
            const baseSize = this.dataset.baseSize;
            const chosenColor = this.dataset.color;

            console.log("Second click on color:", chosenColor, "navigating to product");

            // Находим соответствующий продукт с выбранным цветом
            const matchingProduct = HomeComponent.productsWithPrices.find(
              (p) => p.name === baseName && p.sizeType === baseSize && p.color === chosenColor,
            );

            if (matchingProduct) {
              window.location.href = `#product/${matchingProduct.id}`;
            }

            clickCount = 0;
          }
        };

        HomeComponent.addEventListenerWithCleanup(button, "click", clickHandler);
      });

      // Добавляем обработчики для кнопок "Подробно"
      container.querySelectorAll(".view-all-btn").forEach((button) => {
        const clickHandler = function () {
          const productId = this.dataset.productId;

          // Находим активную кнопку цвета
          const activeColorButton = container.querySelector(
            `.color-button[data-product-id="${productId}"][data-active="true"]`,
          );

          if (activeColorButton) {
            // Получаем данные о выбранном цвете
            const baseName = activeColorButton.dataset.baseName;
            const baseSize = activeColorButton.dataset.baseSize;
            const chosenColor = activeColorButton.dataset.color;

            // Находим соответствующий продукт с выбранным цветом
            const matchingProduct = HomeComponent.productsWithPrices.find(
              (p) => p.name === baseName && p.sizeType === baseSize && p.color === chosenColor,
            );

            if (matchingProduct) {
              window.location.href = `#product/${matchingProduct.id}`;
              return;
            }
          }

          // Если активной кнопки нет, просто переходим к текущему продукту
          window.location.href = `#product/${productId}`;
        };

        HomeComponent.addEventListenerWithCleanup(button, "click", clickHandler);
      });
    }, 100);

    this.timeouts.push(timeoutId);

    // Асинхронно загружаем кнопки цветов для каждого продукта
    setTimeout(() => {
      this.loadColorButtons();
    }, 200);

    // Загружаем каталог товаров
    setTimeout(() => {
      this.loadProductsCatalog(container);
    }, 300);

    // Показываем cookie-баннер с небольшой задержкой
    setTimeout(() => {
      CookieConsentService.show();
    }, 500);
  },
};

// Добавляем метод для асинхронной загрузки кнопок цветов
HomeComponent.loadColorButtons = async function () {
  const categories = this.getCategories();

  for (const category of categories) {
    const [name, sizeTypeRaw] = category.split(" (");
    const sizeType = (sizeTypeRaw || "").slice(0, -1);

    // Находим продукт по умолчанию
    const product = this.productsWithPrices.find((p) => p.name === name && p.sizeType === sizeType);
    if (!product) continue;

    // Загружаем кнопки цветов
    try {
      const colorButtons = await ColorService.renderColorButtons(product);
      const container = document.getElementById(`color-buttons-${product.id}`);
      if (container) {
        container.innerHTML = colorButtons;
      }
    } catch (error) {
      console.error("Ошибка загрузки кнопок цветов для продукта:", product.id, error);
    }
  }
};

export default HomeComponent;

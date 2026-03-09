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
<section class="bg-white py-12 px-4 text-center">
  <h1 class="text-4xl md:text-5xl font-bold text-gray-900 mb-4">SMT Premium Box</h1>
  <p class="text-lg md:text-xl text-gray-600 mb-6">Оптовые продажи подарочных упаковок</p>
  <a href="#catalog" class="inline-block bg-blue-900 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition">
    Перейти в каталог коробок
  </a>
</section>

<!-- Что мы продаём -->
<section class="bg-white py-16 px-4" id="about-boxes">
  <div class="max-w-6xl mx-auto">
    <h2 class="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">Что мы продаём</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

      <!-- 1. Самосборные подарочные коробки -->
      <article class="bg-gray-50 rounded-xl p-6 shadow-sm hover:shadow transition">
        <div class="flex items-start gap-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 32 32" class="flex-shrink-0">
            <g fill="#2563eb">
              <path d="M20.44 11C18.14 11 15 11 15 8.83 15 7.44 19.49 2 22.67 2c5.1 0 7.24 9-2.22 9zM17 9c.67.27 2.68 0 3.44 0 6.64 0 4.81-5 2.22-5-1.74 0-4.99 3.73-5.67 5z"/>
              <path d="M11.56 11c-9.54 0-7.28-9-2.23-9C12.51 2 17 7.44 17 8.83 17 11 13.85 11 11.56 11zM9.34 4C8.05 4 7.01 5.12 7.01 6.5c0 2.26 3.19 2.5 4.56 2.5.77 0 2.77.27 3.44 0-.68-1.27-3.93-5-5.67-5zM27 14H5c-.55 0-1 .45-1 1v12c0 1.65 1.35 3 3 3h18c1.65 0 3-1.35 3-3V15c0-.55-.45-1-1-1z"/>
              <rect width="28" height="7" x="2" y="9" rx="1"/>
            </g>
            <path fill="#1e3a8a" d="M4 16h24v1H4z"/>
            <path fill="#1e3a8a" d="M13 9h6v21h-6z"/>
          </svg>
          <div>
            <h3 class="text-xl font-semibold text-gray-800">Самосборные подарочные коробки</h3>
            <p class="text-gray-600 mt-1">Продаём самосборные подарочные упаковки оптом, разных цветов, размеров и форматов.</p>
          </div>
        </div>
      </article>

      <!-- 2. Удобная упаковка -->
      <article class="bg-gray-50 rounded-xl p-6 shadow-sm hover:shadow transition">
        <div class="flex items-start gap-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="flex-shrink-0">
            <path d="m7.5 4.27 9 5.15"/>
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
            <path d="m3.3 7 8.7 5 8.7-5"/>
            <path d="M12 22V12"/>
          </svg>
          <div>
            <h3 class="text-xl font-semibold text-gray-800">Удобная упаковка</h3>
            <p class="text-gray-600 mt-1">Наши коробки поставляются в сложенном виде. Это упрощает хранение и транспортировку.</p>
          </div>
        </div>
      </article>

      <!-- 3. Конструкция на магнитах и лентах -->
      <article class="bg-gray-50 rounded-xl p-6 shadow-sm hover:shadow transition">
        <div class="flex items-start gap-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" class="flex-shrink-0">
            <path d="M6 15V9a6 6 0 0 1 12 0v6" stroke="#2563eb" stroke-width="2" stroke-linecap="round"/>
            <path d="M6 15a3 3 0 0 1-3-3V9" stroke="#2563eb" stroke-width="2" stroke-linecap="round"/>
            <path d="M18 15a3 3 0 0 0 3-3V9" stroke="#2563eb" stroke-width="2" stroke-linecap="round"/>
            <rect x="3" y="15" width="6" height="4" rx="1" fill="#2563eb"/>
            <rect x="15" y="15" width="6" height="4" rx="1" fill="#2563eb"/>
            <path d="M9 21h6" stroke="#1e3a8a" stroke-width="2" stroke-linecap="round"/>
            <path d="M12 19v2" stroke="#1e3a8a" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <div>
            <h3 class="text-xl font-semibold text-gray-800">Конструкция на магнитах и лентах</h3>
            <p class="text-gray-600 mt-1">Встроенные магниты и клейкие уголки помогут быстро собрать подарочную коробку.</p>
          </div>
        </div>
      </article>

      <!-- 4. B2B / B2C -->
      <article class="bg-gray-50 rounded-xl p-6 shadow-sm hover:shadow transition">
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 flex flex-col items-center gap-1">
            <span class="inline-block bg-blue-100 text-blue-800 font-bold text-sm px-3 py-1 rounded-full">B2B</span>
            <span class="inline-block bg-blue-50 text-blue-600 font-bold text-sm px-3 py-1 rounded-full">B2C</span>
          </div>
          <div>
            <h3 class="text-xl font-semibold text-gray-800">Для корпоративных подарков, мероприятий и продаж в розницу</h3>
            <p class="text-gray-600 mt-1">Упаковка подходит для корпоративных подарков, мероприятий и промо-наборов, создаёт эффектный внешний вид.</p>
          </div>
        </div>
      </article>

      <!-- 5. Оптовые заказы -->
      <article class="bg-gray-50 rounded-xl p-6 shadow-sm hover:shadow transition md:col-span-2 lg:col-span-1">
        <div class="flex items-start gap-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="flex-shrink-0">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
            <path d="M3 6h18"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          <div>
            <h3 class="text-xl font-semibold text-gray-800">Оптовые заказы</h3>
            <p class="text-gray-600 mt-1">Мы принимаем заказы от 10 000 ₽. Вы можете приобрести пробную коробку на Wildberries по ссылке в карточке товара.</p>
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
    <div class="grid md:grid-cols-2 lg:grid-cols-2 gap-8">

      <!-- 1. Удобна при работе с партиями -->
      <div class="bg-white rounded-xl shadow p-6 flex items-start gap-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="flex-shrink-0">
          <rect x="1" y="6" width="22" height="12" rx="2"/>
          <path d="M1 10h22"/>
          <path d="M7 6v12"/>
          <path d="M17 6v12"/>
        </svg>
        <div>
          <h3 class="text-xl font-semibold text-gray-800">Удобна при работе с партиями</h3>
          <p class="text-gray-600">Мы делаем практичную и презентабельную упаковку, которая удобна в хранении, сборке и использовании.</p>
        </div>
      </div>

      <!-- 2. Кастомизация -->
      <div class="bg-white rounded-xl shadow p-6 flex items-start gap-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="flex-shrink-0">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
          <path d="m15 5 4 4"/>
        </svg>
        <div>
          <h3 class="text-xl font-semibold text-gray-800">Кастомизация</h3>
          <p class="text-gray-600">Кастомизация — для корпоративных заказов, ваших товаров и оптовых продаж.</p>
        </div>
      </div>

      <!-- 3. Надежная конструкция -->
      <div class="bg-white rounded-xl shadow p-6 flex items-start gap-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="flex-shrink-0">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="m9 12 2 2 4-4" stroke="#2563eb" stroke-width="2"/>
        </svg>
        <div>
          <h3 class="text-xl font-semibold text-gray-800">Надежная конструкция и впечатляющий внешний вид</h3>
          <p class="text-gray-600">Плотный картон и жёсткая геометрия держат форму и производят впечатление на клиентов и партнёров.</p>
        </div>
      </div>

      <!-- 4. Забота о доставке -->
      <div class="bg-white rounded-xl shadow p-6 flex items-start gap-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="flex-shrink-0">
          <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
          <path d="M15 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 13.52 8H14"/>
          <circle cx="17" cy="18" r="2"/>
          <circle cx="7" cy="18" r="2"/>
        </svg>
        <div>
          <h3 class="text-xl font-semibold text-gray-800">Забота о доставке</h3>
          <p class="text-gray-600">Тщательная упаковка каждого заказа. Мы заботимся, чтобы коробка дошла до вас в идеальном состоянии.</p>
        </div>
      </div>

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

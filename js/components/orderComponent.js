import { products } from '../data/products.js';
import { cartService } from '../services/cartService.js';
import { env } from '../utils/env.js';

const OrderComponent = {
  eventListeners: [],
  
  destroy(container) {
    // Очищаем слушатели событий
    this.eventListeners.forEach(({ element, event, handler }) => {
      if (element && element.removeEventListener) {
        element.removeEventListener(event, handler);
      }
    });
    this.eventListeners = [];
  },
  
  addEventListenerWithCleanup(element, event, handler) {
    if (element && element.addEventListener) {
      element.addEventListener(event, handler);
      this.eventListeners.push({ element, event, handler });
    }
  },
  
  render(container) {
    if (!container) {
      console.error('Container not provided to OrderComponent');
      return;
    }
    
    // Принудительно сбрасываем стили прокрутки при загрузке
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.documentElement.style.overflow = '';
    
    const cart = cartService.getCart();
    
    // Check minimum order value
    const subtotal = cartService.getCartTotal();
    
    if (subtotal < env.minOrderAmount) {
      alert(`Минимальная сумма заказа — ${env.minOrderAmount}₽. Пожалуйста, добавьте ещё товары.`);
      window.location.hash = '#';
      return;
    }
    
    // Calculate discount
    let discountRate = 0;
    if (subtotal >= 50000) {
      discountRate = 5;
    } else if (subtotal >= 40000) {
      discountRate = 4;
    } else if (subtotal >= 30000) {
      discountRate = 3;
    } else if (subtotal >= 20000) {
      discountRate = 2;
    }
    
    const discount = Math.floor((subtotal * discountRate) / 100);
    const total = subtotal - discount;
    
    // Calculate total weight
    const totalWeightGrams = cart.reduce((total, item) => {
      const product = products.find(p => p.id === item.id);
      if (!product) return total;
      return total + (product.weight * 1000 * item.quantity); // Convert kg to grams
    }, 0);
    
    const formatWeight = (weightInGrams) => {
      if (weightInGrams >= 1000) {
        return `${(weightInGrams / 1000).toFixed(1)} кг`;
      }
      return `${weightInGrams} г`;
    };

    // Generate cart rows
    const cartRows = cart.map(item => {
      const product = products.find(p => p.id === item.id);
      if (!product) return '';
      // Получаем актуальную цену (если есть админская цена, используем её)
      const actualPrice = window.adminComponent?.productPrices[product.id] || product.price;
      const itemSum = actualPrice * item.quantity;
      const itemWeightGrams = product.weight * 1000 * item.quantity;
      return `
        <tr>
          <td class="border-b p-2">
            <div>${product.name} (${product.color})</div>
            <div class="text-sm text-gray-600">Вес: ${formatWeight(itemWeightGrams)}</div>
          </td>
          <td class="border-b p-2">${item.quantity}</td>
          <td class="border-b p-2">₽${actualPrice}</td>
          <td class="border-b p-2">₽${itemSum}</td>
        </tr>
      `;
    }).join('');
    
    container.innerHTML = `
      <nav class="bg-white shadow-md relative">
        <div class="container mx-auto px-6 py-3">
          <div class="flex justify-between items-center">
            <a href="#" class="flex items-center text-xl font-bold text-gray-800">
              <img src="https://giftboxopt.ru/assets/logo-B0ADOiza.svg" alt="Logo" class="w-8 h-8 mr-2" />
              <span>SMT Premium Box</span>
            </a>
            
            <!-- Десктопное меню -->
            <div class="hidden md:flex space-x-4">
              <a href="#" class="text-gray-600 hover:text-gray-800">Главная</a>
              <a href="#order" class="text-gray-600 hover:text-gray-800">Оформление заказа</a>
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
              <img src="https://giftboxopt.ru/assets/logo-B0ADOiza.svg" alt="Logo" class="w-8 h-8 mr-2" />
              <span>SMT Premium Box</span>
            </a>
            <button class="text-2xl text-gray-800" id="mobile-menu-close">✕</button>
          </div>
          <div class="flex flex-col p-6 space-y-4">
            <a href="#" class="text-xl text-gray-800 py-2 border-b" id="mobile-home">Главная</a>
            <a href="#order" class="text-xl text-gray-800 py-2 border-b" id="mobile-order">Оформление заказа</a>
          </div>
        </div>
      </nav>

      <main class="container mx-auto p-4">
        <h2 class="text-3xl font-bold mb-6">Корзина</h2>
        <div class="bg-white shadow rounded p-6">
          <!-- Таблица товаров -->
          <table class="w-full text-left">
            <thead>
              <tr>
                <th class="border-b p-2">Товар</th>
                <th class="border-b p-2">Количество</th>
                <th class="border-b p-2">Цена</th>
                <th class="border-b p-2">Сумма</th>
              </tr>
            </thead>
            <tbody id="cart-items">
              ${cartRows}
            </tbody>
          </table>

          <!-- Итоги -->
          <div class="mt-6 text-right">
            <p class="mb-2">Подытог: <span id="subtotal" class="font-semibold">${subtotal} ₽</span></p>
            <p class="mb-2">Скидка (${discountRate}%): <span id="discount" class="font-semibold">${discount} ₽</span></p>
            <p class="mb-2">Общий вес: <span id="total-weight" class="font-semibold">${formatWeight(totalWeightGrams)}</span></p>
            <p class="text-xl font-bold">Итого: <span id="total">${total} ₽</span></p>
          </div>
        </div>

        <h3 class="text-2xl font-bold mt-8 mb-4">Оформление заказа</h3>
        <p class="mb-2">Для оформления заказа заполните форму ниже. Мы свяжемся с вами для уточнения деталей.</p>

        <!-- Форма -->
        <form id="orderForm" class="grid grid-cols-1 md:grid-cols-2 space-4 mb-6 gap-4 md:gap-8">
          <div>
            <label class="block font-semibold mb-1" for="customerName">Имя <span class="text-red-500">*</span></label>
            <input type="text" id="customerName" name="customerName" required
              class="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring">
            <p id="nameError" class="text-red-500 text-sm mt-1 hidden">Пожалуйста, укажите ваше имя</p>
          </div>

          <div>
            <label class="block font-semibold mb-1" for="phone">Телефон <span class="text-red-500">*</span></label>
            <input type="tel" id="phone" name="phone" required 
              class="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring"
              placeholder="+7 (XXX) XXX-XX-XX" 
              maxlength="18"
            >
            <p id="phoneError" class="text-red-500 text-sm mt-1 hidden">Пожалуйста, введите 11 цифр номера телефона</p>
          </div>

          <div>
            <label class="block font-semibold mb-1" for="email">Электронная почта <span class="text-red-500">*</span></label>
            <input type="email" id="email" name="email" required
              class="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring">
            <p id="emailError" class="text-red-500 text-sm mt-1 hidden">Пожалуйста, укажите корректный email</p>
          </div>

          <div>
            <label class="block font-semibold mb-1" for="yandexAddress">Ближайший к Вам адрес ПВЗ Яндекс</label>
            <input type="text" id="yandexAddress" name="yandexAddress"
              class="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring"
              placeholder="Например, ул. Ленина, д. 10">
          </div>

          <div class="col-span-1 md:col-span-2">
            <label class="block font-semibold mb-1" for="comment">Комментарий к заказу</label>
            <textarea id="comment" name="comment" rows="3"
              class="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring"
              placeholder="Любые пожелания по заказу"></textarea>
          </div>

          <!-- Оплата -->
          <div>
            <span class="block font-semibold mb-1">Способ оплаты <span class="text-red-500">*</span></span>
            
            <label class="inline-flex items-center mr-4">
              <input type="radio" name="payment" value="cash" style="accent-color: #00008b;" class="mr-2" checked>
              <span>Оплата наличными</span>
            </label>
            <label class="inline-flex items-center">
              <input type="radio" name="payment" value="transfer" style="accent-color: #00008b;" class="mr-2">
              <span>Оплата переводом</span>
            </label>
          </div>

          <!-- Доставка / Самовывоз - обновленная секция -->
          <div>
            <span class="block font-semibold mb-1">Доставка / Самовывоз <span class="text-red-500">*</span></span>
            <div class="space-y-2">
              <label class="flex items-center">
                <input type="radio" name="delivery" value="delivery" style="accent-color: #00008b;" class="mr-2" checked>
                <span>Доставка</span>
              </label>
              <label class="flex items-center">
                <input type="radio" name="delivery" value="pickup_moscow" style="accent-color: #00008b;" class="mr-2">
                <span>Самовывоз – Москва, Производственная 12, к.2</span>
              </label>
              <label class="flex items-center">
                <input type="radio" name="delivery" value="pickup_ershovo" style="accent-color: #00008b;" class="mr-2">
                <span>Самовывоз – Московская область, Одинцовский район, д. Ершово</span>
              </label>
            </div>
          </div>

          <!-- Сообщение о состоянии -->
          <div id="orderStatus" class="col-span-1 md:col-span-2 hidden">
            <div class="bg-blue-100 text-blue-800 p-4 rounded my-4">
              <p class="font-semibold">Заказ отправлен. Подтвердите его по email.</p>
              <p class="text-sm mt-2">На указанный вами адрес электронной почты было отправлено письмо для подтверждения заказа.</p>
            </div>
          </div>

          <!-- Кнопка -->
          <button type="submit" id="submitButton" class="bg-blue-950 text-white px-4 py-2 rounded hover:bg-blue-800">
            Оформить предзаказ
          </button>
        </form>
      </main>
      
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
    const mobileMenuToggle = container.querySelector('#mobile-menu-toggle');
    const mobileMenu = container.querySelector('#mobile-menu');
    const mobileMenuClose = container.querySelector('#mobile-menu-close');
    const mobileHome = container.querySelector('#mobile-home');
    const mobileOrder = container.querySelector('#mobile-order');
    
    const openMobileMenu = () => {
      // Проверяем что это действительно мобильное устройство и не блокируем скролл на странице заказа
      if (window.innerWidth < 768 && window.location.hash !== '#order') {
        mobileMenu.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
      } else if (window.innerWidth < 768) {
        // На странице заказа показываем меню но не блокируем скролл
        mobileMenu.classList.remove('hidden');
      }
    };
    
    const closeMobileMenu = () => {
      mobileMenu.classList.add('hidden');
      // Всегда восстанавливаем скролл при закрытии меню
      document.body.style.overflow = '';
    };
    
    if (mobileMenuToggle) {
      OrderComponent.addEventListenerWithCleanup(mobileMenuToggle, 'click', openMobileMenu);
    }
    
    if (mobileMenuClose) {
      OrderComponent.addEventListenerWithCleanup(mobileMenuClose, 'click', closeMobileMenu);
    }
    
    if (mobileHome) {
      OrderComponent.addEventListenerWithCleanup(mobileHome, 'click', () => {
        closeMobileMenu();
        window.location.href = '#';
      });
    }
    
    if (mobileOrder) {
      OrderComponent.addEventListenerWithCleanup(mobileOrder, 'click', () => {
        closeMobileMenu();
        window.location.href = '#order';
      });
    }
    
    // Add input validation event listeners
    const nameInput = container.querySelector('#customerName');
    const phoneInput = container.querySelector('#phone');
    const emailInput = container.querySelector('#email');
    
    if (nameInput) {
      const nameBlurHandler = () => {
        const errorElem = container.querySelector('#nameError');
        if (!nameInput.value.trim()) {
          errorElem.classList.remove('hidden');
        } else {
          errorElem.classList.add('hidden');
        }
      };
      OrderComponent.addEventListenerWithCleanup(nameInput, 'blur', nameBlurHandler);
    }
    
    if (phoneInput) {
      const phoneBlurHandler = () => {
        const errorElem = container.querySelector('#phoneError');
        if (!phoneInput.value.trim() || !phoneInput.checkValidity()) {
          errorElem.classList.remove('hidden');
        } else {
          errorElem.classList.add('hidden');
        }
      };
      
      const phoneInputHandler = function() {
        const errorElem = container.querySelector('#phoneError');
        const cleanPhone = this.value.replace(/\D/g, '');
        
        if (cleanPhone.length !== 11) {
          errorElem.textContent = 'Пожалуйста, введите 11 цифр номера телефона';
          errorElem.classList.remove('hidden');
        } else {
          errorElem.classList.add('hidden');
        }
      };
      
      OrderComponent.addEventListenerWithCleanup(phoneInput, 'blur', phoneBlurHandler);
      OrderComponent.addEventListenerWithCleanup(phoneInput, 'input', phoneInputHandler);
    }
    
    if (emailInput) {
      const emailBlurHandler = () => {
        const errorElem = container.querySelector('#emailError');
        if (!emailInput.value.trim() || !emailInput.checkValidity()) {
          errorElem.classList.remove('hidden');
        } else {
          errorElem.classList.add('hidden');
        }
      };
      OrderComponent.addEventListenerWithCleanup(emailInput, 'blur', emailBlurHandler);
    }
    
    // Add form submission handler
    const form = container.querySelector('#orderForm');
    if (form) {
      const formSubmitHandler = (event) => OrderComponent.submitOrder(event, container);
      OrderComponent.addEventListenerWithCleanup(form, 'submit', formSubmitHandler);
    }
  },
  
  validateForm(form) {
    // Get form fields
    const name = form.customerName.value.trim();
    const phone = form.phone.value.trim();
    const email = form.email.value.trim();
    
    // Reset error messages
    form.querySelector('#nameError').classList.add('hidden');
    form.querySelector('#phoneError').classList.add('hidden');
    form.querySelector('#emailError').classList.add('hidden');
    
    // Validate required fields
    let isValid = true;
    
    if (!name) {
      form.querySelector('#nameError').classList.remove('hidden');
      isValid = false;
    }
    
    if (!phone || !/^(8|\+7)?[\d\s-]{10,15}$/.test(phone.replace(/\D/g, ''))) {
      form.querySelector('#phoneError').classList.remove('hidden');
      isValid = false;
    }
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      form.querySelector('#emailError').classList.remove('hidden');
      isValid = false;
    }
    
    return isValid;
  },
  
  submitOrder(event, container) {
    event.preventDefault();
    
    // Get form
    const form = event.target;
    
    // Validate form
    if (!OrderComponent.validateForm(form)) {
      return;
    }
    
    const name = form.customerName.value.trim();
    const phone = form.phone.value.trim();
    const email = form.email.value.trim();
    const yandexAddress = form.yandexAddress ? form.yandexAddress.value.trim() : '';
    const comment = form.comment ? form.comment.value.trim() : '';
    const paymentValue = form.payment.value;
    const deliveryValue = form.delivery.value;
    
    const cart = cartService.getCart();
    
    // Преобразуем корзину, добавляя информацию о товарах
    const cartItems = cart.map(item => {
      const product = products.find(p => p.id === item.id);
      if (!product) {
        console.error('Продукт не найден:', item.id);
        return null;
      }
      return {
        id: item.id,
        quantity: item.quantity,
        name: product.name,
        artikul: product.artikul,
        color: product.color,
        price: product.price
      };
    }).filter(item => item !== null);
    
    // Calculate order totals
    const subtotal = cartService.getCartTotal();
    
    let discountRate = 0;
    if (subtotal >= 50000) {
      discountRate = 5;
    } else if (subtotal >= 40000) {
      discountRate = 4;
    } else if (subtotal >= 30000) {
      discountRate = 3;
    } else if (subtotal >= 20000) {
      discountRate = 2;
    }
    
    const discount = Math.floor((subtotal * discountRate) / 100);
    const total = subtotal - discount;
    
    const orderData = {
      name: name,
      phone: phone,
      email: email,
      yandex_address: yandexAddress,
      comment: comment,
      payment: paymentValue,
      delivery: deliveryValue,
      cart_items: cartItems,
      subtotal: subtotal,
      discount: discount,
      total: total
    };
    
    // Показываем индикатор загрузки
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = 'Обработка...';
    
    // Получаем URL API из переменной окружения
    const apiUrl = env.supabaseUrl || 'https://bsndismiessofvhglzrv.supabase.co';
    
    console.log('Отправляем заказ на:', `${apiUrl}/functions/v1/order-processing`);
    console.log('Данные заказа:', orderData);
    
    // Отправляем заказ в Supabase Edge Function с улучшенной обработкой ошибок
    fetch(`${apiUrl}/functions/v1/order-processing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orderData }),
    })
    .then(response => {
      if (!response.ok) {
        // Если ответ не OK, получаем текст ошибки
        return response.text().then(text => {
          throw new Error(`HTTP ошибка ${response.status}: ${text}`);
        });
      }
      return response.json();
    })
    .then(data => {
      // Обработка успешного ответа
      if (data.success) {
        // Очистка корзины
        cartService.clearCart();
        
        // Показываем сообщение о подтверждении
        container.querySelector('#orderStatus').classList.remove('hidden');
        
        // Меняем текст кнопки
        submitButton.innerHTML = 'Заказ отправлен';
        
        // Скроллим к статусу заказа
        container.querySelector('#orderStatus').scrollIntoView({ behavior: 'smooth' });
        
        // Отключаем все поля формы
        const formInputs = form.querySelectorAll('input, textarea, button, select');
        formInputs.forEach(input => {
          input.disabled = true;
        });
      } else {
        // Обработка ошибки
        console.error('Ошибка данных:', data.error);
        alert(`Ошибка при оформлении заказа: ${data.error}`);
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
      }
    })
    .catch(error => {
      // Обработка ошибки сети
      console.error('Ошибка отправки заказа:', error);
      alert(`Ошибка при отправке заказа: ${error.message}`);
      submitButton.disabled = false;
      submitButton.innerHTML = originalButtonText;
    });
  }
};

export default OrderComponent;

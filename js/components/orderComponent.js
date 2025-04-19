
import { products } from '../data/products.js';
import { cartService } from '../services/cartService.js';
import { env } from '../utils/env.js';

const OrderComponent = {
  render() {
    const app = document.getElementById('app');
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
    
    // Generate cart rows
    const cartRows = cart.map(item => {
      const product = products.find(p => p.id === item.id);
      if (!product) return '';
      const itemSum = product.price * item.quantity;
      return `
        <tr>
          <td class="border-b p-2">${product.name} (${product.color})</td>
          <td class="border-b p-2">${item.quantity}</td>
          <td class="border-b p-2">₽${product.price}</td>
          <td class="border-b p-2">₽${itemSum}</td>
        </tr>
      `;
    }).join('');
    
    app.innerHTML = `
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
          <input type="tel" id="phone" name="phone" required pattern="^\\+?[0-9\\s\\-\\(\\)]{10,20}$"
            class="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring"
            placeholder="+7 (XXX) XXX-XX-XX">
          <p id="phoneError" class="text-red-500 text-sm mt-1 hidden">Пожалуйста, укажите корректный номер телефона</p>
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
              <span>Самовывоз – Москва, Производственная 12, к.2, подъезд 11</span>
            </label>
            <label class="flex items-center">
              <input type="radio" name="delivery" value="pickup_ershovo" style="accent-color: #00008b;" class="mr-2">
              <span>Самовывоз – Московская область, Одинцовский район, д. Ершово, "Парк-отель Ершово"</span>
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
          Оформить заказ
        </button>
      </form>
    </main>
    `;
    
    // Add input validation event listeners
    const nameInput = document.getElementById('customerName');
    const phoneInput = document.getElementById('phone');
    const emailInput = document.getElementById('email');
    
    nameInput.addEventListener('blur', () => {
      const errorElem = document.getElementById('nameError');
      if (!nameInput.value.trim()) {
        errorElem.classList.remove('hidden');
      } else {
        errorElem.classList.add('hidden');
      }
    });
    
    phoneInput.addEventListener('blur', () => {
      const errorElem = document.getElementById('phoneError');
      if (!phoneInput.value.trim() || !phoneInput.checkValidity()) {
        errorElem.classList.remove('hidden');
      } else {
        errorElem.classList.add('hidden');
      }
    });
    
    emailInput.addEventListener('blur', () => {
      const errorElem = document.getElementById('emailError');
      if (!emailInput.value.trim() || !emailInput.checkValidity()) {
        errorElem.classList.remove('hidden');
      } else {
        errorElem.classList.add('hidden');
      }
    });
    
    // Add form submission handler
    const form = document.getElementById('orderForm');
    form.addEventListener('submit', OrderComponent.submitOrder);
  },
  
  validateForm(form) {
    // Get form fields
    const name = form.customerName.value.trim();
    const phone = form.phone.value.trim();
    const email = form.email.value.trim();
    
    // Reset error messages
    document.getElementById('nameError').classList.add('hidden');
    document.getElementById('phoneError').classList.add('hidden');
    document.getElementById('emailError').classList.add('hidden');
    
    // Validate required fields
    let isValid = true;
    
    if (!name) {
      document.getElementById('nameError').classList.remove('hidden');
      isValid = false;
    }
    
    if (!phone || !/^\\+?[0-9\\s\\-\\(\\)]{10,20}$/.test(phone)) {
      document.getElementById('phoneError').classList.remove('hidden');
      isValid = false;
    }
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      document.getElementById('emailError').classList.remove('hidden');
      isValid = false;
    }
    
    return isValid;
  },
  
  submitOrder(event) {
    event.preventDefault();
    
    // Get form
    const form = event.target;
    
    // Validate form
    if (!OrderComponent.validateForm(form)) {
      return;
    }
    
    // Сбор данных формы
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
      return {
        id: item.id,
        quantity: item.quantity,
        name: product.name,
        artikul: product.artikul,
        color: product.color,
        price: product.price
      };
    });
    
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
    
    // Получаем URL из переменной окружения или используем хардкод как запасной вариант
    const apiUrl = env.supabaseUrl || 'https://bsndismiessofvhglzrv.supabase.co';
    
    // Отправляем заказ в Supabase Edge Function
    fetch(`${apiUrl}/functions/v1/order-processing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orderData }),
    })
    .then(response => response.json())
    .then(data => {
      // Обработка успешного ответа
      if (data.success) {
        // Очистка корзины
        cartService.clearCart();
        
        // Показываем сообщение о подтверждении
        document.getElementById('orderStatus').classList.remove('hidden');
        
        // Меняем текст кнопки
        submitButton.innerHTML = 'Заказ отправлен';
        
        // Скроллим к статусу заказа
        document.getElementById('orderStatus').scrollIntoView({ behavior: 'smooth' });
        
        // Отключаем все поля формы
        const formInputs = form.querySelectorAll('input, textarea, button, select');
        formInputs.forEach(input => {
          input.disabled = true;
        });
      } else {
        // Обработка ошибки
        alert(`Ошибка при оформлении заказа: ${data.error}`);
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
      }
    })
    .catch(error => {
      // Обработка ошибки сети
      console.error('Error submitting order:', error);
      alert(`Ошибка при отправке заказа: ${error.message}`);
      submitButton.disabled = false;
      submitButton.innerHTML = originalButtonText;
    });
  }
};

export default OrderComponent;

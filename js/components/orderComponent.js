
import { products } from '../data/products.js';
import { cartService } from '../services/cartService.js';
import { notificationService } from '../services/notificationService.js';

const OrderComponent = {
  render() {
    const app = document.getElementById('app');
    const cart = cartService.getCart();
    
    // Check minimum order value
    const subtotal = cart.reduce((sum, item) => {
      const product = products.find(p => p.id === item.id);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);
    
    if (subtotal < 10000) {
      alert('Минимальная сумма заказа — 10 000₽. Пожалуйста, добавьте ещё товары.');
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
      <form id="orderForm" class="grid grid-cols-2 space-4 mb-6 gap-8">
        <div>
          <label class="block font-semibold mb-1" for="customerName">Имя</label>
          <input type="text" id="customerName" name="customerName" required
            class="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring">
        </div>

        <div>
          <label class="block font-semibold mb-1" for="phone">Телефон</label>
          <input type="tel" id="phone" name="phone" required
            class="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring">
        </div>

        <div>
          <label class="block font-semibold mb-1" for="email">Электронная почта</label>
          <input type="email" id="email" name="email" required
            class="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring">
        </div>

        <div>
          <label class="block font-semibold mb-1" for="yandexAddress">Адрес ПВЗ Яндекс</label>
          <input type="text" id="yandexAddress" name="yandexAddress"
            class="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring"
            placeholder="Например, ул. Ленина, д. 10">
        </div>

        <div class="col-span-2">
          <label class="block font-semibold mb-1" for="comment">Комментарий к заказу</label>
          <textarea id="comment" name="comment" rows="3"
            class="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring"
            placeholder="Любые пожелания по заказу"></textarea>
        </div>

        <!-- Оплата -->
        <div>
          <span class="block font-semibold mb-1">Способ оплаты</span>
          
          <label class="inline-flex items-center mr-4">
            <input type="radio" name="payment" value="cash" style="accent-color: #00008b;" class="mr-2" checked>
            <span>Оплата наличными</span>
          </label>
          <label class="inline-flex items-center">
            <input type="radio" name="payment" value="transfer" style="accent-color: #00008b;" class="mr-2">
            <span>Оплата переводом</span>
          </label>
        </div>

        <!-- Доставка / Самовывоз -->
        <div>
          <span class="block font-semibold mb-1">Доставка / Самовывоз</span>
          <label class="inline-flex items-center mr-4">
            <input type="radio" name="delivery" value="delivery" style="accent-color: #00008b;" class="mr-2" checked>
            <span>Доставка</span>
          </label>
          <label class="inline-flex items-center">
            <input type="radio" name="delivery" value="pickup" style="accent-color: #00008b;" class="mr-2">
            <span>Самовывоз</span>
          </label>
        </div>

        <!-- Кнопка -->
        <button type="submit" class="bg-blue-950 text-white px-4 py-2 rounded hover:bg-blue-800">
          Оформить заказ
        </button>
      </form>
    </main>
    `;
    
    // Add form submission handler
    const form = document.getElementById('orderForm');
    form.addEventListener('submit', OrderComponent.submitOrder);
  },
  
  submitOrder(event) {
    event.preventDefault();
    
    // Сбор данных формы
    const form = event.target;
    const name = form.customerName.value.trim();
    const phone = form.phone.value.trim();
    const email = form.email.value.trim();
    const yandexAddress = form.yandexAddress.value.trim();
    const comment = form.comment.value.trim();
    const paymentValue = form.payment.value;
    const deliveryValue = form.delivery.value;
    
    // Проверка обязательных полей
    if (!name || !phone || !email) {
      alert('Пожалуйста, заполните поля Имя, Телефон и Email');
      return;
    }
    
    const cart = cartService.getCart();
    
    // Calculate order totals
    const subtotal = cart.reduce((sum, item) => {
      const product = products.find(p => p.id === item.id);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);
    
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
      customerName: name,
      phone: phone,
      email: email,
      yandexAddress: yandexAddress,
      comment: comment,
      payment: paymentValue,
      delivery: deliveryValue,
      cart: cart,
      subtotal: subtotal,
      discount: discount,
      total: total,
      created_at: new Date().toISOString()
    };
    
    // Отправка уведомления в Телеграм
    notificationService.sendTelegramNotification(orderData);
    
    // Очистка корзины
    cartService.clearCart();
    
    // Переход на главную
    window.location.hash = '#';
    
    alert('Заказ оформлен! Уведомление отправлено в Телеграм.');
  }
};

export default OrderComponent;

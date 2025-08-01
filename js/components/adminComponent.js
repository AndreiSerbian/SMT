import { supabase } from '../utils/supabase.js';
import { products } from '../data/products.js';
import { NotificationService } from '../services/notificationService.js';
import { fetchProducts, savePrice } from '../services/productPriceService.js';

export class AdminComponent {
  constructor() {
    // Проверяем сохраненное состояние авторизации
    this.isAuthenticated = sessionStorage.getItem('admin_authenticated') === 'true';
    this.currentAdminLogin = sessionStorage.getItem('admin_login');
    this.currentAdminPassword = sessionStorage.getItem('admin_password');
    this.productsWithPrices = [];
    this.maintenanceMode = false;
  }

  async render() {
    // Проверяем авторизацию при загрузке
    if (!this.isAuthenticated) {
      return this.renderLoginModal();
    }

    return this.renderAdminPanel();
  }

  renderLoginModal() {
    return `
      <div id="admin-login-modal" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
        <div class="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <h2 class="text-2xl font-bold text-center mb-6">🔐 Админ-панель</h2>
          <form id="admin-login-form">
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">Логин</label>
              <input 
                type="text" 
                id="admin-login" 
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
            </div>
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">Пароль</label>
              <input 
                type="password" 
                id="admin-password" 
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
            </div>
            <button 
              type="submit" 
              class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Войти
            </button>
          </form>
          <div id="admin-login-error" class="mt-4 text-red-600 text-sm hidden"></div>
          <button 
            id="close-admin-modal" 
            class="mt-4 w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    `;
  }

  renderAdminPanel() {
    return `
      <div class="min-h-screen bg-gray-100 p-6">
        <div class="max-w-4xl mx-auto">
          <div class="bg-white rounded-lg shadow-lg p-6">
            <div class="flex justify-between items-center mb-6">
              <h1 class="text-2xl font-bold text-gray-800">⚙️ Админ-панель</h1>
              <button 
                id="admin-logout" 
                class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                Выйти
              </button>
            </div>

            <!-- Режим технических работ -->
            <div class="mb-6 p-4 border rounded-lg ${this.maintenanceMode ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}">
              <div class="flex justify-between items-center">
                <div>
                  <span class="text-lg font-medium">🛠 Технические работы</span>
                  <span class="ml-2 text-sm ${this.maintenanceMode ? 'text-red-600' : 'text-green-600'}">
                    (${this.maintenanceMode ? 'Активны' : 'Отключены'})
                  </span>
                </div>
                <button 
                  id="toggle-maintenance" 
                  class="px-4 py-2 rounded-md text-white transition-colors ${this.maintenanceMode ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}"
                >
                  ${this.maintenanceMode ? 'Отключить' : 'Начать технические работы'}
                </button>
              </div>
            </div>

            <!-- Управление товарами -->
            <div>
              <h2 class="text-xl font-semibold mb-4">📦 Товары</h2>
              ${this.renderProductsCards()}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderProductsCards() {
    console.log('Rendering products cards. Products count:', this.productsWithPrices ? this.productsWithPrices.length : 0);
    
    if (!this.productsWithPrices || this.productsWithPrices.length === 0) {
      return `<div class="text-center text-gray-500 py-8">Товары не найдены</div>`;
    }

    return `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${this.productsWithPrices.map(product => {
          const currentPrice = product.price || '';
          return `
            <div class="bg-gray-50 rounded-lg p-4 border">
              <div class="mb-3">
                <div class="text-xs text-gray-500 font-mono">ID: ${product.id}</div>
                <div class="font-medium text-gray-900">${product.name}</div>
                <div class="text-sm text-gray-600">${product.color}</div>
                <div class="text-xs ${product.price ? 'text-green-600' : 'text-red-600'}">
                  ${product.price ? '✓ Цена установлена' : '⚠ Цена не установлена'}
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-sm text-gray-600">Цена:</span>
                <input 
                  type="number" 
                  id="price-${product.id}" 
                  value="${currentPrice}"
                  placeholder="Не установлена"
                  class="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="100"
                >
                <span class="text-sm text-gray-600">₽</span>
                <button 
                  onclick="window.adminComponent.updatePrice('${product.id}')"
                  class="ml-2 bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                >
                  ✓
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  async mount(container) {
    // Сброс стилей прокрутки при загрузке админки
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.documentElement.style.overflow = '';
    
    await this.loadSettings();
    await this.loadProductsWithPrices();
    
    container.innerHTML = await this.render();
    this.attachEventListeners(container);
    
    // Проверяем режим технических работ
    this.checkMaintenanceMode();
  }

  attachEventListeners(container) {
    if (!this.isAuthenticated) {
      // Обработчики для формы входа
      const loginForm = container.querySelector('#admin-login-form');
      const closeModal = container.querySelector('#close-admin-modal');
      
      if (loginForm) {
        loginForm.addEventListener('submit', (e) => this.handleLogin(e));
      }
      
      if (closeModal) {
        closeModal.addEventListener('click', () => {
          window.history.back();
        });
      }
    } else {
      // Обработчики для админ-панели
      const logoutBtn = container.querySelector('#admin-logout');
      const maintenanceBtn = container.querySelector('#toggle-maintenance');
      
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => this.logout());
      }
      
      if (maintenanceBtn) {
        maintenanceBtn.addEventListener('click', () => this.toggleMaintenance());
      }
    }
  }

  async handleLogin(event) {
    event.preventDefault();
    
    const login = document.getElementById('admin-login').value;
    const password = document.getElementById('admin-password').value;
    const errorDiv = document.getElementById('admin-login-error');
    
    try {
      // Проверяем логин и пароль в Supabase
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('login', login)
        .eq('password', password)
        .single();
      
      if (error || !data) {
        throw new Error('Неверный логин или пароль');
      }
      
      // Успешная авторизация
      this.isAuthenticated = true;
      this.currentAdminLogin = login;
      this.currentAdminPassword = password;
      sessionStorage.setItem('admin_authenticated', 'true');
      sessionStorage.setItem('admin_login', login);
      sessionStorage.setItem('admin_password', password);
      
      // Отправляем уведомление в Telegram
      await this.sendTelegramNotification(login);
      
      // Перерендериваем компонент
      const container = document.getElementById('app');
      if (container) {
        await this.mount(container);
      }
      
    } catch (error) {
      console.error('Login error:', error);
      errorDiv.textContent = error.message;
      errorDiv.classList.remove('hidden');
    }
  }

  async sendTelegramNotification(login) {
    try {
      const now = new Date();
      const dateTime = now.toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const message = `🔐 Вход в админ-панель\n👤 Логин: ${login}\n🕒 Время: ${dateTime}`;
      
      await NotificationService.sendTelegramMessage(message, true);
    } catch (error) {
      console.error('Failed to send Telegram notification:', error);
    }
  }

  logout() {
    this.isAuthenticated = false;
    sessionStorage.removeItem('admin_authenticated');
    sessionStorage.removeItem('admin_login');
    sessionStorage.removeItem('admin_password');
    window.location.hash = '#';
  }

  async loadSettings() {
    try {
      // Загружаем настройки из Supabase
      const { data, error } = await supabase
        .from('site_settings')
        .select('*');
      
      if (!error && data) {
        data.forEach(setting => {
          if (setting.key === 'maintenance_mode') {
            this.maintenanceMode = setting.value === 'true';
          }
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async loadProductsWithPrices() {
    try {
      this.productsWithPrices = await fetchProducts();
    } catch (error) {
      console.error('Failed to load products with prices:', error);
      this.productsWithPrices = products.map(p => ({ ...p, price: undefined }));
    }
  }

  async updatePrice(productId) {
    const priceInput = document.getElementById(`price-${productId}`);
    const button = priceInput.parentElement.querySelector('button');
    const newPrice = parseFloat(priceInput.value);
    
    if (isNaN(newPrice) || newPrice < 0) {
      this.showNotification('Введите корректную цену', 'error');
      return;
    }
    
    // Проверяем наличие учетных данных
    if (!this.currentAdminLogin || !this.currentAdminPassword) {
      this.showNotification('Ошибка: недостаточно данных для авторизации. Перелогиньтесь.', 'error');
      return;
    }
    
    // Показываем loading состояние
    const originalButtonText = button.innerHTML;
    button.innerHTML = '⏳';
    button.disabled = true;
    priceInput.disabled = true;
    
    try {
      // Используем edge function для обновления цены
      const response = await fetch('https://bsndismiessofvhglzrv.supabase.co/functions/v1/update-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: productId,
          price: newPrice,
          admin_login: this.currentAdminLogin,
          admin_password: this.currentAdminPassword
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update price');
      }
      
      // Обновляем локальные данные
      const product = this.productsWithPrices.find(p => p.id === productId);
      if (product) {
        product.price = newPrice;
      }
      
      // Показываем уведомление об успехе
      this.showNotification(`Цена товара обновлена: ${newPrice}₽`, 'success');
      
    } catch (error) {
      console.error('Failed to update price:', error);
      this.showNotification(`Ошибка: ${error.message}`, 'error');
      
      // Возвращаем старое значение в случае ошибки
      const product = this.productsWithPrices.find(p => p.id === productId);
      if (product && product.price !== undefined) {
        priceInput.value = product.price;
      } else {
        priceInput.value = '';
      }
    } finally {
      // Восстанавливаем кнопку
      button.innerHTML = originalButtonText;
      button.disabled = false;
      priceInput.disabled = false;
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : 
                   type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    
    notification.className = `fixed top-4 right-4 ${bgColor} text-white p-4 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => {
      notification.classList.remove('translate-x-full');
    }, 100);
    
    // Удаление через 4 секунды
    setTimeout(() => {
      notification.classList.add('translate-x-full');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }, 4000);
  }

  async toggleMaintenance() {
    try {
      this.maintenanceMode = !this.maintenanceMode;
      
      // Сохраняем в Supabase
      await supabase
        .from('site_settings')
        .upsert({
          key: 'maintenance_mode',
          value: this.maintenanceMode.toString()
        });
      
      // Перерендериваем компонент
      const container = document.getElementById('app');
      if (container) {
        await this.mount(container);
      }
      
      // Обновляем режим технических работ на всех страницах
      this.checkMaintenanceMode();
      
    } catch (error) {
      console.error('Failed to toggle maintenance mode:', error);
      alert('Ошибка при переключении режима технических работ');
    }
  }

  checkMaintenanceMode() {
    // Проверяем и применяем режим технических работ для других страниц
    const currentHash = window.location.hash;
    
    if (this.maintenanceMode && currentHash !== '#admin') {
      this.showMaintenanceOverlay();
    } else {
      this.hideMaintenanceOverlay();
    }
  }

  showMaintenanceOverlay() {
    let overlay = document.getElementById('maintenance-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'maintenance-overlay';
      overlay.className = 'fixed inset-0 bg-black/60 z-50 flex items-center justify-center';
      overlay.innerHTML = `
        <div class="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
          <div class="text-6xl mb-4">🛠</div>
          <h2 class="text-2xl font-bold text-gray-800 mb-4">Ведутся технические работы</h2>
          <p class="text-gray-600">Пожалуйста, зайдите позже.</p>
        </div>
      `;
      document.body.appendChild(overlay);
    }
  }

  hideMaintenanceOverlay() {
    const overlay = document.getElementById('maintenance-overlay');
    if (overlay) {
      overlay.remove();
    }
  }

  // Метод для получения актуальной цены товара
  static getProductPrice(productId) {
    if (window.adminComponent && window.adminComponent.productPrices[productId]) {
      return window.adminComponent.productPrices[productId];
    }
    
    const product = products.find(p => p.id === productId);
    return product ? product.price : 0;
  }
}

// Глобальный экземпляр для доступа к ценам из других компонентов
window.adminComponent = new AdminComponent();
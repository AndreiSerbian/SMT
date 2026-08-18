import { supabase } from '../utils/supabase.js';
import { AdminAuthComponent } from './adminAuthComponent.js';

/**
 * Компонент управления заказами
 */
export class AdminOrdersComponent {
  constructor() {
    this.orders = [];
    this.filteredOrders = [];
    this.isLoading = false;
    this.currentPage = 0;
    this.pageSize = 20;
    this.filters = {
      status: '',
      dateFrom: '',
      dateTo: ''
    };
  }

  async mount(container) {
    container.innerHTML = this.getLoadingHTML();
    await this.loadOrders();
    container.innerHTML = this.getHTML();
    this.attachEvents();
  }

  getLoadingHTML() {
    return `
      <div class="flex items-center justify-center py-12">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p class="text-slate-600">Загрузка заказов...</p>
        </div>
      </div>
    `;
  }

  getHTML() {
    return `
      <div class="space-y-4">
        <!-- Header with filters -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 class="text-2xl font-bold text-slate-900">Заказы</h2>
          
          <div class="flex flex-wrap gap-2">
            <select id="orderStatusFilter" class="px-3 py-2 border rounded-lg bg-white">
              <option value="">Все статусы</option>
              <option value="pending">Создан</option>
              <option value="confirmed">Подтверждён</option>
              <option value="processing">В обработке</option>
              <option value="shipped">Отправлен</option>
              <option value="delivered">Доставлен</option>
              <option value="completed">Завершён</option>
              <option value="cancelled">Отменён</option>
              <option value="rejected">Отказан</option>
              <option value="returned">Возврат</option>
              <option value="problem">Проблема</option>
            </select>
            <input type="date" id="orderDateFrom" class="px-3 py-2 border rounded-lg" placeholder="От">
            <input type="date" id="orderDateTo" class="px-3 py-2 border rounded-lg" placeholder="До">
          </div>
        </div>

        <!-- Analytics -->
        ${this.getAnalytics()}

        <!-- Orders table -->
        ${this.getOrdersTable()}

        <!-- Pagination -->
        ${this.getPagination()}
      </div>

      <!-- Order details modal -->
      <div id="orderModalContainer"></div>
    `;
  }

  getAnalytics() {
    // Учитываем в выручке заказы со статусом shipped и далее (кроме отменённых, отказанных, возвратов)
    const revenueStatuses = ['shipped', 'delivered', 'completed'];
    const lossStatuses = ['cancelled', 'rejected', 'returned'];
    
    const revenueOrders = this.filteredOrders.filter(o => 
      revenueStatuses.includes(o.order_status)
    );
    
    const lossOrders = this.filteredOrders.filter(o =>
      lossStatuses.includes(o.order_status)
    );
    
    const totalRevenue = revenueOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    const totalLosses = lossOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    const revenueCount = revenueOrders.length;
    const avgOrderValue = revenueCount > 0 ? totalRevenue / revenueCount : 0;
    
    // Все заказы (для общей статистики)
    const allOrdersCount = this.filteredOrders.length;
    const pendingCount = this.filteredOrders.filter(o => 
      o.order_status === 'pending' || o.order_status === 'confirmed' || o.order_status === 'processing'
    ).length;
    const problemCount = this.filteredOrders.filter(o => o.order_status === 'problem').length;

    return `
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div class="bg-white p-4 rounded-xl border">
          <div class="text-2xl font-bold text-blue-600">${allOrdersCount}</div>
          <div class="text-sm text-slate-600">Всего заказов</div>
        </div>
        <div class="bg-white p-4 rounded-xl border">
          <div class="text-2xl font-bold text-green-600">₽${totalRevenue.toFixed(2)}</div>
          <div class="text-sm text-slate-600">Выручка (отправлено+)</div>
        </div>
        <div class="bg-white p-4 rounded-xl border">
          <div class="text-2xl font-bold text-red-600">₽${totalLosses.toFixed(2)}</div>
          <div class="text-sm text-slate-600">Потери (отмены/возвраты)</div>
        </div>
        <div class="bg-white p-4 rounded-xl border">
          <div class="text-2xl font-bold text-orange-600">${pendingCount}</div>
          <div class="text-sm text-slate-600">В обработке</div>
        </div>
        <div class="bg-white p-4 rounded-xl border">
          <div class="text-2xl font-bold text-purple-600">₽${avgOrderValue.toFixed(2)}</div>
          <div class="text-sm text-slate-600">Средний чек</div>
        </div>
      </div>
    `;
  }

  getOrdersTable() {
    if (this.filteredOrders.length === 0) {
      return `
        <div class="bg-white rounded-xl border p-12 text-center">
          <p class="text-slate-600">Заказы не найдены</p>
        </div>
      `;
    }

    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    const pageOrders = this.filteredOrders.slice(start, end);

    return `
      <div class="bg-white rounded-xl border overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 border-b">
              <tr>
                <th class="px-3 py-2 text-left">№ заказа</th>
                <th class="px-3 py-2 text-left">Дата</th>
                <th class="px-3 py-2 text-left">Клиент</th>
                <th class="px-3 py-2 text-left">Телефон</th>
                <th class="px-3 py-2 text-left">Сумма</th>
                <th class="px-3 py-2 text-left">Статус</th>
                <th class="px-3 py-2 text-left">Действия</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              ${pageOrders.map(order => this.getOrderRow(order)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  getOrderRow(order) {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      processing: 'bg-purple-100 text-purple-700',
      shipped: 'bg-indigo-100 text-indigo-700',
      delivered: 'bg-green-100 text-green-700',
      completed: 'bg-emerald-100 text-emerald-700',
      cancelled: 'bg-red-100 text-red-700',
      rejected: 'bg-rose-100 text-rose-700',
      returned: 'bg-orange-100 text-orange-700',
      problem: 'bg-amber-100 text-amber-700'
    };

    const statusNames = {
      pending: 'Создан',
      confirmed: 'Подтверждён',
      processing: 'В обработке',
      shipped: 'Отправлен',
      delivered: 'Доставлен',
      completed: 'Завершён',
      cancelled: 'Отменён',
      rejected: 'Отказан',
      returned: 'Возврат',
      problem: 'Проблема'
    };

    const date = new Date(order.created_at);
    const formattedDate = date.toLocaleDateString('ru-RU', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <tr class="hover:bg-slate-50">
        <td class="px-3 py-2 font-mono text-xs">${order.order_number || order.id.slice(0, 8)}</td>
        <td class="px-3 py-2 whitespace-nowrap">${formattedDate}</td>
        <td class="px-3 py-2">${order.name}</td>
        <td class="px-3 py-2">${order.phone}</td>
        <td class="px-3 py-2 font-semibold">₽${parseFloat(order.total).toFixed(2)}</td>
        <td class="px-3 py-2">
          <span class="px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.order_status] || 'bg-gray-100 text-gray-700'}">
            ${statusNames[order.order_status] || order.order_status}
          </span>
        </td>
        <td class="px-3 py-2">
          <button onclick="adminOrders.viewOrder('${order.id}')" 
                  class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs">
            Подробнее
          </button>
        </td>
      </tr>
    `;
  }

  getPagination() {
    const totalPages = Math.ceil(this.filteredOrders.length / this.pageSize);
    if (totalPages <= 1) return '';

    return `
      <div class="flex justify-between items-center">
        <button id="prevOrdersPage" 
                class="px-4 py-2 rounded-lg border disabled:opacity-50" 
                ${this.currentPage === 0 ? 'disabled' : ''}>
          Назад
        </button>
        <span class="text-slate-600">Страница ${this.currentPage + 1} из ${totalPages}</span>
        <button id="nextOrdersPage" 
                class="px-4 py-2 rounded-lg border disabled:opacity-50"
                ${this.currentPage >= totalPages - 1 ? 'disabled' : ''}>
          Вперёд
        </button>
      </div>
    `;
  }

  attachEvents() {
    // Фильтры
    const statusFilter = document.getElementById('orderStatusFilter');
    const dateFrom = document.getElementById('orderDateFrom');
    const dateTo = document.getElementById('orderDateTo');

    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        this.filters.status = statusFilter.value;
        this.applyFilters();
      });
    }

    if (dateFrom) {
      dateFrom.addEventListener('change', () => {
        this.filters.dateFrom = dateFrom.value;
        this.applyFilters();
      });
    }

    if (dateTo) {
      dateTo.addEventListener('change', () => {
        this.filters.dateTo = dateTo.value;
        this.applyFilters();
      });
    }

    // Пагинация
    const prevBtn = document.getElementById('prevOrdersPage');
    const nextBtn = document.getElementById('nextOrdersPage');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.currentPage > 0) {
          this.currentPage--;
          this.refresh();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(this.filteredOrders.length / this.pageSize);
        if (this.currentPage < totalPages - 1) {
          this.currentPage++;
          this.refresh();
        }
      });
    }

    // Глобальная ссылка
    window.adminOrders = this;
  }

  async loadOrders() {
    this.isLoading = true;
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.orders = data || [];
      this.filteredOrders = [...this.orders];
    } catch (error) {
      console.error('Error loading orders:', error);
      alert('Ошибка загрузки заказов');
    } finally {
      this.isLoading = false;
    }
  }

  applyFilters() {
    this.filteredOrders = this.orders.filter(order => {
      // Фильтр по статусу
      if (this.filters.status && order.order_status !== this.filters.status) {
        return false;
      }

      // Фильтр по дате от
      if (this.filters.dateFrom) {
        const orderDate = new Date(order.created_at);
        const filterDate = new Date(this.filters.dateFrom);
        if (orderDate < filterDate) return false;
      }

      // Фильтр по дате до
      if (this.filters.dateTo) {
        const orderDate = new Date(order.created_at);
        const filterDate = new Date(this.filters.dateTo);
        filterDate.setHours(23, 59, 59);
        if (orderDate > filterDate) return false;
      }

      return true;
    });

    this.currentPage = 0;
    this.refresh();
  }

  async viewOrder(orderId) {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return;

    const modalHTML = `
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" 
           onclick="if(event.target === this) adminOrders.closeModal()">
        <div class="bg-white rounded-2xl max-w-2xl w-full p-6 my-8">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h3 class="text-xl font-bold">Заказ №${order.order_number || order.id.slice(0, 8)}</h3>
              <p class="text-sm text-slate-500">${new Date(order.created_at).toLocaleString('ru-RU')}</p>
            </div>
            <button onclick="adminOrders.closeModal()" class="text-2xl text-slate-400 hover:text-slate-600">&times;</button>
          </div>

          <div class="space-y-4">
            <!-- Клиент -->
            <div class="bg-slate-50 rounded-lg p-4">
              <h4 class="font-semibold mb-2">Информация о клиенте</h4>
              <div class="space-y-1 text-sm">
                <p><span class="text-slate-600">Имя:</span> ${order.name}</p>
                <p><span class="text-slate-600">Телефон:</span> ${order.phone}</p>
                ${order.email ? `<p><span class="text-slate-600">Email:</span> ${order.email}</p>` : ''}
                ${order.yandex_address ? `<p><span class="text-slate-600">Адрес:</span> ${order.yandex_address}</p>` : ''}
              </div>
            </div>

            <!-- Товары -->
            <div>
              <h4 class="font-semibold mb-2">Товары</h4>
              <div class="space-y-2">
                ${(Array.isArray(order.cart_items) ? order.cart_items : []).map(item => `
                  <div class="flex justify-between items-center bg-slate-50 rounded-lg p-3">
                    <div>
                      <p class="font-medium">${item.name}</p>
                      <p class="text-sm text-slate-600">${item.quantity} шт.</p>
                    </div>
                    <p class="font-semibold">₽${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Итого -->
            <div class="bg-slate-100 rounded-lg p-4">
              <div class="flex justify-between mb-1">
                <span>Подытог:</span>
                <span>₽${parseFloat(order.subtotal).toFixed(2)}</span>
              </div>
              ${order.discount ? `
                <div class="flex justify-between mb-1 text-green-600">
                  <span>Скидка:</span>
                  <span>-₽${parseFloat(order.discount).toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                <span>Итого:</span>
                <span>₽${parseFloat(order.total).toFixed(2)}</span>
              </div>
            </div>

            <!-- Статус -->
            <div>
              <label class="block text-sm font-medium mb-2">Статус заказа</label>
              <select id="orderStatus" class="w-full px-3 py-2 border rounded-lg">
                <option value="pending" ${order.order_status === 'pending' ? 'selected' : ''}>Создан</option>
                <option value="confirmed" ${order.order_status === 'confirmed' ? 'selected' : ''}>Подтверждён</option>
                <option value="processing" ${order.order_status === 'processing' ? 'selected' : ''}>В обработке</option>
                <option value="shipped" ${order.order_status === 'shipped' ? 'selected' : ''}>Отправлен</option>
                <option value="delivered" ${order.order_status === 'delivered' ? 'selected' : ''}>Доставлен</option>
                <option value="completed" ${order.order_status === 'completed' ? 'selected' : ''}>Завершён</option>
                <option value="cancelled" ${order.order_status === 'cancelled' ? 'selected' : ''}>Отменён</option>
                <option value="rejected" ${order.order_status === 'rejected' ? 'selected' : ''}>Отказан</option>
                <option value="returned" ${order.order_status === 'returned' ? 'selected' : ''}>Возврат</option>
                <option value="problem" ${order.order_status === 'problem' ? 'selected' : ''}>Проблема</option>
              </select>
            </div>

            ${order.comment ? `
              <div class="bg-blue-50 rounded-lg p-4">
                <h4 class="font-semibold mb-1">Комментарий к заказу</h4>
                <p class="text-sm">${order.comment}</p>
              </div>
            ` : ''}

            <!-- Действия -->
            <div class="flex gap-2 pt-4">
              <button onclick="adminOrders.closeModal()" 
                      class="flex-1 px-4 py-2 rounded-lg border hover:bg-slate-50">
                Закрыть
              </button>
              <button onclick="adminOrders.updateOrderStatus('${order.id}')" 
                      class="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                Сохранить статус
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    const modalContainer = document.getElementById('orderModalContainer');
    if (modalContainer) {
      modalContainer.innerHTML = modalHTML;
    }
  }

  async updateOrderStatus(orderId) {
    const statusSelect = document.getElementById('orderStatus');
    if (!statusSelect) return;

    const newStatus = statusSelect.value;

    try {
      // SAFE P0 patch: removed the nonexistent AdminAuthComponent.getAdminLogin() call and
      // the legacy set_admin_login_context RPC. Authorization is enforced by RLS:
      // "Admins can update orders" -> has_role(auth.uid(), 'admin').
      const { error } = await supabase
        .from('orders')
        .update({ order_status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      alert('Статус заказа обновлён');
      this.closeModal();
      await this.loadOrders();
      this.applyFilters();
    } catch (error) {
      console.error('Error updating order status:', error);
      const denied = error?.code === '42501' || /permission|policy|row-level/i.test(error?.message || '');
      alert(denied
        ? 'Недостаточно прав: нужна роль администратора. Войдите заново.'
        : 'Ошибка обновления статуса: ' + (error?.message || 'неизвестная ошибка'));
    }

  }

  closeModal() {
    const modalContainer = document.getElementById('orderModalContainer');
    if (modalContainer) {
      modalContainer.innerHTML = '';
    }
  }

  async refresh() {
    const container = document.getElementById('adminContent');
    if (container) {
      container.innerHTML = this.getHTML();
      this.attachEvents();
    }
  }

  destroy() {
    window.adminOrders = null;
  }
}

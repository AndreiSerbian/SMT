import { supabase } from '../utils/supabase.js';

/**
 * Компонент для управления B2B клиентами
 */
export class AdminClientsComponent {
  constructor() {
    this.clients = [];
    this.filteredClients = [];
    this.searchTerm = '';
    this.filterSegment = 'all';
  }

  async mount(container) {
    container.innerHTML = this.getLoadingHTML();
    await this.loadClients();
    container.innerHTML = this.getHTML();
    this.attachEvents();
  }

  getLoadingHTML() {
    return `
      <div class="flex items-center justify-center py-12">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p class="text-slate-600">Загрузка клиентов...</p>
        </div>
      </div>
    `;
  }

  async loadClients() {
    try {
      // Load from analytics view with aggregated data
      const { data, error } = await supabase
        .from('client_analytics')
        .select('*')
        .order('last_order_date', { ascending: false, nullsFirst: false });

      if (error) throw error;

      this.clients = data || [];
      this.applyFilters();
    } catch (error) {
      console.error('Error loading clients:', error);
      this.clients = [];
    }
  }

  applyFilters() {
    this.filteredClients = this.clients.filter(client => {
      // Search filter
      const matchesSearch = !this.searchTerm || 
        client.email?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        client.contact_name?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        client.phone?.includes(this.searchTerm) ||
        client.company_name?.toLowerCase().includes(this.searchTerm.toLowerCase());

      // Segment filter
      const matchesSegment = this.filterSegment === 'all' || 
        client.customer_segment === this.filterSegment;

      return matchesSearch && matchesSegment;
    });
  }

  getHTML() {
    const stats = this.getStatistics();

    return `
      <div class="space-y-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 class="text-2xl font-bold text-slate-900">Клиенты B2B</h2>
            <p class="text-slate-600 text-sm mt-1">Всего клиентов: ${this.clients.length}</p>
          </div>
        </div>

        <!-- Statistics Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          ${this.getStatisticsCardsHTML(stats)}
        </div>

        <!-- Filters -->
        <div class="bg-white rounded-xl border shadow-sm p-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Search -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Поиск</label>
              <input 
                type="text" 
                id="searchClients"
                placeholder="Email, имя, телефон, компания..."
                class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                value="${this.searchTerm}"
              >
            </div>
            
            <!-- Segment Filter -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Сегмент</label>
              <select 
                id="filterSegment"
                class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              >
                <option value="all" ${this.filterSegment === 'all' ? 'selected' : ''}>Все</option>
                <option value="new" ${this.filterSegment === 'new' ? 'selected' : ''}>Новые (1 заказ)</option>
                <option value="returning" ${this.filterSegment === 'returning' ? 'selected' : ''}>Возвращающиеся (2 заказа)</option>
                <option value="loyal" ${this.filterSegment === 'loyal' ? 'selected' : ''}>Лояльные (3+ заказов)</option>
                <option value="no_orders" ${this.filterSegment === 'no_orders' ? 'selected' : ''}>Без заказов</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Clients Table -->
        <div class="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-slate-50 border-b">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Email</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Контакт</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Телефон</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Компания</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Заказов</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Выручка</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Последний заказ</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Сегмент</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${this.getClientsRowsHTML()}
              </tbody>
            </table>
          </div>
          
          ${this.filteredClients.length === 0 ? `
            <div class="text-center py-12 text-slate-500">
              <p class="text-lg mb-2">Клиенты не найдены</p>
              <p class="text-sm">Попробуйте изменить фильтры</p>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Client Details Modal -->
      <div id="clientDetailsModal" class="hidden fixed inset-0 bg-black/50 z-50 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div id="clientDetailsContent"></div>
          </div>
        </div>
      </div>
    `;
  }

  getStatisticsCardsHTML(stats) {
    return `
      <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
        <div class="text-sm opacity-90 mb-1">Всего клиентов</div>
        <div class="text-3xl font-bold">${stats.totalClients}</div>
      </div>
      <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
        <div class="text-sm opacity-90 mb-1">Лояльные</div>
        <div class="text-3xl font-bold">${stats.loyalClients}</div>
        <div class="text-xs opacity-75 mt-1">3+ заказов</div>
      </div>
      <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
        <div class="text-sm opacity-90 mb-1">Общая выручка</div>
        <div class="text-3xl font-bold">${this.formatMoney(stats.totalRevenue)}</div>
      </div>
      <div class="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
        <div class="text-sm opacity-90 mb-1">Средний чек</div>
        <div class="text-3xl font-bold">${this.formatMoney(stats.avgRevenue)}</div>
      </div>
    `;
  }

  getStatistics() {
    return {
      totalClients: this.clients.length,
      loyalClients: this.clients.filter(c => c.customer_segment === 'loyal').length,
      totalRevenue: this.clients.reduce((sum, c) => sum + parseFloat(c.total_revenue || 0), 0),
      avgRevenue: this.clients.length > 0 
        ? this.clients.reduce((sum, c) => sum + parseFloat(c.total_revenue || 0), 0) / this.clients.length 
        : 0
    };
  }

  getClientsRowsHTML() {
    return this.filteredClients.map(client => `
      <tr class="hover:bg-slate-50 transition">
        <td class="px-4 py-3">
          <div class="text-sm font-medium text-slate-900">${client.email}</div>
        </td>
        <td class="px-4 py-3 text-sm text-slate-700">${client.contact_name || '-'}</td>
        <td class="px-4 py-3 text-sm text-slate-700">${client.phone || '-'}</td>
        <td class="px-4 py-3 text-sm text-slate-700">${client.company_name || '-'}</td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            ${client.total_orders} ${this.pluralize(client.total_orders, 'заказ', 'заказа', 'заказов')}
          </span>
        </td>
        <td class="px-4 py-3 text-sm font-medium text-slate-900">${this.formatMoney(client.total_revenue)}</td>
        <td class="px-4 py-3 text-sm text-slate-700">${this.formatDate(client.last_order_date)}</td>
        <td class="px-4 py-3">${this.getSegmentBadge(client.customer_segment)}</td>
        <td class="px-4 py-3">
          <button 
            class="btn-view-client text-sm text-blue-600 hover:text-blue-800 font-medium"
            data-client-id="${client.id}"
          >
            Подробнее
          </button>
        </td>
      </tr>
    `).join('');
  }

  getSegmentBadge(segment) {
    const badges = {
      'new': '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Новый</span>',
      'returning': '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Возвращается</span>',
      'loyal': '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Лояльный</span>',
      'no_orders': '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">Без заказов</span>'
    };
    return badges[segment] || badges['no_orders'];
  }

  attachEvents() {
    // Search
    const searchInput = document.getElementById('searchClients');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value;
        this.applyFilters();
        this.refreshTable();
      });
    }

    // Segment filter
    const segmentFilter = document.getElementById('filterSegment');
    if (segmentFilter) {
      segmentFilter.addEventListener('change', (e) => {
        this.filterSegment = e.target.value;
        this.applyFilters();
        this.refreshTable();
      });
    }

    // View client details
    document.querySelectorAll('.btn-view-client').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const clientId = e.target.getAttribute('data-client-id');
        this.showClientDetails(clientId);
      });
    });
  }

  refreshTable() {
    const tbody = document.querySelector('tbody');
    if (tbody) {
      tbody.innerHTML = this.getClientsRowsHTML();
      // Re-attach events for new buttons
      document.querySelectorAll('.btn-view-client').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const clientId = e.target.getAttribute('data-client-id');
          this.showClientDetails(clientId);
        });
      });
    }
  }

  async showClientDetails(clientId) {
    const modal = document.getElementById('clientDetailsModal');
    const content = document.getElementById('clientDetailsContent');
    
    if (!modal || !content) return;

    // Show loading
    modal.classList.remove('hidden');
    content.innerHTML = `
      <div class="p-8 text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
        <p class="text-slate-600">Загрузка данных клиента...</p>
      </div>
    `;

    try {
      // Load client details
      const { data: client, error: clientError } = await supabase
        .from('b2b_clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;

      // Load client orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Render details
      content.innerHTML = this.getClientDetailsHTML(client, orders || []);

      // Attach close event
      const closeBtn = document.getElementById('closeClientModal');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          modal.classList.add('hidden');
        });
      }

      // Close on backdrop click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
        }
      });
    } catch (error) {
      console.error('Error loading client details:', error);
      content.innerHTML = `
        <div class="p-8 text-center">
          <p class="text-red-600 mb-4">Ошибка загрузки данных клиента</p>
          <button id="closeClientModal" class="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">
            Закрыть
          </button>
        </div>
      `;
    }
  }

  getClientDetailsHTML(client, orders) {
    const totalRevenue = orders
      .filter(o => ['shipped', 'delivered', 'completed'].includes(o.order_status))
      .reduce((sum, o) => sum + parseFloat(o.total || 0), 0);

    return `
      <div class="p-6">
        <!-- Header -->
        <div class="flex justify-between items-start mb-6">
          <div>
            <h3 class="text-2xl font-bold text-slate-900 mb-2">Карточка клиента</h3>
            <p class="text-sm text-slate-600">ID: ${client.id}</p>
          </div>
          <button id="closeClientModal" class="text-slate-400 hover:text-slate-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Client Info -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div class="bg-slate-50 rounded-lg p-4">
            <h4 class="text-sm font-semibold text-slate-700 mb-3">Контактная информация</h4>
            <div class="space-y-2 text-sm">
              <div><span class="text-slate-600">Email:</span> <span class="font-medium">${client.email}</span></div>
              <div><span class="text-slate-600">Телефон:</span> <span class="font-medium">${client.phone || '-'}</span></div>
              <div><span class="text-slate-600">Контактное лицо:</span> <span class="font-medium">${client.contact_name || '-'}</span></div>
              <div><span class="text-slate-600">Компания:</span> <span class="font-medium">${client.company_name || '-'}</span></div>
            </div>
          </div>

          <div class="bg-slate-50 rounded-lg p-4">
            <h4 class="text-sm font-semibold text-slate-700 mb-3">Статистика</h4>
            <div class="space-y-2 text-sm">
              <div><span class="text-slate-600">Всего заказов:</span> <span class="font-medium">${orders.length}</span></div>
              <div><span class="text-slate-600">Выручка:</span> <span class="font-medium">${this.formatMoney(totalRevenue)}</span></div>
              <div><span class="text-slate-600">Дата регистрации:</span> <span class="font-medium">${this.formatDate(client.created_at)}</span></div>
              <div><span class="text-slate-600">Последнее обновление:</span> <span class="font-medium">${this.formatDate(client.updated_at)}</span></div>
            </div>
          </div>
        </div>

        <!-- Orders -->
        <div>
          <h4 class="text-lg font-semibold text-slate-900 mb-4">История заказов (${orders.length})</h4>
          ${orders.length > 0 ? `
            <div class="space-y-3 max-h-96 overflow-y-auto">
              ${orders.map(order => `
                <div class="border rounded-lg p-4 hover:bg-slate-50 transition">
                  <div class="flex justify-between items-start mb-2">
                    <div>
                      <span class="font-medium text-slate-900">Заказ #${order.id.substring(0, 8)}</span>
                      <span class="text-sm text-slate-600 ml-2">${this.formatDate(order.created_at)}</span>
                    </div>
                    <span class="text-lg font-bold text-slate-900">${this.formatMoney(order.total)}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    ${this.getOrderStatusBadge(order.order_status)}
                    <span class="text-sm text-slate-600">${order.cart_items?.length || 0} товаров</span>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <p class="text-center text-slate-500 py-8">У клиента пока нет заказов</p>
          `}
        </div>
      </div>
    `;
  }

  getOrderStatusBadge(status) {
    const statusMap = {
      'pending': { label: 'Ожидает', color: 'bg-yellow-100 text-yellow-800' },
      'confirmed': { label: 'Подтвержден', color: 'bg-blue-100 text-blue-800' },
      'processing': { label: 'В обработке', color: 'bg-purple-100 text-purple-800' },
      'shipped': { label: 'Отправлен', color: 'bg-indigo-100 text-indigo-800' },
      'delivered': { label: 'Доставлен', color: 'bg-green-100 text-green-800' },
      'completed': { label: 'Завершен', color: 'bg-green-100 text-green-800' },
      'cancelled': { label: 'Отменен', color: 'bg-red-100 text-red-800' },
      'rejected': { label: 'Отклонен', color: 'bg-red-100 text-red-800' },
      'returned': { label: 'Возврат', color: 'bg-orange-100 text-orange-800' },
      'problem': { label: 'Проблема', color: 'bg-red-100 text-red-800' }
    };
    const statusInfo = statusMap[status] || { label: status, color: 'bg-slate-100 text-slate-800' };
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}">${statusInfo.label}</span>`;
  }

  formatMoney(value) {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  pluralize(count, one, two, five) {
    let n = Math.abs(count);
    n %= 100;
    if (n >= 5 && n <= 20) return five;
    n %= 10;
    if (n === 1) return one;
    if (n >= 2 && n <= 4) return two;
    return five;
  }

  destroy() {
    // Cleanup if needed
  }
}

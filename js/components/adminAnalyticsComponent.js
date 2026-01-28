import { supabase } from '../utils/supabase.js';

export class AdminAnalyticsComponent {
  constructor() {
    this.orders = [];
    this.filteredOrders = [];
    this.startDate = null;
    this.endDate = null;
    this.autoRefreshInterval = null;
  }

  async loadOrders() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.orders = data || [];
      this.applyDateFilter();
      return this.orders;
    } catch (error) {
      console.error('Failed to load orders:', error);
      return [];
    }
  }

  applyDateFilter() {
    if (!this.startDate && !this.endDate) {
      this.filteredOrders = this.orders;
      return;
    }

    this.filteredOrders = this.orders.filter(order => {
      const orderDate = new Date(order.created_at);
      if (this.startDate && orderDate < new Date(this.startDate)) return false;
      if (this.endDate && orderDate > new Date(this.endDate + 'T23:59:59')) return false;
      return true;
    });
  }

  calculateKPIs() {
    const totalRevenue = this.filteredOrders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);
    const totalOrders = this.filteredOrders.length;
    const avgCheck = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    const confirmedOrders = this.filteredOrders.filter(o => o.order_status === 'confirmed' || o.confirmed_at).length;
    const pendingOrders = this.filteredOrders.filter(o => o.order_status === 'pending' || !o.confirmed_at).length;
    const cancelledOrders = this.filteredOrders.filter(o => o.order_status === 'cancelled').length;

    return {
      totalRevenue,
      totalOrders,
      avgCheck,
      confirmedOrders,
      pendingOrders,
      cancelledOrders
    };
  }

  getRevenueByDate() {
    const revenueMap = new Map();
    
    this.filteredOrders.forEach(order => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      const revenue = parseFloat(order.total) || 0;
      revenueMap.set(date, (revenueMap.get(date) || 0) + revenue);
    });

    return Array.from(revenueMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, revenue]) => ({ date, revenue }));
  }

  getOrdersByDate() {
    const ordersMap = new Map();
    
    this.filteredOrders.forEach(order => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      ordersMap.set(date, (ordersMap.get(date) || 0) + 1);
    });

    return Array.from(ordersMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));
  }

  getStatusDistribution() {
    const statusMap = new Map();
    
    this.filteredOrders.forEach(order => {
      const status = order.order_status || (order.confirmed_at ? 'confirmed' : 'pending');
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });

    return Array.from(statusMap.entries()).map(([status, count]) => ({
      status: this.translateStatus(status),
      count
    }));
  }

  translateStatus(status) {
    const translations = {
      'pending': 'Ожидает',
      'confirmed': 'Подтвержден',
      'cancelled': 'Отменен',
      'processing': 'В обработке',
      'completed': 'Выполнен'
    };
    return translations[status] || status;
  }

  getTopProducts() {
    const productMap = new Map();
    
    this.filteredOrders.forEach(order => {
      if (order.cart_items && Array.isArray(order.cart_items)) {
        order.cart_items.forEach(item => {
          const key = item.name || item.id;
          const existing = productMap.get(key) || { name: key, quantity: 0, revenue: 0 };
          existing.quantity += item.quantity || 0;
          existing.revenue += (item.price || 0) * (item.quantity || 0);
          productMap.set(key, existing);
        });
      }
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }

  getAvgCheckByDate() {
    const dateMap = new Map();
    
    this.filteredOrders.forEach(order => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      const total = parseFloat(order.total) || 0;
      
      if (!dateMap.has(date)) {
        dateMap.set(date, { sum: 0, count: 0 });
      }
      
      const data = dateMap.get(date);
      data.sum += total;
      data.count += 1;
    });

    return Array.from(dateMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({
        date,
        avgCheck: data.sum / data.count
      }));
  }

  render() {
    const kpis = this.calculateKPIs();
    const revenueData = this.getRevenueByDate();
    const ordersData = this.getOrdersByDate();
    const statusData = this.getStatusDistribution();
    const topProducts = this.getTopProducts();
    const avgCheckData = this.getAvgCheckByDate();

    return `
      <div class="analytics-container p-6 space-y-6">
        <!-- Фильтры и управление -->
        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex flex-wrap gap-4 items-end">
            <div class="flex-1 min-w-[200px]">
              <label class="block text-sm font-medium text-gray-700 mb-1">Дата от</label>
              <input 
                type="date" 
                id="analytics-start-date"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
            </div>
            <div class="flex-1 min-w-[200px]">
              <label class="block text-sm font-medium text-gray-700 mb-1">Дата до</label>
              <input 
                type="date" 
                id="analytics-end-date"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
            </div>
            <button 
              id="analytics-apply-filter"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Применить
            </button>
            <button 
              id="analytics-reset-filter"
              class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              Сбросить
            </button>
            <label class="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                id="analytics-auto-refresh"
                class="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              >
              <span class="text-sm text-gray-700">Автообновление (30с)</span>
            </label>
          </div>
        </div>

        <!-- KPI Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div class="bg-white rounded-lg shadow p-4">
            <div class="text-xs text-gray-600 mb-1">Общая выручка</div>
            <div class="text-2xl font-bold text-blue-600">₽${kpis.totalRevenue.toLocaleString()}</div>
          </div>
          <div class="bg-white rounded-lg shadow p-4">
            <div class="text-xs text-gray-600 mb-1">Всего заказов</div>
            <div class="text-2xl font-bold text-green-600">${kpis.totalOrders}</div>
          </div>
          <div class="bg-white rounded-lg shadow p-4">
            <div class="text-xs text-gray-600 mb-1">Средний чек</div>
            <div class="text-2xl font-bold text-purple-600">₽${kpis.avgCheck.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
          </div>
          <div class="bg-white rounded-lg shadow p-4">
            <div class="text-xs text-gray-600 mb-1">Подтверждено</div>
            <div class="text-2xl font-bold text-green-500">${kpis.confirmedOrders}</div>
          </div>
          <div class="bg-white rounded-lg shadow p-4">
            <div class="text-xs text-gray-600 mb-1">Ожидает</div>
            <div class="text-2xl font-bold text-yellow-500">${kpis.pendingOrders}</div>
          </div>
          <div class="bg-white rounded-lg shadow p-4">
            <div class="text-xs text-gray-600 mb-1">Отменено</div>
            <div class="text-2xl font-bold text-red-500">${kpis.cancelledOrders}</div>
          </div>
        </div>

        <!-- Графики -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- График выручки -->
          <div class="bg-white rounded-lg shadow p-4">
            <h3 class="text-sm font-semibold mb-2">Выручка по дням</h3>
            <div class="h-48">
              <canvas id="revenue-chart"></canvas>
            </div>
          </div>

          <!-- График заказов -->
          <div class="bg-white rounded-lg shadow p-4">
            <h3 class="text-sm font-semibold mb-2">Количество заказов по дням</h3>
            <div class="h-48">
              <canvas id="orders-chart"></canvas>
            </div>
          </div>

          <!-- График статусов -->
          <div class="bg-white rounded-lg shadow p-4">
            <h3 class="text-sm font-semibold mb-2">Распределение статусов</h3>
            <div class="h-48">
              <canvas id="status-chart"></canvas>
            </div>
          </div>

          <!-- График среднего чека -->
          <div class="bg-white rounded-lg shadow p-4">
            <h3 class="text-sm font-semibold mb-2">Средний чек по дням</h3>
            <div class="h-48">
              <canvas id="avg-check-chart"></canvas>
            </div>
          </div>
        </div>

        <!-- Топ товаров -->
        <div class="bg-white rounded-lg shadow p-4">
          <h3 class="text-sm font-semibold mb-2">Топ-10 товаров по продажам</h3>
          <div class="h-64">
            <canvas id="top-products-chart"></canvas>
          </div>
        </div>
      </div>
    `;
  }

  async mount(container) {
    await this.loadOrders();
    container.innerHTML = this.render();
    this.attachEventListeners();
    await this.renderCharts();
  }

  attachEventListeners() {
    const applyBtn = document.getElementById('analytics-apply-filter');
    const resetBtn = document.getElementById('analytics-reset-filter');
    const startDateInput = document.getElementById('analytics-start-date');
    const endDateInput = document.getElementById('analytics-end-date');
    const autoRefreshCheckbox = document.getElementById('analytics-auto-refresh');

    if (applyBtn) {
      applyBtn.addEventListener('click', async () => {
        this.startDate = startDateInput.value;
        this.endDate = endDateInput.value;
        this.applyDateFilter();
        const container = document.querySelector('.analytics-container').parentElement;
        await this.mount(container);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        this.startDate = null;
        this.endDate = null;
        startDateInput.value = '';
        endDateInput.value = '';
        this.applyDateFilter();
        const container = document.querySelector('.analytics-container').parentElement;
        await this.mount(container);
      });
    }

    if (autoRefreshCheckbox) {
      autoRefreshCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.startAutoRefresh();
        } else {
          this.stopAutoRefresh();
        }
      });
    }
  }

  startAutoRefresh() {
    this.stopAutoRefresh();
    this.autoRefreshInterval = setInterval(async () => {
      await this.loadOrders();
      const container = document.querySelector('.analytics-container').parentElement;
      if (container) {
        const startDate = document.getElementById('analytics-start-date')?.value;
        const endDate = document.getElementById('analytics-end-date')?.value;
        const autoRefreshChecked = document.getElementById('analytics-auto-refresh')?.checked;
        
        await this.mount(container);
        
        // Восстанавливаем состояние фильтров
        if (startDate) document.getElementById('analytics-start-date').value = startDate;
        if (endDate) document.getElementById('analytics-end-date').value = endDate;
        if (autoRefreshChecked) document.getElementById('analytics-auto-refresh').checked = true;
      }
    }, 30000);
  }

  stopAutoRefresh() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
  }

  destroy() {
    this.stopAutoRefresh();
  }

  async renderCharts() {
    // Загружаем Chart.js из CDN
    if (!window.Chart) {
      await this.loadChartJS();
    }

    const revenueData = this.getRevenueByDate();
    const ordersData = this.getOrdersByDate();
    const statusData = this.getStatusDistribution();
    const topProducts = this.getTopProducts();
    const avgCheckData = this.getAvgCheckByDate();

    // График выручки
    const revenueCtx = document.getElementById('revenue-chart');
    if (revenueCtx) {
      new Chart(revenueCtx, {
        type: 'line',
        data: {
          labels: revenueData.map(d => d.date),
          datasets: [{
            label: 'Выручка (₽)',
            data: revenueData.map(d => d.revenue),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    }

    // График заказов
    const ordersCtx = document.getElementById('orders-chart');
    if (ordersCtx) {
      new Chart(ordersCtx, {
        type: 'bar',
        data: {
          labels: ordersData.map(d => d.date),
          datasets: [{
            label: 'Количество заказов',
            data: ordersData.map(d => d.count),
            backgroundColor: 'rgba(34, 197, 94, 0.8)',
            borderColor: 'rgb(34, 197, 94)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    }

    // График статусов
    const statusCtx = document.getElementById('status-chart');
    if (statusCtx) {
      new Chart(statusCtx, {
        type: 'pie',
        data: {
          labels: statusData.map(d => d.status),
          datasets: [{
            data: statusData.map(d => d.count),
            backgroundColor: [
              'rgba(34, 197, 94, 0.8)',
              'rgba(234, 179, 8, 0.8)',
              'rgba(239, 68, 68, 0.8)',
              'rgba(59, 130, 246, 0.8)',
              'rgba(168, 85, 247, 0.8)'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
    }

    // График среднего чека
    const avgCheckCtx = document.getElementById('avg-check-chart');
    if (avgCheckCtx) {
      new Chart(avgCheckCtx, {
        type: 'line',
        data: {
          labels: avgCheckData.map(d => d.date),
          datasets: [{
            label: 'Средний чек (₽)',
            data: avgCheckData.map(d => d.avgCheck),
            borderColor: 'rgb(168, 85, 247)',
            backgroundColor: 'rgba(168, 85, 247, 0.1)',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    }

    // График топ товаров
    const topProductsCtx = document.getElementById('top-products-chart');
    if (topProductsCtx) {
      new Chart(topProductsCtx, {
        type: 'bar',
        data: {
          labels: topProducts.map(p => p.name.length > 30 ? p.name.substring(0, 30) + '...' : p.name),
          datasets: [{
            label: 'Количество продаж',
            data: topProducts.map(p => p.quantity),
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { beginAtZero: true }
          }
        }
      });
    }
  }

  async loadChartJS() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
}

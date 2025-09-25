export class ModernAdminComponent {
  constructor() {
    this.supabase = null;
    this.session = null;
    this.page = 0;
    this.PAGE_SIZE = 24;
    this.categories = [];
    this.colors = [];
    this.currentTab = 'products';
    this.isLoading = false;
    this.currentProductId = null;
  }

  async mount(container) {
    // Инициализация Supabase
    await this.initSupabase();
    
    // Рендер основного HTML
    container.innerHTML = this.getHTML();
    
    // Добавление стилей
    this.addStyles();
    
    // Инициализация событий
    this.attachEvents();
    
    // Проверка авторизации
    this.checkAuth();
  }

  async initSupabase() {
    // Динамический импорт Supabase
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    this.supabase = createClient(
      'https://bsndismiessofvhglzrv.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzbmRpc21pZXNzb2Z2aGdsenJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2ODYyNTIsImV4cCI6MjA1NDI2MjI1Mn0.4pumjrK8SV79xaegTEZaJMmi6lnp-_5uhSytvWpoZHY'
    );

    // Слушатель авторизации
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.session = session;
      if (!session) {
        this.showLoginModal();
      } else {
        this.hideLoginModal();
      }
    });
  }

  addStyles() {
    if (!document.getElementById('admin-styles')) {
      const style = document.createElement('style');
      style.id = 'admin-styles';
      style.textContent = `
        @media (max-width: 640px) { 
          dialog { 
            width: 100%; 
            margin: 0; 
            border-radius: 1rem 1rem 0 0; 
          } 
        }
      `;
      document.head.appendChild(style);
    }
  }

  getHTML() {
    return `
      <div class="h-full bg-slate-50 text-slate-900">
        <!-- HEADER -->
        <header class="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
          <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-xl">⚙️</span>
              <h1 class="text-lg font-semibold">Админ-панель</h1>
            </div>
            <div class="flex items-center gap-2">
              <nav class="hidden sm:flex gap-1">
                <button data-tab="products" class="tab px-3 py-1.5 rounded-full bg-slate-900 text-white">Товары</button>
                <button data-tab="categories" class="tab px-3 py-1.5 rounded-full hover:bg-slate-100">Категории</button>
                <button data-tab="colors" class="tab px-3 py-1.5 rounded-full hover:bg-slate-100">Цвета</button>
                <button data-tab="orders" class="tab px-3 py-1.5 rounded-full hover:bg-slate-100">Заказы</button>
              </nav>
              <button id="btnSignOut" class="px-3 py-1.5 rounded-lg bg-rose-600 text-white">Выйти</button>
            </div>
          </div>
          <!-- Mobile tabs -->
          <div class="sm:hidden px-4 pb-3 flex gap-2 overflow-x-auto">
            <button data-tab="products" class="tab px-3 py-1.5 rounded-full bg-slate-900 text-white">Товары</button>
            <button data-tab="categories" class="tab px-3 py-1.5 rounded-full bg-slate-100">Категории</button>
            <button data-tab="colors" class="tab px-3 py-1.5 rounded-full bg-slate-100">Цвета</button>
            <button data-tab="orders" class="tab px-3 py-1.5 rounded-full bg-slate-100">Заказы</button>
          </div>
        </header>

        <!-- CONTENT -->
        <main class="max-w-7xl mx-auto px-4 py-4 space-y-4">

          <!-- ACTION BAR -->
          <section class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div class="flex-1 flex gap-2">
              <input id="search" type="search" placeholder="Поиск: название / артикул"
                     class="w-full px-3 py-2 rounded-xl border outline-none focus:ring focus:ring-slate-200">
              <select id="filterCategory" class="px-3 py-2 rounded-xl border">
                <option value="">Все категории</option>
              </select>
              <select id="filterStatus" class="px-3 py-2 rounded-xl border">
                <option value="">Все</option>
                <option value="active">Активные</option>
                <option value="hidden">Скрытые</option>
              </select>
            </div>
            <div class="flex gap-2">
              <button id="btnAddProduct" class="px-3 py-2 rounded-xl bg-emerald-600 text-white">Добавить товар</button>
            </div>
          </section>

          <!-- LIST: CARDS (mobile) -->
          <section id="cards" class="grid grid-cols-1 sm:hidden gap-3"></section>

          <!-- LIST: TABLE (desktop) -->
          <section class="hidden sm:block overflow-auto rounded-2xl border bg-white">
            <table class="min-w-full text-sm">
              <thead class="bg-slate-50 text-slate-600">
                <tr>
                  <th class="px-3 py-2 text-left">Товар</th>
                  <th class="px-3 py-2 text-left">Артикул</th>
                  <th class="px-3 py-2 text-left">Размер</th>
                  <th class="px-3 py-2 text-left">Цена, ₽</th>
                  <th class="px-3 py-2 text-left">Статус</th>
                  <th class="px-3 py-2 text-right">Действия</th>
                </tr>
              </thead>
              <tbody id="tableBody" class="divide-y"></tbody>
            </table>
          </section>

          <!-- PAGINATION -->
          <div class="flex justify-center">
            <button id="btnLoadMore" class="px-4 py-2 rounded-xl border bg-white hidden">Загрузить ещё</button>
          </div>
        </main>

        <!-- PRODUCT DIALOG -->
        <dialog id="dlgProduct" class="p-0 rounded-2xl backdrop:bg-black/40 max-w-4xl">
          <form id="frmProduct" method="dialog" class="bg-white rounded-2xl overflow-hidden">
            <div class="px-4 py-3 border-b flex items-center justify-between">
              <h2 id="dlgTitle" class="font-semibold">Товар</h2>
              <button type="button" class="px-2 py-1 rounded-lg hover:bg-slate-100" data-close>✕</button>
            </div>

            <div class="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[70vh] overflow-auto">
              <input type="hidden" name="id" />
              
              <label class="block">
                <span class="text-sm font-medium">Название *</span>
                <input name="name" required class="mt-1 w-full px-3 py-2 rounded-xl border">
              </label>

              <label class="block">
                <span class="text-sm font-medium">Артикул *</span>
                <input name="artikul" required class="mt-1 w-full px-3 py-2 rounded-xl border">
              </label>

              <label class="block">
                <span class="text-sm font-medium">ID WB</span>
                <input name="id_wb" class="mt-1 w-full px-3 py-2 rounded-xl border">
              </label>

              <label class="block">
                <span class="text-sm font-medium">Размер</span>
                <select name="size" class="mt-1 w-full px-3 py-2 rounded-xl border">
                  <option value="small">Малая</option>
                  <option value="medium">Средняя</option>
                  <option value="big">Большая</option>
                </select>
              </label>

              <div class="grid grid-cols-3 gap-2 sm:col-span-2">
                <label class="block">
                  <span class="text-sm font-medium">Длина (см)</span>
                  <input name="dim_l" type="number" step="0.1" class="mt-1 w-full px-3 py-2 rounded-xl border">
                </label>
                <label class="block">
                  <span class="text-sm font-medium">Ширина (см)</span>
                  <input name="dim_w" type="number" step="0.1" class="mt-1 w-full px-3 py-2 rounded-xl border">
                </label>
                <label class="block">
                  <span class="text-sm font-medium">Высота (см)</span>
                  <input name="dim_h" type="number" step="0.1" class="mt-1 w-full px-3 py-2 rounded-xl border">
                </label>
              </div>

              <label class="block">
                <span class="text-sm font-medium">Вес (г)</span>
                <input name="weight" type="number" step="0.1" class="mt-1 w-full px-3 py-2 rounded-xl border">
              </label>
              
              <label class="block">
                <span class="text-sm font-medium">Цена (₽) *</span>
                <input name="price_rub" type="number" step="0.01" required class="mt-1 w-full px-3 py-2 rounded-xl border">
              </label>

              <label class="block">
                <span class="text-sm font-medium">Цвет (HEX)</span>
                <input name="color_hex" type="color" class="mt-1 w-full h-10 rounded-xl border">
              </label>

              <label class="block">
                <span class="text-sm font-medium">Статус</span>
                <select name="is_active" class="mt-1 w-full px-3 py-2 rounded-xl border">
                  <option value="true">Активный</option>
                  <option value="false">Скрытый</option>
                </select>
              </label>

              <!-- IMAGES -->
              <div class="sm:col-span-2">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium">Фото (URL)</span>
                  <button type="button" id="btnAddImage" class="text-sm px-2 py-1 rounded-lg border hover:bg-slate-50">+ фото</button>
                </div>
                <div id="imagesBox" class="space-y-2"></div>
              </div>

              <!-- VIDEOS -->
              <div class="sm:col-span-2">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium">Видео (URL)</span>
                  <button type="button" id="btnAddVideo" class="text-sm px-2 py-1 rounded-lg border hover:bg-slate-50">+ видео</button>
                </div>
                <div id="videosBox" class="space-y-2"></div>
              </div>
            </div>

            <div class="px-4 py-3 border-t flex justify-between">
              <button type="button" id="btnDelete" class="px-3 py-2 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50">Удалить</button>
              <div class="flex gap-2">
                <button type="button" data-close class="px-3 py-2 rounded-lg border hover:bg-slate-50">Отмена</button>
                <button type="submit" class="px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800">Сохранить</button>
              </div>
            </div>
          </form>
        </dialog>

        <!-- LOGIN DIALOG -->
        <dialog id="dlgLogin" class="p-0 rounded-2xl backdrop:bg-black/40">
          <form id="frmLogin" method="dialog" class="bg-white rounded-2xl overflow-hidden">
            <div class="px-4 py-3 border-b">
              <h2 class="font-semibold">Вход администратора</h2>
            </div>
            <div class="p-4 space-y-3">
              <label class="block">
                <span class="text-sm font-medium">Логин</span>
                <input name="login" type="text" required class="mt-1 w-full px-3 py-2 rounded-xl border">
              </label>
              <label class="block">
                <span class="text-sm font-medium">Пароль</span>
                <input name="password" type="password" required class="mt-1 w-full px-3 py-2 rounded-xl border">
              </label>
              <p id="loginError" class="text-sm text-rose-600 hidden"></p>
            </div>
            <div class="px-4 py-3 border-t flex justify-end gap-2">
              <button type="submit" class="px-3 py-2 rounded-lg bg-slate-900 text-white">Войти</button>
            </div>
          </form>
        </dialog>
      </div>
    `;
  }

  attachEvents() {
    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => this.onTabChange(e));
    });

    // Search and filters
    document.getElementById('search').addEventListener('input', this.debounce(() => this.loadPage(true), 300));
    document.getElementById('filterCategory').addEventListener('change', () => this.loadPage(true));
    document.getElementById('filterStatus').addEventListener('change', () => this.loadPage(true));

    // Buttons
    document.getElementById('btnAddProduct').addEventListener('click', () => this.openProduct());
    document.getElementById('btnLoadMore').addEventListener('click', () => this.loadPage(false));
    document.getElementById('btnSignOut').addEventListener('click', () => this.signOut());

    // Modal events
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => document.getElementById('dlgProduct').close());
    });
    
    document.getElementById('frmProduct').addEventListener('submit', (e) => this.onSaveProduct(e));
    document.getElementById('btnDelete').addEventListener('click', () => this.onDeleteProduct());
    document.getElementById('frmLogin').addEventListener('submit', (e) => this.onLogin(e));

    // Dynamic form elements
    document.getElementById('btnAddImage').addEventListener('click', () => this.addImageInput());
    document.getElementById('btnAddVideo').addEventListener('click', () => this.addVideoInput());
  }

  async checkAuth() {
    // Проверяем авторизацию из localStorage
    this.isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    this.adminLogin = localStorage.getItem('adminLogin');
    
    if (!this.isAuthenticated) {
      this.showLoginModal();
    } else {
      this.hideLoginModal();
      await this.loadMeta();
      await this.loadPage(true);
    }
  }

  showLoginModal() {
    document.getElementById('dlgLogin').showModal();
  }

  hideLoginModal() {
    document.getElementById('dlgLogin').close();
  }

  async onLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const login = formData.get('login');
    const password = formData.get('password');

    // Проверяем логин и пароль через функцию базы данных
    const { data, error } = await this.supabase.rpc('is_admin_user', {
      login_input: login,
      password_input: password
    });
    
    const errorEl = document.getElementById('loginError');
    if (error || !data) {
      errorEl.textContent = error?.message || 'Ошибка входа. Проверьте логин и пароль.';
      errorEl.classList.remove('hidden');
    } else if (data === true) {
      // Сохраняем статус входа в localStorage
      localStorage.setItem('adminLogin', login);
      localStorage.setItem('isAuthenticated', 'true');
      this.isAuthenticated = true;
      this.adminLogin = login;
      
      errorEl.classList.add('hidden');
      this.hideLoginModal();
      await this.loadMeta();
      await this.loadPage(true);
    } else {
      errorEl.textContent = 'Неверный логин или пароль';
      errorEl.classList.remove('hidden');
    }
  }

  async signOut() {
    // Очищаем localStorage
    localStorage.removeItem('adminLogin');
    localStorage.removeItem('isAuthenticated');
    this.isAuthenticated = false;
    this.adminLogin = null;
    this.showLoginModal();
  }

  async loadMeta() {
    // Load categories
    const { data: categories } = await this.supabase.from('categories').select('id,name').order('name');
    this.categories = categories || [];
    
    // Load colors
    const { data: colors } = await this.supabase.from('colors').select('id,name,hex_code').order('name');
    this.colors = colors || [];

    // Populate filter dropdown
    const filterCategory = document.getElementById('filterCategory');
    filterCategory.innerHTML = '<option value="">Все категории</option>' + 
      this.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }

  async loadPage(reset) {
    if (reset) {
      this.page = 0;
      document.getElementById('cards').innerHTML = '';
      document.getElementById('tableBody').innerHTML = '';
    }

    this.isLoading = true;

    let query = this.supabase
      .from('products')
      .select('id, name, artikul, size, price_rub, weight, dimensions, color_hex, is_active, photos, videos, id_wb')
      .order('name')
      .range(this.page * this.PAGE_SIZE, this.page * this.PAGE_SIZE + this.PAGE_SIZE - 1);

    // Apply search filter
    const searchTerm = document.getElementById('search').value.trim();
    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,artikul.ilike.%${searchTerm}%`);
    }

    // Apply status filter
    const statusFilter = document.getElementById('filterStatus').value;
    if (statusFilter === 'active') {
      query = query.eq('is_active', true);
    } else if (statusFilter === 'hidden') {
      query = query.eq('is_active', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Ошибка загрузки продуктов:', error);
      return;
    }

    this.renderCards(data || []);
    this.renderTable(data || []);
    this.page++;

    const btnLoadMore = document.getElementById('btnLoadMore');
    btnLoadMore.classList.toggle('hidden', (data || []).length < this.PAGE_SIZE);

    this.isLoading = false;
  }

  renderCards(items) {
    const cardsContainer = document.getElementById('cards');
    
    const html = items.map(product => {
      const image = product.photos && product.photos.length > 0 ? product.photos[0] : '/placeholder.svg';
      const sizeMap = { small: 'Малая', medium: 'Средняя', big: 'Большая' };
      const sizeName = sizeMap[product.size] || product.size;
      
      return `
        <article class="bg-white rounded-2xl border p-3 flex gap-3">
          <img src="${image}" class="w-20 h-20 rounded-xl object-cover border" alt="${product.name}">
          <div class="flex-1 min-w-0">
            <div class="flex justify-between gap-2">
              <h3 class="font-medium truncate">${product.name}</h3>
              <button class="px-2 py-1 rounded-lg border text-sm hover:bg-slate-50" data-edit="${product.id}">Изм.</button>
            </div>
            <div class="text-sm text-slate-500 truncate">${product.artikul || '—'}</div>
            <div class="text-sm mt-1">${product.price_rub ? `${product.price_rub} ₽` : '—'}</div>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-xs text-slate-600">${sizeName}</span>
              <span class="w-3 h-3 rounded-full border" style="background-color: ${product.color_hex || '#ddd'}"></span>
              <span class="text-xs ${product.is_active ? 'text-green-600' : 'text-red-600'}">${product.is_active ? 'Активен' : 'Скрыт'}</span>
            </div>
          </div>
        </article>
      `;
    }).join('');
    
    cardsContainer.insertAdjacentHTML('beforeend', html);
    
    // Attach edit events
    cardsContainer.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => this.openProduct(btn.dataset.edit));
    });
  }

  renderTable(items) {
    const tableBody = document.getElementById('tableBody');
    
    const sizeMap = { small: 'Малая', medium: 'Средняя', big: 'Большая' };
    
    const rows = items.map(product => {
      const sizeName = sizeMap[product.size] || product.size;
      
      return `
        <tr class="bg-white hover:bg-slate-50">
          <td class="px-3 py-2">
            <div class="flex items-center gap-2">
              <img src="${product.photos && product.photos.length > 0 ? product.photos[0] : '/placeholder.svg'}" 
                   class="w-8 h-8 rounded object-cover" alt="${product.name}">
              <div>
                <div class="font-medium">${product.name}</div>
                <div class="text-xs text-slate-500">${product.id}</div>
              </div>
            </div>
          </td>
          <td class="px-3 py-2">${product.artikul || '—'}</td>
          <td class="px-3 py-2">
            <div class="flex items-center gap-1">
              <span>${sizeName}</span>
              <span class="w-3 h-3 rounded-full border" style="background-color: ${product.color_hex || '#ddd'}"></span>
            </div>
          </td>
          <td class="px-3 py-2">${product.price_rub ? `${product.price_rub} ₽` : '—'}</td>
          <td class="px-3 py-2">
            <span class="inline-flex px-2 py-1 text-xs rounded-full ${
              product.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }">${product.is_active ? 'Активен' : 'Скрыт'}</span>
          </td>
          <td class="px-3 py-2 text-right">
            <button class="px-3 py-1.5 rounded-lg border text-sm hover:bg-slate-50" data-edit="${product.id}">Изменить</button>
          </td>
        </tr>
      `;
    }).join('');
    
    tableBody.insertAdjacentHTML('beforeend', rows);
    
    // Attach edit events
    tableBody.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => this.openProduct(btn.dataset.edit));
    });
  }

  async openProduct(productId = null) {
    this.currentProductId = productId;
    const form = document.getElementById('frmProduct');
    const title = document.getElementById('dlgTitle');
    
    form.reset();
    document.getElementById('imagesBox').innerHTML = '';
    document.getElementById('videosBox').innerHTML = '';
    
    if (productId) {
      title.textContent = 'Изменить товар';
      
      const { data: product, error } = await this.supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();
      
      if (error) {
        console.error('Ошибка загрузки продукта:', error);
        return;
      }
      
      // Fill form fields
      form.id.value = product.id;
      form.name.value = product.name || '';
      form.artikul.value = product.artikul || '';
      form.id_wb.value = product.id_wb || '';
      form.size.value = product.size || 'small';
      form.price_rub.value = product.price_rub || '';
      form.color_hex.value = product.color_hex || '#000000';
      form.is_active.value = product.is_active ? 'true' : 'false';
      
      if (product.dimensions) {
        form.dim_l.value = product.dimensions.length || '';
        form.dim_w.value = product.dimensions.width || '';
        form.dim_h.value = product.dimensions.height || '';
      }
      
      form.weight.value = product.weight || '';
      
      // Load photos
      if (product.photos && product.photos.length > 0) {
        product.photos.forEach(photo => this.addImageInput(photo));
      } else {
        this.addImageInput();
      }
      
      // Load videos
      if (product.videos && product.videos.length > 0) {
        product.videos.forEach(video => this.addVideoInput(video));
      } else {
        this.addVideoInput();
      }
    } else {
      title.textContent = 'Добавить товар';
      form.color_hex.value = '#000000';
      form.is_active.value = 'true';
      form.size.value = 'small';
      this.addImageInput();
      this.addVideoInput();
    }
    
    document.getElementById('dlgProduct').showModal();
  }

  addImageInput(value = '') {
    const container = document.getElementById('imagesBox');
    const inputGroup = document.createElement('div');
    inputGroup.className = 'flex gap-2';
    inputGroup.innerHTML = `
      <input type="url" name="images" value="${value}" placeholder="https://example.com/image.jpg" 
             class="flex-1 px-3 py-2 rounded-xl border text-sm">
      <button type="button" class="px-2 py-1 rounded-lg border text-rose-600 hover:bg-rose-50 text-sm" 
              onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(inputGroup);
  }

  addVideoInput(value = '') {
    const container = document.getElementById('videosBox');
    const inputGroup = document.createElement('div');
    inputGroup.className = 'flex gap-2';
    inputGroup.innerHTML = `
      <input type="url" name="videos" value="${value}" placeholder="https://example.com/video.mp4" 
             class="flex-1 px-3 py-2 rounded-xl border text-sm">
      <button type="button" class="px-2 py-1 rounded-lg border text-rose-600 hover:bg-rose-50 text-sm" 
              onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(inputGroup);
  }

  async onSaveProduct(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const productId = formData.get('id');
    
    // Collect images and videos
    const images = Array.from(document.querySelectorAll('input[name="images"]'))
      .map(input => input.value.trim())
      .filter(url => url);
      
    const videos = Array.from(document.querySelectorAll('input[name="videos"]'))
      .map(input => input.value.trim())
      .filter(url => url);
    
    const productData = {
      name: formData.get('name').trim(),
      artikul: formData.get('artikul').trim(),
      id_wb: formData.get('id_wb')?.trim() || null,
      size: formData.get('size'),
      price_rub: parseFloat(formData.get('price_rub')) || 0,
      weight: parseFloat(formData.get('weight')) || null,
      color_hex: formData.get('color_hex'),
      is_active: formData.get('is_active') === 'true',
      photos: images,
      videos: videos,
      dimensions: {
        length: parseFloat(formData.get('dim_l')) || null,
        width: parseFloat(formData.get('dim_w')) || null,
        height: parseFloat(formData.get('dim_h')) || null
      }
    };

    let result;
    if (productId) {
      result = await this.supabase.from('products').update(productData).eq('id', productId);
    } else {
      result = await this.supabase.from('products').insert([productData]);
    }

    if (result.error) {
      alert('Ошибка сохранения: ' + result.error.message);
      return;
    }

    document.getElementById('dlgProduct').close();
    await this.loadPage(true);
  }

  async onDeleteProduct() {
    if (!this.currentProductId) return;
    
    if (!confirm('Вы уверены, что хотите удалить этот товар?')) return;
    
    const { error } = await this.supabase.from('products').delete().eq('id', this.currentProductId);
    
    if (error) {
      alert('Ошибка удаления: ' + error.message);
      return;
    }
    
    document.getElementById('dlgProduct').close();
    await this.loadPage(true);
  }

  onTabChange(e) {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => tab.classList.remove('bg-slate-900', 'text-white'));
    tabs.forEach(tab => tab.classList.add('hover:bg-slate-100'));
    
    e.currentTarget.classList.add('bg-slate-900', 'text-white');
    e.currentTarget.classList.remove('hover:bg-slate-100');
    
    this.currentTab = e.currentTarget.dataset.tab;
    
    // TODO: Implement different tab content
    console.log('Переключено на вкладку:', this.currentTab);
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}
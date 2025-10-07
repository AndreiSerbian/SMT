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
        this.sortField = null;
        this.sortDirection = 'asc';
        this.ordersPage = 0;
        this.ORDERS_PAGE_SIZE = 20;
  }

  async mount(container) {
    // Инициализация Supabase
    await this.initSupabase();
    
    // Загрузка и подключение медиа-методов
    await this.loadMediaMethods();
    
    // Рендер основного HTML
    container.innerHTML = this.getHTML();
    
    // Добавление стилей
    this.addStyles();
    
    // Инициализация событий
    this.attachEvents();
    
    // Загружаем данные товаров
    await this.loadPage(true);
    
    // Сохраняем глобальную ссылку для onclick handlers
    window.adminComponent = this;
  }

  async loadMediaMethods() {
    try {
      const module = await import('./modernAdminComponent_media.js');
      const MediaMethods = module.default || module.MediaMethods || module;
      
      // Копируем все методы из MediaMethods в текущий экземпляр
      Object.assign(this, MediaMethods);
      
      // Инициализируем массивы для медиа
      this.currentProductImages = [];
      this.currentProductVideos = [];
      this.uploadingImage = false;
    } catch (error) {
      console.error('Error loading media methods:', error);
    }
  }

  async initSupabase() {
    // Динамический импорт Supabase
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    this.supabase = createClient(
      'https://bsndismiessofvhglzrv.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzbmRpc21pZXNzb2Z2aGdsenJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2ODYyNTIsImV4cCI6MjA1NDI2MjI1Mn0.4pumjrK8SV79xaegTEZaJMmi6lnp-_5uhSytvWpoZHY'
    );
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
      <div class="space-y-4">

            <!-- ACTION BAR -->
            <section class="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div class="flex-1 flex gap-2">
                <input id="search" type="search" placeholder="Поиск: название / артикул"
                       class="w-full px-3 py-2 rounded-xl border outline-none focus:ring focus:ring-slate-200">
                <select id="filterCategory" class="px-3 py-2 rounded-xl border bg-white">
                  <option value="">Все категории</option>
                  <option value="small">Малая коробка</option>
                  <option value="medium">Средняя коробка</option>
                  <option value="big">Большая коробка</option>
                  <option value="with_handle">Коробка с ручками</option>
                </select>
                <select id="filterStatus" class="px-3 py-2 rounded-xl border bg-white">
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
                    <th class="px-3 py-2 text-left cursor-pointer hover:bg-slate-100" onclick="adminComponent.toggleSort('artikul')">
                      <div class="flex items-center gap-1">
                        Артикул
                        <div class="flex flex-col text-xs">
                          <span class="text-slate-400" id="sort-artikul-up">▲</span>
                          <span class="text-slate-400" id="sort-artikul-down">▼</span>
                        </div>
                      </div>
                    </th>
                    <th class="px-3 py-2 text-left">Размер</th>
                    <th class="px-3 py-2 text-left">Цвет</th>
                    <th class="px-3 py-2 text-left cursor-pointer hover:bg-slate-100" onclick="adminComponent.toggleSort('price_rub')">
                      <div class="flex items-center gap-1">
                        Цена, ₽
                        <div class="flex flex-col text-xs">
                          <span class="text-slate-400" id="sort-price_rub-up">▲</span>
                          <span class="text-slate-400" id="sort-price_rub-down">▼</span>
                        </div>
                      </div>
                    </th>
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
                <span class="text-sm font-medium">Цвет (HEX) *</span>
                <div class="flex gap-2 mt-1">
                  <input name="color_hex" type="color" class="w-12 h-10 rounded-xl border cursor-pointer">
                  <input name="color_hex_text" type="text" placeholder="#000000" 
                         class="flex-1 px-3 py-2 rounded-xl border font-mono text-sm" 
                         pattern="^#[0-9A-Fa-f]{6}$">
                </div>
              </label>

              <label class="block">
                <span class="text-sm font-medium">Статус</span>
                <select name="is_active" class="mt-1 w-full px-3 py-2 rounded-xl border">
                  <option value="true">Активный</option>
                  <option value="false">Скрытый</option>
                </select>
              </label>

              <!-- MEDIA SECTION -->
              <div class="sm:col-span-2">
                <div class="mb-4">
                  <h3 class="text-base font-semibold mb-3">Медиа товара (Фото и Видео)</h3>
                  <div class="flex gap-2 mb-4">
                    <button type="button" id="btnAddMediaUrl" class="px-4 py-2 text-sm rounded-lg border hover:bg-slate-100">+ URL</button>
                    <button type="button" id="btnUploadMedia" class="px-4 py-2 text-sm rounded-lg border hover:bg-slate-100">+ Загрузить</button>
                    <button type="button" id="btnPreviewMedia" class="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">Предпросмотр</button>
                    <input type="file" id="mediaFileInput" multiple accept="image/*,video/*" class="hidden">
                  </div>
                  
                  <!-- Photos Grid -->
                  <div class="mb-4">
                    <h4 class="text-sm font-medium mb-2">Фотографии</h4>
                    <div id="photosGrid" class="grid grid-cols-2 sm:grid-cols-4 gap-3"></div>
                  </div>
                  
                  <!-- Videos Grid -->
                  <div>
                    <h4 class="text-sm font-medium mb-2">Видео</h4>
                    <div id="videosGrid" class="grid grid-cols-2 sm:grid-cols-4 gap-3"></div>
                  </div>
                </div>
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

        <!-- COLOR DIALOG -->
        <dialog id="dlgColor" class="p-0 rounded-2xl backdrop:bg-black/40 max-w-md">
          <form id="frmColor" method="dialog" class="bg-white rounded-2xl overflow-hidden">
            <div class="px-4 py-3 border-b flex items-center justify-between">
              <h2 id="dlgColorTitle" class="font-semibold">Цвет</h2>
              <button type="button" class="px-2 py-1 rounded-lg hover:bg-slate-100" data-close-color>✕</button>
            </div>

            <div class="p-4 space-y-3">
              <input type="hidden" name="id" />
              
              <label class="block">
                <span class="text-sm font-medium">Название (EN) *</span>
                <input name="name" required class="mt-1 w-full px-3 py-2 rounded-xl border">
              </label>

              <label class="block">
                <span class="text-sm font-medium">Название (RU) *</span>
                <input name="russian_name" required class="mt-1 w-full px-3 py-2 rounded-xl border">
              </label>

              <label class="block">
                <span class="text-sm font-medium">HEX код *</span>
                <div class="flex gap-2 mt-1">
                  <input name="hex_code" type="color" class="w-12 h-10 rounded-xl border cursor-pointer">
                  <input name="hex_code_text" type="text" placeholder="#000000" required
                         class="flex-1 px-3 py-2 rounded-xl border font-mono text-sm" 
                         pattern="^#[0-9A-Fa-f]{6}$">
                </div>
              </label>

              <label class="block">
                <span class="text-sm font-medium">Порядок сортировки</span>
                <input name="sort_order" type="number" class="mt-1 w-full px-3 py-2 rounded-xl border">
              </label>

              <label class="flex items-center gap-2">
                <input name="is_active" type="checkbox" class="rounded">
                <span class="text-sm font-medium">Активный</span>
              </label>
            </div>

            <div class="px-4 py-3 border-t flex justify-between">
              <button type="button" id="btnDeleteColor" class="px-3 py-2 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50">Удалить</button>
              <div class="flex gap-2">
                <button type="button" data-close-color class="px-3 py-2 rounded-lg border hover:bg-slate-50">Отмена</button>
                <button type="submit" class="px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800">Сохранить</button>
              </div>
            </div>
          </form>
        </dialog>
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
    // Search and filters
    document.getElementById('search').addEventListener('input', this.debounce(() => this.loadPage(true), 300));
    document.getElementById('filterCategory').addEventListener('change', () => this.loadPage(true));
    document.getElementById('filterStatus').addEventListener('change', () => this.loadPage(true));

    // Buttons
    document.getElementById('btnAddProduct').addEventListener('click', () => this.openProduct());
    document.getElementById('btnLoadMore').addEventListener('click', () => this.loadPage(false));

    // Modal events
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => document.getElementById('dlgProduct').close());
    });
    
    document.getElementById('frmProduct').addEventListener('submit', (e) => this.onSaveProduct(e));
    document.getElementById('btnDelete').addEventListener('click', () => this.onDeleteProduct());

    // Media management buttons
    document.getElementById('btnAddMediaUrl')?.addEventListener('click', () => {
      if (this.addMediaUrl) this.addMediaUrl();
    });
    document.getElementById('btnUploadMedia')?.addEventListener('click', () => {
      if (this.uploadMediaFiles) this.uploadMediaFiles();
    });
    document.getElementById('btnPreviewMedia')?.addEventListener('click', () => {
      if (this.openMediaPreview) this.openMediaPreview();
    });
    document.getElementById('mediaFileInput')?.addEventListener('change', (e) => {
      if (this.handleImageUpload) this.handleImageUpload(e);
    });

    // Color picker synchronization
    const colorInput = document.querySelector('input[name="color_hex"]');
    const colorTextInput = document.querySelector('input[name="color_hex_text"]');
    if (colorInput && colorTextInput) {
      colorInput.addEventListener('input', (e) => {
        colorTextInput.value = e.target.value.toUpperCase();
      });
      colorTextInput.addEventListener('input', (e) => {
        const value = e.target.value;
        if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
          colorInput.value = value;
        }
      });
    }
  }

  async loadMeta() {
    // Load categories
    const { data: categories } = await this.supabase.from('categories').select('id,name,slug').order('sort_order', { ascending: true });
    this.categories = categories || [];
    
    // Load colors with russian names
    const { data: colors } = await this.supabase.from('colors').select('id,name,hex_code,russian_name,is_active,sort_order').order('sort_order', { ascending: true });
    this.colors = colors || [];

    // No need to populate filter dropdown as it's now hardcoded
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
      .select('id, name, artikul, size, price_rub, weight, dimensions, color_hex, is_active, photos, videos, id_wb');

    // Apply sorting
    if (this.sortField) {
      query = query.order(this.sortField, { ascending: this.sortDirection === 'asc' });
    } else {
      query = query.order('name');
    }
    
    query = query.range(this.page * this.PAGE_SIZE, this.page * this.PAGE_SIZE + this.PAGE_SIZE - 1);

    // Apply search filter
    const searchTerm = document.getElementById('search').value.trim();
    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,artikul.ilike.%${searchTerm}%`);
    }

    // Apply category filter by size
    const categoryFilter = document.getElementById('filterCategory').value;
    if (categoryFilter) {
      if (categoryFilter === 'with_handle') {
        query = query.ilike('name', '%ручк%');
      } else {
        query = query.eq('size', categoryFilter);
      }
    }
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
    this.updateSortIndicators();
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
          <td class="px-3 py-2">
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded" style="background-color: ${product.color_hex}"></div>
              <span class="text-sm">${product.color_hex}</span>
            </div>
          </td>
          <td class="px-3 py-2">${product.price_rub ? `${product.price_rub} ₽` : '—'}</td>
          <td class="px-3 py-2">
            <span class="inline-flex px-2 py-1 text-xs rounded-full ${
              product.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }">${product.is_active ? 'Активен' : 'Скрыт'}</span>
          </td>
          <td class="px-3 py-2 text-right">
            <div class="flex gap-1">
              ${product.id_wb ? `<a href="https://www.wildberries.ru/catalog/${product.id_wb}/detail.aspx" target="_blank" class="px-2 py-1 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-700" title="Посмотреть на WB">WB</a>` : ''}
              <button class="px-3 py-1.5 rounded-lg border text-sm hover:bg-slate-50" data-edit="${product.id}">Изменить</button>
            </div>
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
      if (form.color_hex_text) {
        form.color_hex_text.value = product.color_hex || '#000000';
      }
      form.is_active.value = product.is_active ? 'true' : 'false';
      
      if (product.dimensions) {
        form.dim_l.value = product.dimensions.length || '';
        form.dim_w.value = product.dimensions.width || '';
        form.dim_h.value = product.dimensions.height || '';
      }
      
      form.weight.value = product.weight || '';
      
      // Set current editing product for media methods
      this.currentEditingProduct = product;
      
      // Load media using new methods
      await this.loadProductMedia(product.id);
      this.updatePhotosGrid();
      this.updateVideosGrid();
    } else {
      title.textContent = 'Добавить товар';
      form.color_hex.value = '#000000';
      form.is_active.value = 'true';
      form.size.value = 'small';
      
      // Set empty editing product for new products
      this.currentEditingProduct = null;
      
      // Initialize empty media arrays
      this.currentProductImages = [];
      this.currentProductVideos = [];
      this.updatePhotosGrid();
      this.updateVideosGrid();
    }
    
    document.getElementById('dlgProduct').showModal();
    
    // Setup drag and drop after modal is shown
    setTimeout(() => {
      if (this.setupDragAndDrop) this.setupDragAndDrop();
    }, 100);
  }

  // Initialize image/video arrays if not already done
  initializeMediaArrays() {
    if (!this.currentProductImages) this.currentProductImages = [];
    if (!this.currentProductVideos) this.currentProductVideos = [];
  }

  addImageInput(value = '') {
    // Replaced with drag & drop functionality - see renderImageUploadSection
  }

  addVideoInput(value = '') {
    // Replaced with drag & drop functionality - see renderVideoUploadSection
  }

  async onSaveProduct(e) {
    e.preventDefault();
    
    // Устанавливаем контекст администратора перед операцией
    if (this.adminLogin && this.adminPassword) {
      try {
        await this.supabase.rpc('set_admin_context', {
          admin_login: this.adminLogin,
          admin_password: this.adminPassword
        });
      } catch (error) {
        alert('Ошибка установки контекста: ' + error.message);
        return;
      }
    }
    
    const formData = new FormData(e.target);
    const productId = formData.get('id');
    
    const productData = {
      name: formData.get('name').trim(),
      artikul: formData.get('artikul').trim(),
      id_wb: formData.get('id_wb')?.trim() || null,
      size: formData.get('size'),
      price_rub: parseFloat(formData.get('price_rub')) || 0,
      weight: parseFloat(formData.get('weight')) || null,
      color_hex: formData.get('color_hex_text') || formData.get('color_hex'),
      is_active: formData.get('is_active') === 'true',
      photos: this.currentProductImages || [],
      videos: this.currentProductVideos || [],
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
      // Для нового товара используем артикул как ID
      productData.id = productData.artikul;
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
    
    // Устанавливаем контекст администратора перед операцией
    if (this.adminLogin && this.adminPassword) {
      try {
        await this.supabase.rpc('set_admin_context', {
          admin_login: this.adminLogin,
          admin_password: this.adminPassword
        });
      } catch (error) {
        alert('Ошибка установки контекста: ' + error.message);
        return;
      }
    }
    
    const { error } = await this.supabase.from('products').delete().eq('id', this.currentProductId);
    
    if (error) {
      alert('Ошибка удаления: ' + error.message);
      return;
    }
    
    document.getElementById('dlgProduct').close();
    await this.loadPage(true);
  }

  toggleSort(field) {
    if (this.sortField === field) {
      // Toggle direction if same field
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // New field, start with ascending
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    
    this.updateSortIndicators();
    this.loadPage(true);
  }

  updateSortIndicators() {
    // Reset all arrows
    document.querySelectorAll('[id^="sort-"]').forEach(arrow => {
      arrow.classList.remove('text-slate-700');
      arrow.classList.add('text-slate-400');
    });

    // Highlight active arrow
    if (this.sortField) {
      const arrowId = `sort-${this.sortField}-${this.sortDirection === 'asc' ? 'up' : 'down'}`;
      const arrow = document.getElementById(arrowId);
      if (arrow) {
        arrow.classList.remove('text-slate-400');
        arrow.classList.add('text-slate-700');
      }
    }
  }

  onTabChange(e) {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => tab.classList.remove('bg-slate-900', 'text-white'));
    tabs.forEach(tab => tab.classList.add('hover:bg-slate-100'));
    
    e.currentTarget.classList.add('bg-slate-900', 'text-white');
    e.currentTarget.classList.remove('hover:bg-slate-100');
    
    this.currentTab = e.currentTarget.dataset.tab;
    
    // Hide all tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.add('hidden');
    });
    
    // Show selected tab content
    const tabContent = document.getElementById(this.currentTab + 'Tab');
    if (tabContent) {
      tabContent.classList.remove('hidden');
      
      // Load content based on tab
      if (this.currentTab === 'products') {
        this.loadPage(true);
      } else if (this.currentTab === 'colors') {
        this.loadColors();
      } else if (this.currentTab === 'categories') {
        this.loadCategories();
      } else if (this.currentTab === 'orders') {
        this.loadOrders();
      }
    }
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

export class ImageManager {
  constructor(productId, container, options = {}) {
    this.productId = productId;
    this.container = container;
    this.options = {
      maxFiles: 10,
      acceptedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
      ...options
    };
    this.images = [];
    this.supabase = null;
    this.isLoading = false;
    this.init();
  }

  async init() {
    // Получаем Supabase client из глобального объекта
    this.supabase = window.adminComponent?.supabase;
    if (!this.supabase) {
      console.error('Supabase client not available');
      return;
    }
    
    if (this.productId) {
      await this.loadImages();
    }
    this.render();
    this.attachEvents();
  }

  async loadImages() {
    try {
      this.setLoading(true);
      const { data, error } = await this.supabase.functions.invoke('media-manager', {
        body: {
          action: 'list_images',
          product_id: this.productId
        }
      });

      if (error) throw error;
      this.images = data.images || [];
      this.render();
    } catch (error) {
      console.error('Error loading images:', error);
      this.showNotification('Ошибка загрузки изображений', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="image-manager">
        <div class="image-manager-header flex items-center justify-between mb-3">
          <span class="text-sm font-medium">Изображения товара</span>
          <div class="flex gap-2">
            <button type="button" id="addUrlImage" class="text-sm px-2 py-1 rounded-lg border hover:bg-slate-50">+ URL</button>
            <label for="fileInput" class="text-sm px-2 py-1 rounded-lg border hover:bg-slate-50 cursor-pointer">+ Загрузить</label>
            <input type="file" id="fileInput" multiple accept="${this.options.acceptedTypes.join(',')}" class="hidden">
          </div>
        </div>

        ${this.isLoading ? this.renderLoading() : ''}
        
        <div class="images-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
          ${this.images.map(image => this.renderImageCard(image)).join('')}
        </div>

        <div id="urlInputSection" class="hidden mb-3">
          <div class="flex gap-2">
            <input type="url" id="urlInput" placeholder="https://example.com/image.jpg" class="flex-1 px-3 py-2 rounded-lg border text-sm">
            <button type="button" id="addUrlBtn" class="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">Добавить</button>
            <button type="button" id="cancelUrlBtn" class="px-3 py-2 rounded-lg border text-sm">Отмена</button>
          </div>
        </div>

        <div class="text-xs text-slate-500">
          Поддерживаемые форматы: JPG, PNG, WebP, GIF. Макс. размер: 10MB
        </div>
      </div>
    `;
  }

  renderLoading() {
    return `
      <div class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900"></div>
      </div>
    `;
  }

  renderImageCard(image) {
    return `
      <div class="image-card relative group bg-white border rounded-lg overflow-hidden" data-image-id="${image.id}">
        <div class="aspect-square relative">
          <img src="${image.image_url}" alt="Product image" class="w-full h-full object-cover">
          ${image.is_primary ? '<div class="absolute top-1 left-1 bg-green-500 text-white text-xs px-1 rounded">Главное</div>' : ''}
        </div>
        
        <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div class="flex gap-1">
            ${!image.is_primary ? `<button class="set-primary-btn p-1 bg-white rounded hover:bg-slate-100" title="Сделать главным">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
              </svg>
            </button>` : ''}
            
            <button class="delete-btn p-1 bg-white rounded hover:bg-red-100 text-red-600" title="Удалить">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  attachEvents() {
    // Загрузка файлов
    const fileInput = this.container.querySelector('#fileInput');
    fileInput?.addEventListener('change', (e) => this.handleFileUpload(e));

    // URL добавление
    const addUrlBtn = this.container.querySelector('#addUrlImage');
    addUrlBtn?.addEventListener('click', () => this.showUrlInput());

    const addUrlBtnConfirm = this.container.querySelector('#addUrlBtn');
    addUrlBtnConfirm?.addEventListener('click', () => this.addUrlImage());

    const cancelUrlBtn = this.container.querySelector('#cancelUrlBtn');
    cancelUrlBtn?.addEventListener('click', () => this.hideUrlInput());

    // Обработка кнопок на карточках изображений
    this.container.addEventListener('click', (e) => {
      const imageCard = e.target.closest('.image-card');
      if (!imageCard) return;

      const imageId = imageCard.dataset.imageId;

      if (e.target.closest('.set-primary-btn')) {
        this.setPrimaryImage(imageId);
      } else if (e.target.closest('.delete-btn')) {
        this.deleteImage(imageId);
      }
    });
  }

  async handleFileUpload(event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    // Проверяем типы файлов
    const invalidFiles = files.filter(file => !this.options.acceptedTypes.includes(file.type));
    if (invalidFiles.length) {
      this.showNotification(`Неподдерживаемые форматы файлов: ${invalidFiles.map(f => f.name).join(', ')}`, 'error');
      return;
    }

    // Проверяем лимит файлов
    if (this.images.length + files.length > this.options.maxFiles) {
      this.showNotification(`Максимум ${this.options.maxFiles} изображений`, 'error');
      return;
    }

    await this.uploadFiles(files);
    event.target.value = ''; // Сбрасываем input
  }

  async uploadFiles(files) {
    if (!this.productId) {
      this.showNotification('Сначала сохраните товар', 'error');
      return;
    }

    try {
      this.setLoading(true);

      // Определяем категорию и цвет из текущего товара
      const product = window.adminComponent?.currentProduct;
      const category = this.getCategoryFolder(product?.size || 'small');
      const color = this.getColorFolder(product?.color_hex || '#000000');

      // Конвертируем файлы в base64
      const filePromises = files.map(file => this.fileToBase64(file));
      const base64Files = await Promise.all(filePromises);

      const uploadData = {
        action: 'upload_images',
        product_id: this.productId,
        category,
        color,
        files: base64Files.map((data, index) => ({
          name: files[index].name,
          data,
          type: files[index].type
        }))
      };

      const { data, error } = await this.supabase.functions.invoke('media-manager', {
        body: uploadData
      });

      if (error) throw error;

      this.showNotification(`Загружено ${data.results.filter(r => r.success).length} из ${files.length} файлов`, 'success');
      await this.loadImages();

    } catch (error) {
      console.error('Upload error:', error);
      this.showNotification('Ошибка загрузки файлов', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  getCategoryFolder(size) {
    const categoryMap = {
      'small': 'small with bow',
      'medium': 'medium with bow',
      'big': 'big with bow'
    };
    return categoryMap[size] || 'small with bow';
  }

  getColorFolder(colorHex) {
    // Маппинг цветов по hex коду в названия папок
    const colorMap = {
      '#FFB6C1': 'pink',    // Rose
      '#008000': 'tiffany', // Green  
      '#1a1a1a': 'black',   // Black
      '#000000': 'black',   // Black
      '#FFFFFF': 'white',   // White
      '#FF0000': 'red',     // Red
      '#FFA500': 'orange',  // Orange
      '#B0E0E6': 'blue ice', // Ice Blue
      '#F3E5AB': 'vanilla', // Vanilla
      '#FFD700': 'gold',    // Gold
      '#E6E6FA': 'lavender', // Lavender
      '#003366': 'blue velvet', // Dark Blue
      '#DDA0DD': 'lavender', // Lilac
      '#C0C0C0': 'white'    // Silver
    };
    return colorMap[colorHex] || 'black';
  }

  showUrlInput() {
    const urlSection = this.container.querySelector('#urlInputSection');
    urlSection?.classList.remove('hidden');
    const urlInput = this.container.querySelector('#urlInput');
    urlInput?.focus();
  }

  hideUrlInput() {
    const urlSection = this.container.querySelector('#urlInputSection');
    urlSection?.classList.add('hidden');
    const urlInput = this.container.querySelector('#urlInput');
    if (urlInput) urlInput.value = '';
  }

  async addUrlImage() {
    const urlInput = this.container.querySelector('#urlInput');
    const url = urlInput?.value.trim();
    
    if (!url) {
      this.showNotification('Введите URL изображения', 'error');
      return;
    }

    if (!this.isValidImageUrl(url)) {
      this.showNotification('Некорректный URL изображения', 'error');
      return;
    }

    // Добавляем URL как изображение (имитируем запись в БД)
    const newImage = {
      id: 'url_' + Date.now(),
      product_id: this.productId,
      image_url: url,
      storage_path: null,
      is_primary: this.images.length === 0,
      isUrlImage: true
    };

    this.images.push(newImage);
    this.render();
    this.attachEvents();
    this.hideUrlInput();
    this.showNotification('URL изображение добавлено', 'success');
  }

  isValidImageUrl(url) {
    try {
      new URL(url);
      return /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);
    } catch {
      return false;
    }
  }

  async setPrimaryImage(imageId) {
    if (!this.productId) return;

    try {
      this.setLoading(true);

      const { data, error } = await this.supabase.functions.invoke('media-manager', {
        body: {
          action: 'set_primary',
          image_id: imageId,
          product_id: this.productId
        }
      });

      if (error) throw error;

      this.showNotification('Главное изображение установлено', 'success');
      await this.loadImages();

    } catch (error) {
      console.error('Set primary error:', error);
      this.showNotification('Ошибка установки главного изображения', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  async deleteImage(imageId) {
    if (!confirm('Удалить изображение?')) return;

    try {
      this.setLoading(true);

      // Если это URL изображение, удаляем локально
      if (imageId.startsWith('url_')) {
        this.images = this.images.filter(img => img.id !== imageId);
        this.render();
        this.attachEvents();
        this.showNotification('Изображение удалено', 'success');
        return;
      }

      const { data, error } = await this.supabase.functions.invoke('media-manager', {
        body: {
          action: 'delete_image',
          image_id: imageId,
          product_id: this.productId
        }
      });

      if (error) throw error;

      this.showNotification('Изображение удалено', 'success');
      await this.loadImages();

    } catch (error) {
      console.error('Delete error:', error);
      this.showNotification('Ошибка удаления изображения', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  setLoading(loading) {
    this.isLoading = loading;
    if (loading) {
      const loadingEl = this.container.querySelector('.images-grid');
      if (loadingEl) {
        loadingEl.style.opacity = '0.5';
        loadingEl.style.pointerEvents = 'none';
      }
    } else {
      const loadingEl = this.container.querySelector('.images-grid');
      if (loadingEl) {
        loadingEl.style.opacity = '1';
        loadingEl.style.pointerEvents = 'auto';
      }
    }
  }

  showNotification(message, type = 'info') {
    // Используем систему уведомлений из админ компонента
    if (window.adminComponent?.showNotification) {
      window.adminComponent.showNotification(message, type);
    } else {
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  }

  // Метод для получения всех изображений (включая URL)
  getAllImages() {
    return this.images.map(img => ({
      id: img.id,
      url: img.image_url,
      is_primary: img.is_primary,
      isUrlImage: img.isUrlImage || false
    }));
  }

  // Метод для установки изображений при загрузке товара
  setImages(images) {
    this.images = images || [];
    this.render();
    this.attachEvents();
  }
}
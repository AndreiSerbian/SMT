import { supabase } from '../utils/supabase.js';
import { productsService } from '../services/productsService.js';
import { StorageHelper } from '../utils/storageHelper.js';

export const AdminProductsComponent = {
  data: {
    products: [],
    categories: [],
    colors: [],
    loading: false,
    showModal: false,
    showImportModal: false,
    editingProduct: null,
    uploadingImage: false,
    selectedImages: [],
    productImages: [], // Изображения из box_images для текущего товара
    uploadingVideo: false,
    wbClicksStats: {}, // Статистика WB кликов
    statsProduct: null, // Товар для отображения статистики
    statsData: null // Данные статистики
  },

  async render() {
    return `
      <div class="admin-products">
        <div class="admin-header">
          <h2>Управление товарами</h2>
          <div class="admin-actions">
            <button class="btn btn-secondary" onclick="AdminProductsComponent.showImport()">
              Импорт из JSON
            </button>
            <button class="btn btn-primary" onclick="AdminProductsComponent.showCreateForm()">
              Добавить товар
            </button>
          </div>
        </div>

        <div class="products-grid">
          ${this.data.loading ? this.renderLoader() : this.renderProductsGrid()}
        </div>

        ${this.data.editingProduct ? this.renderProductModal() : ''}
        ${this.data.showImportModal ? this.renderImportModal() : ''}
        ${this.data.statsProduct ? this.renderStatsModal() : ''}
      </div>
    `;
  },

  renderLoader() {
    return `
      <div class="loader-container">
        <div class="spinner"></div>
        <p>Загрузка товаров...</p>
      </div>
    `;
  },

  renderProductsGrid() {
    if (!this.data.products.length) {
      return `
        <div class="empty-state">
          <p>Товары не найдены</p>
          <button class="btn btn-primary" onclick="AdminProductsComponent.showImport()">
            Импортировать товары
          </button>
        </div>
      `;
    }

    return this.data.products.map(product => `
      <div class="product-card">
        <div class="product-image">
          <img src="${this.getImageUrl(product.photos[0])}" alt="${product.name}" loading="lazy" />
        </div>
        <div class="product-info">
          <h3>${product.name}</h3>
          <p class="artikul">Артикул: ${product.artikul}</p>
          <p class="category">${this.getSizeName(product.size)}</p>
          <p class="color" style="display: flex; align-items: center; gap: 8px;">
            <span style="width: 16px; height: 16px; border-radius: 50%; background-color: ${product.color_hex}; border: 1px solid #ddd;"></span>
            ${this.getColorNameFromHex(product.color_hex)}
          </p>
          <p class="price">${product.price_rub} ₽</p>
          <div class="status">
            <span class="status-badge ${product.is_active ? 'active' : 'inactive'}">
              ${product.is_active ? 'Активен' : 'Неактивен'}
            </span>
          </div>
          <div class="wb-clicks-counter" style="margin-top: 8px; padding: 6px 10px; background: #f3f4f6; border-radius: 6px; font-size: 13px;">
            <span style="color: #6b7280;">🔗 Переходы на WB:</span>
            <strong style="color: #1f2937;">${this.data.wbClicksStats?.[product.id] || 0}</strong>
          </div>
        </div>
        <div class="product-actions">
          <button class="btn btn-sm btn-secondary" onclick="AdminProductsComponent.editProduct('${product.id}')">
            Изменить
          </button>
          <button class="btn btn-sm btn-info" onclick="AdminProductsComponent.showProductStats('${product.id}')" style="display: flex; align-items: center; gap: 4px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="20" x2="12" y2="10"></line>
              <line x1="18" y1="20" x2="18" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="16"></line>
            </svg>
            Статистика
          </button>
          <button class="btn btn-sm ${product.is_active ? 'btn-warning' : 'btn-success'}" 
                  onclick="AdminProductsComponent.toggleActive('${product.id}')">
            ${product.is_active ? 'Деактивировать' : 'Активировать'}
          </button>
        </div>
      </div>
    `).join('');
  },

  renderProductModal() {
    const product = this.data.editingProduct;
    const isCreate = !product.id;

    return `
      <div class="modal-overlay" onclick="AdminProductsComponent.closeModal(event)">
        <div class="modal-content large-modal">
          <div class="modal-header">
            <h3>${isCreate ? 'Добавить товар' : 'Редактировать товар'}</h3>
            <button class="close-btn" onclick="AdminProductsComponent.closeModal()">&times;</button>
          </div>
          
          <form class="product-form" onsubmit="AdminProductsComponent.saveProduct(event)">
            <div class="form-grid">
              <div class="form-group">
                <label>Название товара*</label>
                <input type="text" name="name" value="${product.name || ''}" required 
                       placeholder="Подарочная коробка с лентой">
              </div>
              
              <div class="form-group">
                <label>Артикул*</label>
                <input type="text" name="artikul" value="${product.artikul || ''}" required 
                       placeholder="059">
              </div>
              
              <div class="form-group">
                <label>ID на Wildberries</label>
                <input type="text" name="id_wb" value="${product.id_wb || ''}" 
                       placeholder="215908492">
              </div>
              
              <div class="form-group">
                <label>Размер*</label>
                <select name="size" required>
                  <option value="">Выберите размер</option>
                  <option value="small" ${product.size === 'small' ? 'selected' : ''}>Малая</option>
                  <option value="medium" ${product.size === 'medium' ? 'selected' : ''}>Средняя</option>
                  <option value="big" ${product.size === 'big' ? 'selected' : ''}>Большая</option>
                </select>
              </div>
              
              <div class="form-group">
                <label>Цвет (hex код)*</label>
                <div class="color-input-group">
                  <input type="color" name="color_hex" value="${product.color_hex || '#000000'}" 
                         style="width: 50px; height: 40px; border: none; border-radius: 4px;"
                         onchange="this.nextElementSibling.value = this.value">
                  <input type="text" name="color_hex_text" value="${product.color_hex || '#000000'}" 
                         placeholder="#FF0000" maxlength="7" pattern="^#[0-9A-Fa-f]{6}$"
                         style="flex: 1; margin-left: 8px;"
                         oninput="if(/^#[0-9A-Fa-f]{6}$/.test(this.value)) this.previousElementSibling.value = this.value">
                </div>
                <small class="help-text">Выберите цвет или введите hex код (например: #FF0000)</small>
              </div>
              
              <div class="form-group">
                <label>Цена (руб)*</label>
                <input type="number" name="price_rub" value="${product.price_rub || ''}" required 
                       step="0.01" min="0" placeholder="1500">
              </div>
              
              <div class="form-group">
                <label>Длина (см)*</label>
                <input type="number" name="length" value="${product.dimensions?.length || ''}" required 
                       step="0.1" min="0" placeholder="23">
              </div>
              
              <div class="form-group">
                <label>Ширина (см)*</label>
                <input type="number" name="width" value="${product.dimensions?.width || ''}" required 
                       step="0.1" min="0" placeholder="17">
              </div>
              
              <div class="form-group">
                <label>Высота (см)*</label>
                <input type="number" name="height" value="${product.dimensions?.height || ''}" required 
                       step="0.1" min="0" placeholder="7">
              </div>
              
              <div class="form-group">
                <label>Вес (кг)*</label>
                <input type="number" name="weight" value="${product.weight || ''}" required 
                       step="0.001" min="0" placeholder="0.195">
              </div>
            </div>
            
            <div class="form-section">
              <h4>Изображения товара</h4>
              <div class="image-upload-section">
                <div class="upload-info">
                  <p class="info-text">
                    <strong>Организованное размещение:</strong> Фотографии автоматически размещаются в папки по категориям и цветам.
                    Сначала выберите размер и цвет товара.
                  </p>
                </div>
                
                <!-- Drag & Drop Zone -->
                <div id="dropZone" class="drop-zone" 
                     ondrop="AdminProductsComponent.handleDrop(event)" 
                     ondragover="AdminProductsComponent.handleDragOver(event)"
                     ondragleave="AdminProductsComponent.handleDragLeave(event)">
                  <div class="drop-zone-content">
                    <svg class="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                    </svg>
                    <p class="text-lg text-gray-600 mb-2">Перетащите изображения сюда</p>
                    <p class="text-sm text-gray-400 mb-4">или</p>
                    <button type="button" onclick="document.getElementById('imageUpload').click()" 
                            class="btn btn-secondary" ${this.data.uploadingImage ? 'disabled' : ''}>
                      ${this.data.uploadingImage ? 'Загрузка...' : 'Выберите файлы'}
                    </button>
                  </div>
                </div>
                
                <input type="file" id="imageUpload" multiple accept="image/webp,image/jpeg,image/png" 
                       onchange="AdminProductsComponent.handleImageUpload(event)" class="hidden">
                
                <div class="upload-actions">
                  ${this.data.editingProduct?.id ? `
                    <button type="button" onclick="AdminProductsComponent.reorganizePhotos()" 
                            class="btn btn-outline" title="Переместить существующие фото в правильные папки">
                      Реорганизовать фото
                    </button>
                  ` : ''}
                </div>
                <small class="help-text">Поддерживаются форматы: WebP, JPEG, PNG. Рекомендуемый размер: 800x800px</small>
                
                <div class="current-images">
                  ${this.data.productImages.map((image, index) => `
                    <div class="image-item ${image.is_primary ? 'primary' : ''}">
                      <img src="${image.image_url}" 
                           alt="Товар ${index + 1}" 
                           class="image-preview"
                           onclick="AdminProductsComponent.openImagePreview('${image.image_url}', ${index}, ${JSON.stringify(this.data.productImages.map(img => img.image_url)).replace(/"/g, '&quot;')})">
                      
                      <div class="image-controls">
                        ${!image.is_primary ? `
                          <button type="button" onclick="AdminProductsComponent.setPrimaryImage('${image.id}')" 
                                  class="btn btn-sm btn-primary" title="Сделать основным">
                            ⭐
                          </button>
                        ` : `
                          <span class="primary-badge">Основное</span>
                        `}
                        <button type="button" onclick="AdminProductsComponent.deleteProductImage('${image.id}')" 
                                class="btn btn-sm btn-danger" title="Удалить">×</button>
                      </div>
                      
                      <span class="image-order">${index + 1}</span>
                      <div class="image-path-info" title="${image.storage_path}">
                        📁 ${this.getStoragePathInfo(image.storage_path)}
                      </div>
                    </div>
                  `).join('')}
                  
                  ${(product.photos || []).map((photo, index) => `
                    <div class="image-item legacy">
                      <img src="${this.getImageUrl(photo)}" 
                           alt="Товар (старый) ${index + 1}" 
                           class="image-preview"
                           onclick="AdminProductsComponent.openImagePreview('${this.getImageUrl(photo)}', ${index}, ${JSON.stringify((product.photos || []).map(p => this.getImageUrl(p))).replace(/"/g, '&quot;')})">
                      <button type="button" onclick="AdminProductsComponent.removeImage(${index})" 
                              class="remove-image">×</button>
                      <span class="image-order">L${index + 1}</span>
                      <div class="image-path-info" title="${photo}">
                        ${this.getImagePathInfo(photo)} (legacy)
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
            
            <div class="form-section">
              <h4>Видео товара</h4>
              <div class="video-section">
                <div class="video-upload-group">
                  <input type="file" id="videoUpload" accept="video/*" 
                         onchange="AdminProductsComponent.handleVideoUpload(event)" class="hidden">
                  <button type="button" onclick="document.getElementById('videoUpload').click()" 
                          class="btn btn-secondary" ${this.data.uploadingVideo ? 'disabled' : ''}>
                    ${this.data.uploadingVideo ? 'Загрузка...' : '+ видео'}
                  </button>
                  <input type="text" name="video_url" placeholder="Или ссылка на видео" 
                         class="video-input" style="flex: 1; margin-left: 8px;">
                  <button type="button" onclick="AdminProductsComponent.addVideoUrl()" class="btn btn-outline">
                    Добавить URL
                  </button>
                </div>
                
                <div class="current-videos">
                  ${(product.videos || []).map((video, index) => `
                    <div class="video-item">
                      ${this.isVideoFile(video) ? `
                        <div class="video-preview">
                          <video width="200" height="112" controls>
                            <source src="${this.getVideoUrl(video)}" type="video/mp4">
                            Ваш браузер не поддерживает видео.
                          </video>
                        </div>
                      ` : `
                        <div class="video-link">
                          <a href="${video}" target="_blank" rel="noopener noreferrer">
                            📹 ${this.getVideoDisplayName(video)}
                          </a>
                        </div>
                      `}
                      <button type="button" onclick="AdminProductsComponent.removeVideo(${index})" 
                              class="remove-video">×</button>
                      <span class="video-order">${index + 1}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
            
            <div class="form-group">
              <label>
                <input type="checkbox" name="is_active" ${product.is_active !== false ? 'checked' : ''} />
                Активен
              </label>
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" onclick="AdminProductsComponent.closeModal()">
                Отмена
              </button>
              <button type="submit" class="btn btn-primary">
                ${isCreate ? 'Создать' : 'Сохранить'} товар
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  renderImportModal() {
    return `
      <div class="modal-overlay" onclick="AdminProductsComponent.closeImportModal(event)">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Импорт товаров из JSON</h3>
            <button class="close-btn" onclick="AdminProductsComponent.closeImportModal()">&times;</button>
          </div>
          
          <div class="import-info">
            <p>Будет импортирован файл products.js с товарами</p>
            <p class="warning">⚠️ Существующие товары с такими же артикулами будут обновлены</p>
          </div>
          
          <form class="import-form" onsubmit="AdminProductsComponent.importProducts(event)">
            <div class="form-group">
              <label>Логин администратора</label>
              <input type="text" name="admin_login" required />
            </div>
            <div class="form-group">
              <label>Пароль администратора</label>
              <input type="password" name="admin_password" required />
            </div>
            
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" onclick="AdminProductsComponent.closeImportModal()">
                Отмена
              </button>
              <button type="submit" class="btn btn-primary">
                Импортировать
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  async mount(container) {
    await this.loadData();
    container.innerHTML = await this.render();
  },

  async loadData() {
    this.data.loading = true;
    
    try {
      // Загружаем только продукты
      const productsResult = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (productsResult.error) throw productsResult.error;

      this.data.products = productsResult.data;
      
      // Загружаем статистику WB кликов
      await this.loadWBClicksStats();
      
    } catch (error) {
      console.error('Error loading data:', error);
      this.showNotification('Ошибка загрузки данных', 'error');
    }
    
    this.data.loading = false;
  },

  async loadWBClicksStats() {
    try {
      // Загружаем статистику кликов для всех товаров
      const { data, error } = await supabase
        .from('wb_clicks')
        .select('product_id');

      if (error) throw error;

      // Подсчитываем клики для каждого товара
      const clicksMap = {};
      (data || []).forEach(click => {
        clicksMap[click.product_id] = (clicksMap[click.product_id] || 0) + 1;
      });

      // Сохраняем статистику
      this.data.wbClicksStats = clicksMap;
    } catch (error) {
      console.error('Ошибка загрузки статистики WB кликов:', error);
      this.data.wbClicksStats = {};
    }
  },

  getSizeName(size) {
    const sizeMapping = {
      'small': 'Малая',
      'medium': 'Средняя', 
      'big': 'Большая'
    };
    return sizeMapping[size] || size;
  },

  getColorNameFromHex(hex) {
    const colorMapping = {
      '#FFB6C1': 'Розовая',
      '#1a1a1a': 'Черная',
      '#FFFFFF': 'Белая', 
      '#FFD700': 'Золотая',
      '#C0C0C0': 'Серебряная',
      '#FF0000': 'Красная',
      '#FFA500': 'Оранжевая',
      '#FFCBA4': 'Персиковая',
      '#B0E0E6': 'Голубая ледяная',
      '#003366': 'Синяя бархатная',
      '#0ABAB5': 'Тиффани',
      '#F3E5AB': 'Ванильная',
      '#F8F8FF': 'Белая алмазная',
      '#2F2F2F': 'Черная муар',
      '#E6E6FA': 'Лавандовая',
      '#DDA0DD': 'Сиреневая'
    };
    return colorMapping[hex] || hex;
  },

  getImageUrl(photo) {
    if (photo.startsWith('http')) {
      return photo;
    }
    return `https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/${photo}`;
  },

  getImagePathInfo(photo) {
    if (photo.startsWith('images/')) {
      const pathParts = photo.split('/');
      if (pathParts.length >= 3) {
        const sizeFolder = pathParts[1];
        const colorFolder = pathParts[2];
        return `📁 ${sizeFolder}/${colorFolder}`;
      }
    }
    return '📁 products/ (старая структура)';
  },

  getStoragePathInfo(storagePath) {
    const pathParts = storagePath.split('/');
    if (pathParts.length >= 3) {
      return `${pathParts[pathParts.length - 3]}/${pathParts[pathParts.length - 2]}`;
    }
    return storagePath;
  },

  async reorganizePhotos() {
    if (!this.data.editingProduct?.photos?.length) {
      this.showNotification('Нет фотографий для реорганизации', 'warning');
      return;
    }

    const sizeSelect = document.querySelector('[name="size"]');
    const colorHexInput = document.querySelector('[name="color_hex_text"]') || document.querySelector('[name="color_hex"]');
    
    const size = sizeSelect?.value;
    const colorHex = colorHexInput?.value;

    if (!size || !colorHex) {
      this.showNotification('Пожалуйста, выберите размер и цвет товара перед реорганизацией', 'warning');
      return;
    }

    try {
      this.showNotification('Начинаем реорганизацию фотографий...', 'info');
      
      const reorganizedPhotos = await StorageHelper.reorganizeProductFiles(
        this.data.editingProduct.photos, 
        size, 
        colorHex
      );
      
      this.data.editingProduct.photos = reorganizedPhotos;
      this.showNotification('Фотографии успешно реорганизованы', 'success');
      this.rerender();
      
    } catch (error) {
      console.error('Error reorganizing photos:', error);
      this.showNotification('Ошибка реорганизации фотографий: ' + error.message, 'error');
    }
  },

  // Загрузка изображений товара из box_images
  async loadProductImages(productId) {
    try {
      const { data, error } = await window.supabase.functions.invoke('media-manager', {
        body: {
          action: 'get_images',
          product_id: productId
        }
      });

      if (error) throw error;
      this.data.productImages = data.images || [];
    } catch (error) {
      console.error('Error loading product images:', error);
      this.data.productImages = [];
    }
  },

  // Загрузка категорий
  async loadCategories() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      this.data.categories = data || [];
    } catch (error) {
      console.error('Error loading categories:', error);
      this.data.categories = [];
    }
  },

  // Загрузка цветов
  async loadColors() {
    try {
      const { data, error } = await supabase
        .from('colors')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      this.data.colors = data || [];
    } catch (error) {
      console.error('Error loading colors:', error);
      this.data.colors = [];
    }
  },

  // Загрузка изображений через media-manager в products
  async handleImageUpload(event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    const product = this.data.editingProduct;
    if (!product?.id && !product?.artikul) {
      this.showNotification('Сначала создайте товар', 'error');
      return;
    }

    this.data.uploadingImage = true;
    this.rerender();

    try {
      // Конвертируем файлы в base64
      const base64Files = await Promise.all(files.map(async (file) => {
        const base64 = await this.fileToBase64(file);
        return {
          name: file.name,
          content: base64,
          content_type: file.type
        };
      }));

      const { data, error } = await window.supabase.functions.invoke('media-manager', {
        body: {
          action: 'upload_images',
          product_id: product.id || product.artikul,
          files: base64Files
        }
      });

      if (error) throw error;

      this.showNotification(`Загружено ${files.length} изображений`, 'success');
      await this.loadProductMedia(product.id || product.artikul);
      
    } catch (error) {
      console.error('Error uploading images:', error);
      this.showNotification('Ошибка загрузки изображений: ' + error.message, 'error');
    } finally {
      this.data.uploadingImage = false;
      event.target.value = '';
      this.rerender();
    }
  },

  // Установка основного изображения
  async setPrimaryImage(imageId) {
    const product = this.data.editingProduct;
    if (!product) return;

    try {
      const { data, error } = await window.supabase.functions.invoke('media-manager', {
        body: {
          action: 'set_primary',
          product_id: product.id || product.artikul,
          image_id: imageId
        }
      });

      if (error) throw error;

      this.showNotification('Основное изображение установлено', 'success');
      await this.loadProductMedia(product.id || product.artikul);
      this.rerender();
      
    } catch (error) {
      console.error('Error setting primary image:', error);
      this.showNotification('Ошибка установки основного изображения: ' + error.message, 'error');
    }
  },

  // Удаление изображения через media-manager
  async deleteProductImage(imageId) {
    const product = this.data.editingProduct;
    if (!product) return;

    if (!confirm('Удалить это изображение?')) return;

    try {
      const { data, error } = await window.supabase.functions.invoke('media-manager', {
        body: {
          action: 'delete_image',
          product_id: product.id || product.artikul,
          image_id: imageId
        }
      });

      if (error) throw error;

      this.showNotification('Изображение удалено', 'success');
      await this.loadProductMedia(product.id || product.artikul);
      this.rerender();
      
    } catch (error) {
      console.error('Error deleting image:', error);
      this.showNotification('Ошибка удаления изображения: ' + error.message, 'error');
    }
  },

  // Загрузка видео через media-manager в products
  async handleVideoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const product = this.data.editingProduct;
    if (!product?.id && !product?.artikul) {
      this.showNotification('Сначала создайте товар', 'error');
      return;
    }

    this.data.uploadingVideo = true;
    this.rerender();

    try {
      console.log('Uploading video file:', file.name, file.type, file.size);
      
      // Проверяем, является ли файл видео
      if (!file.type.startsWith('video/')) {
        throw new Error('Выбранный файл не является видео');
      }

      // Ограничиваем размер видео (например, 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        throw new Error('Размер видео не должен превышать 50MB');
      }

      // Загружаем через Supabase Storage
      const fileName = `video_${Date.now()}_${file.name}`;
      
      const { data: uploadData, error: uploadError } = await window.supabase.storage
        .from('product-media')
        .upload(`videos/${fileName}`, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Ошибка загрузки: ${uploadError.message}`);
      }

      // Получаем публичный URL
      const { data: urlData } = window.supabase.storage
        .from('product-media')
        .getPublicUrl(`videos/${fileName}`);

      const videoUrl = urlData.publicUrl;
      
      // Добавляем видео к текущему товару через media-manager
      const currentVideos = product.videos || [];
      currentVideos.push(videoUrl);
      
      const { data, error } = await window.supabase.functions.invoke('media-manager', {
        body: {
          action: 'upload_videos',
          product_id: product.id || product.artikul,
          videos: currentVideos
        }
      });

      if (error) throw error;

      this.showNotification('Видео загружено успешно', 'success');
      await this.loadProductMedia(product.id || product.artikul);
      
    } catch (error) {
      console.error('Error uploading video:', error);
      this.showNotification('Ошибка загрузки видео: ' + error.message, 'error');
    } finally {
      this.data.uploadingVideo = false;
      event.target.value = '';
      this.rerender();
    }
  },

  // Добавление видео по URL
  async addVideoUrl() {
    const input = document.querySelector('[name="video_url"]');
    const url = input.value.trim();
    
    if (!url) {
      this.showNotification('Введите URL видео', 'error');
      return;
    }

    const product = this.data.editingProduct;
    if (!product?.id && !product?.artikul) {
      this.showNotification('Сначала создайте товар', 'error');
      return;
    }

    const currentVideos = product.videos || [];
    
    // Проверяем, не добавлено ли уже это видео
    if (currentVideos.includes(url)) {
      this.showNotification('Это видео уже добавлено', 'error');
      return;
    }
    
    try {
      currentVideos.push(url);
      
      const { data, error } = await window.supabase.functions.invoke('media-manager', {
        body: {
          action: 'upload_videos',
          product_id: product.id || product.artikul,
          videos: currentVideos
        }
      });

      if (error) throw error;

      input.value = '';
      this.showNotification('Видео добавлено', 'success');
      await this.loadProductMedia(product.id || product.artikul);
      
    } catch (error) {
      console.error('Error adding video URL:', error);
      this.showNotification('Ошибка добавления видео: ' + error.message, 'error');
    }
  },

  // Удаление видео
  async removeVideo(index) {
    const product = this.data.editingProduct;
    if (!product?.videos || !product.videos[index]) return;

    try {
      const currentVideos = [...product.videos];
      currentVideos.splice(index, 1);
      
      const { data, error } = await window.supabase.functions.invoke('media-manager', {
        body: {
          action: 'upload_videos',
          product_id: product.id || product.artikul,
          videos: currentVideos
        }
      });

      if (error) throw error;

      this.showNotification('Видео удалено', 'success');
      await this.loadProductMedia(product.id || product.artikul);
      
    } catch (error) {
      console.error('Error removing video:', error);
      this.showNotification('Ошибка удаления видео: ' + error.message, 'error');
    }
  },

  // Вспомогательные функции для видео
  isVideoFile(video) {
    return video.includes('.mp4') || video.includes('.webm') || video.includes('.avi') || 
           video.includes('.mov') || video.startsWith('videos/');
  },

  getVideoUrl(video) {
    if (video.startsWith('http')) {
      return video;
    }
    return `https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/${video}`;
  },

  getVideoDisplayName(video) {
    if (video.startsWith('http')) {
      return video.length > 50 ? video.substring(0, 50) + '...' : video;
    }
    return video.split('/').pop();
  },

  getSizeCategoryName(size) {
    const sizeMapping = {
      'small': 'small with bow',
      'medium': 'medium with bow',
      'big': 'big with bow'
    };
    return sizeMapping[size] || size;
  },

  // Преобразование файла в base64
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  },

  async handleImageUpload(event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    // Проверяем, что размер и цвет уже выбраны для организованного размещения
    const sizeSelect = document.querySelector('[name="size"]');
    const colorHexInput = document.querySelector('[name="color_hex_text"]') || document.querySelector('[name="color_hex"]');
    
    const size = sizeSelect?.value;
    const colorHex = colorHexInput?.value;

    if (!size || !colorHex) {
      this.showNotification('Пожалуйста, сначала выберите размер и цвет товара для правильной организации фото', 'warning');
      return;
    }

    this.data.uploadingImage = true;
    this.rerender();

    try {
      const uploadPromises = files.map(async (file) => {
        try {
          // Используем StorageHelper для организованной загрузки
          return await StorageHelper.uploadOrganizedFile(file, size, colorHex);
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          // Fallback: загружаем в старую структуру
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `products/${fileName}`;

          const { data, error: uploadError } = await supabase.storage
            .from('product-media')
            .upload(filePath, file);

          if (uploadError) throw uploadError;
          return filePath;
        }
      });

      const uploadedPaths = await Promise.all(uploadPromises);
      
      // Добавляем новые пути к существующим фото
      if (this.data.editingProduct) {
        this.data.editingProduct.photos = [...(this.data.editingProduct.photos || []), ...uploadedPaths];
      } else {
        this.data.selectedImages = [...(this.data.selectedImages || []), ...uploadedPaths];
      }

      this.showNotification(`Загружено ${uploadedPaths.length} изображений в организованную структуру папок`, 'success');
    } catch (error) {
      console.error('Error uploading images:', error);
      this.showNotification('Ошибка загрузки изображений: ' + error.message, 'error');
    } finally {
      this.data.uploadingImage = false;
      event.target.value = ''; // Очищаем input
      this.rerender();
    }
  },

  async removeImage(index) {
    const product = this.data.editingProduct;
    if (!product?.photos || !product.photos[index]) return;

    try {
      const currentPhotos = [...product.photos];
      currentPhotos.splice(index, 1);
      
      // Обновляем через media-manager
      const { data, error } = await window.supabase
        .from('products')
        .update({ photos: currentPhotos })
        .eq('id', product.id || product.artikul);

      if (error) throw error;

      this.showNotification('Фото удалено', 'success');
      await this.loadProductMedia(product.id || product.artikul);
      
    } catch (error) {
      console.error('Error removing image:', error);
      this.showNotification('Ошибка удаления фото: ' + error.message, 'error');
    }
  },

  addVideo() {
    const videoInput = document.querySelector('.video-input');
    const videoUrl = videoInput.value.trim();
    
    if (!videoUrl) {
      this.showNotification('Введите ссылку на видео', 'error');
      return;
    }

    if (this.data.editingProduct) {
      this.data.editingProduct.videos = [...(this.data.editingProduct.videos || []), videoUrl];
    }
    
    videoInput.value = '';
    this.rerender();
  },

  // Дублированный метод удален - остается только один выше

  showImport() {
    this.data.showImportModal = true;
    this.rerender();
  },

  closeImportModal(event) {
    if (event && event.target !== event.currentTarget) return;
    this.data.showImportModal = false;
    this.rerender();
  },

  async importProducts(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    try {
      // Получаем статические данные для импорта
      const { products } = await import('../data/products.js');
      
      const response = await window.supabase.functions.invoke('import-products', {
        body: {
          products: products,
          admin_login: formData.get('admin_login'),
          admin_password: formData.get('admin_password')
        }
      });

      if (response.error) throw response.error;

      const result = response.data;
      this.showNotification(result.message, 'success');
      this.closeImportModal();
      await this.loadData();
      this.rerender();
      
    } catch (error) {
      console.error('Import error:', error);
      this.showNotification('Ошибка импорта: ' + error.message, 'error');
    }
  },

  showCreateForm() {
    this.data.editingProduct = {
      artikul: '',
      name: '',
      size: '',
      color_hex: '#000000',
      price_rub: '',
      id_wb: '',
      dimensions: { length: '', width: '', height: '' },
      weight: '',
      photos: [],
      videos: [],
      is_active: true
    };
    this.rerender();
  },

  async editProduct(productId) {
    const product = this.data.products.find(p => p.id === productId);
    if (product) {
      this.data.editingProduct = { ...product };
      // Загружаем медиа из products
      await this.loadProductMedia(productId);
      await this.loadCategories();
      await this.loadColors();
      this.rerender();
    }
  },

  // Загрузка медиа продукта из таблицы products
  async loadProductMedia(productId) {
    try {
      const { data, error } = await window.supabase.functions.invoke('media-manager', {
        body: {
          action: 'get_media',
          product_id: productId
        }
      });

      if (error) throw error;

      // Обновляем данные продукта с полученными медиа
      if (this.data.editingProduct) {
        this.data.editingProduct.photos = data.photos || [];
        this.data.editingProduct.videos = data.videos || [];
      }

      console.log('Loaded product media:', data);
    } catch (error) {
      console.error('Error loading product media:', error);
      this.showNotification('Ошибка загрузки медиа: ' + error.message, 'error');
    }
  },

  closeModal(event) {
    if (event && event.target !== event.currentTarget) return;
    this.data.editingProduct = null;
    this.rerender();
  },

  async saveProduct(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    // Берем цвет из текстового поля, если заполнено, иначе из color picker
    const colorHex = formData.get('color_hex_text') || formData.get('color_hex');
    
    const productData = {
      artikul: formData.get('artikul'),
      name: formData.get('name'),
      size: formData.get('size'),
      color_hex: colorHex,
      price_rub: parseFloat(formData.get('price_rub')),
      id_wb: formData.get('id_wb') || null,
      dimensions: {
        length: parseFloat(formData.get('length')),
        width: parseFloat(formData.get('width')),
        height: parseFloat(formData.get('height'))
      },
      weight: parseFloat(formData.get('weight')),
      photos: this.data.editingProduct?.photos || this.data.selectedImages || [],
      videos: this.data.editingProduct?.videos || [],
      is_active: formData.has('is_active')
    };

    // Проверяем наличие изображений
    if (!productData.photos.length) {
      this.showNotification('Добавьте хотя бы одно изображение товара', 'error');
      return;
    }

    try {
      // Если это редактирование существующего товара, проверяем изменение размера/цвета
      if (this.data.editingProduct.id && 
          (this.data.editingProduct.size !== productData.size || 
           this.data.editingProduct.color_hex !== productData.color_hex)) {
        
        this.showNotification('Обнаружено изменение размера или цвета. Реорганизуем фотографии...', 'info');
        
        // Реорганизуем фотографии в соответствии с новыми параметрами
        try {
          productData.photos = await StorageHelper.reorganizeProductFiles(
            productData.photos, 
            productData.size, 
            productData.color_hex
          );
        } catch (error) {
          console.error('Error reorganizing photos during save:', error);
          this.showNotification('Предупреждение: не удалось реорганизовать все фотографии', 'warning');
        }
      }

      let result;
      if (this.data.editingProduct.id) {
        // Обновление
        result = await supabase
          .from('products')
          .update(productData)
          .eq('id', this.data.editingProduct.id);
      } else {
        // Создание - используем artikul как id
        productData.id = productData.artikul;
        result = await supabase
          .from('products')
          .insert(productData);
      }

      if (result.error) throw result.error;

      // Также обновляем/создаем запись в product_prices
      await supabase
        .from('product_prices')
        .upsert({
          product_id: productData.artikul,
          price_rub: productData.price_rub
        }, {
          onConflict: 'product_id'
        });

      this.showNotification('Товар сохранен', 'success');
      this.closeModal();
      this.data.selectedImages = []; // Очищаем выбранные изображения
      await this.loadData();
      this.rerender();
      
    } catch (error) {
      console.error('Save error:', error);
      this.showNotification('Ошибка сохранения: ' + error.message, 'error');
    }
  },

  async toggleActive(productId) {
    const product = this.data.products.find(p => p.id === productId);
    if (!product) return;

    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', productId);

      if (error) throw error;

      this.showNotification(
        `Товар ${product.is_active ? 'деактивирован' : 'активирован'}`, 
        'success'
      );
      await this.loadData();
      this.rerender();
      
    } catch (error) {
      console.error('Toggle active error:', error);
      this.showNotification('Ошибка изменения статуса', 'error');
    }
  },

  showNotification(message, type = 'info') {
    // Создаем уведомление
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  },

  async rerender() {
    const container = document.querySelector('.admin-products').parentElement;
    container.innerHTML = await this.render();
  },

  // Drag & Drop функции
  handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    const dropZone = document.getElementById('dropZone');
    dropZone.classList.add('drag-over');
  },

  handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    const dropZone = document.getElementById('dropZone');
    dropZone.classList.remove('drag-over');
  },

  handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    const dropZone = document.getElementById('dropZone');
    dropZone.classList.remove('drag-over');
    
    const files = Array.from(event.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      // Создаем fake event для handleImageUpload
      const fakeEvent = {
        target: {
          files: imageFiles
        }
      };
      this.handleImageUpload(fakeEvent);
    }
  },

  // Модальный просмотр изображений
  openImagePreview(imageSrc, index, images) {
    // Создаем модальное окно если его нет
    let modal = document.getElementById('adminImageModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'adminImageModal';
      modal.className = 'fixed inset-0 bg-black bg-opacity-75 z-[100] hidden flex items-center justify-center';
      modal.innerHTML = `
        <div class="relative max-w-4xl max-h-[90vh] mx-4">
          <button onclick="AdminProductsComponent.closeImagePreview()" class="absolute -top-10 right-0 text-white text-2xl hover:text-gray-300">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
          <img id="adminModalImage" src="" alt="" class="max-w-full max-h-[80vh] object-contain">
          <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
            <button onclick="AdminProductsComponent.prevAdminImage()" class="bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg hover:bg-opacity-30 transition">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <span id="adminImageCounter" class="bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg"></span>
            <button onclick="AdminProductsComponent.nextAdminImage()" class="bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg hover:bg-opacity-30 transition">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    this.currentAdminImageIndex = index;
    this.currentAdminImages = images;
    
    const modalImage = document.getElementById('adminModalImage');
    const counter = document.getElementById('adminImageCounter');
    
    modalImage.src = imageSrc;
    counter.textContent = `${index + 1} / ${images.length}`;
    modal.classList.remove('hidden');
    
    // Блокируем скролл body
    document.body.style.overflow = 'hidden';
    
    // Закрытие по ESC
    const handleKeyPress = (e) => {
      if (e.key === 'Escape') {
        this.closeImagePreview();
      } else if (e.key === 'ArrowLeft') {
        this.prevAdminImage();
      } else if (e.key === 'ArrowRight') {
        this.nextAdminImage();
      }
    };
    document.addEventListener('keydown', handleKeyPress);
    modal.handleKeyPress = handleKeyPress;
  },

  closeImagePreview() {
    const modal = document.getElementById('adminImageModal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
      
      // Убираем обработчик событий
      if (modal.handleKeyPress) {
        document.removeEventListener('keydown', modal.handleKeyPress);
      }
    }
  },

  prevAdminImage() {
    this.currentAdminImageIndex = this.currentAdminImageIndex > 0 ? 
      this.currentAdminImageIndex - 1 : this.currentAdminImages.length - 1;
    
    const modalImage = document.getElementById('adminModalImage');
    const counter = document.getElementById('adminImageCounter');
    
    modalImage.src = this.currentAdminImages[this.currentAdminImageIndex];
    counter.textContent = `${this.currentAdminImageIndex + 1} / ${this.currentAdminImages.length}`;
  },

  nextAdminImage() {
    this.currentAdminImageIndex = this.currentAdminImageIndex < this.currentAdminImages.length - 1 ? 
      this.currentAdminImageIndex + 1 : 0;
    
    const modalImage = document.getElementById('adminModalImage');
    const counter = document.getElementById('adminImageCounter');
    
    modalImage.src = this.currentAdminImages[this.currentAdminImageIndex];
    counter.textContent = `${this.currentAdminImageIndex + 1} / ${this.currentAdminImages.length}`;
  },

  // Статистика товара
  async showProductStats(productId) {
    const product = this.data.products.find(p => p.id === productId);
    if (!product) return;

    this.data.statsProduct = product;
    this.data.statsData = null;
    
    // Перерисовываем для показа загрузки
    const container = document.getElementById('adminContent');
    if (container) {
      container.innerHTML = await this.render();
    }

    // Загружаем статистику
    await this.loadProductStats(productId);
    
    // Перерисовываем со статистикой
    if (container) {
      container.innerHTML = await this.render();
    }
  },

  async loadProductStats(productId) {
    try {
      // Загружаем переходы на WB
      const { data: wbClicks, error: wbError } = await supabase
        .from('wb_clicks')
        .select('clicked_at')
        .eq('product_id', productId)
        .order('clicked_at', { ascending: false });

      if (wbError) throw wbError;

      // Загружаем заказы с этим товаром
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, cart_items, total, order_status, created_at')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Фильтруем заказы, содержащие этот товар
      const ordersWithProduct = orders.filter(order => {
        const items = Array.isArray(order.cart_items) ? order.cart_items : [];
        return items.some(item => item.id === productId);
      });

      // Подсчитываем статистику продаж
      const salesStats = {
        totalOrders: ordersWithProduct.length,
        totalQuantity: 0,
        totalRevenue: 0,
        confirmedOrders: 0,
        confirmedRevenue: 0
      };

      ordersWithProduct.forEach(order => {
        const items = Array.isArray(order.cart_items) ? order.cart_items : [];
        const productItem = items.find(item => item.id === productId);
        
        if (productItem) {
          salesStats.totalQuantity += productItem.quantity || 0;
          
          // Считаем только подтверждённые заказы для выручки
          if (order.order_status !== 'cancelled' && order.order_status !== 'rejected') {
            salesStats.confirmedOrders++;
            salesStats.confirmedRevenue += (productItem.price * productItem.quantity) || 0;
          }
        }
      });

      this.data.statsData = {
        wbClicks: wbClicks || [],
        wbClicksTotal: (wbClicks || []).length,
        orders: ordersWithProduct,
        salesStats
      };

    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
      this.data.statsData = {
        error: 'Ошибка загрузки статистики'
      };
    }
  },

  renderStatsModal() {
    const product = this.data.statsProduct;
    const stats = this.data.statsData;

    return `
      <div class="modal-overlay" onclick="AdminProductsComponent.closeStatsModal(event)">
        <div class="modal-content large-modal">
          <div class="modal-header">
            <h3>📊 Статистика товара: ${product.name}</h3>
            <button class="close-btn" onclick="AdminProductsComponent.closeStatsModal()">&times;</button>
          </div>
          
          <div class="stats-content" style="padding: 20px;">
            ${!stats ? this.renderStatsLoader() : stats.error ? `<p class="error">${stats.error}</p>` : this.renderStatsData(stats)}
          </div>
        </div>
      </div>
    `;
  },

  renderStatsLoader() {
    return `
      <div style="text-align: center; padding: 40px;">
        <div class="spinner" style="margin: 0 auto 16px;"></div>
        <p>Загрузка статистики...</p>
      </div>
    `;
  },

  renderStatsData(stats) {
    return `
      <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="stat-card" style="background: #f0f9ff; padding: 16px; border-radius: 8px;">
          <div style="font-size: 24px; font-weight: bold; color: #0369a1;">${stats.wbClicksTotal}</div>
          <div style="font-size: 14px; color: #64748b;">Переходов на WB</div>
        </div>
        
        <div class="stat-card" style="background: #f0fdf4; padding: 16px; border-radius: 8px;">
          <div style="font-size: 24px; font-weight: bold; color: #15803d;">${stats.salesStats.totalOrders}</div>
          <div style="font-size: 14px; color: #64748b;">Всего заказов</div>
        </div>
        
        <div class="stat-card" style="background: #fef3c7; padding: 16px; border-radius: 8px;">
          <div style="font-size: 24px; font-weight: bold; color: #d97706;">${stats.salesStats.totalQuantity}</div>
          <div style="font-size: 14px; color: #64748b;">Продано штук</div>
        </div>
        
        <div class="stat-card" style="background: #f3e8ff; padding: 16px; border-radius: 8px;">
          <div style="font-size: 24px; font-weight: bold; color: #7c3aed;">₽${stats.salesStats.confirmedRevenue.toFixed(2)}</div>
          <div style="font-size: 14px; color: #64748b;">Выручка (подтв.)</div>
        </div>
      </div>

      ${stats.wbClicksTotal > 0 ? `
        <div class="stats-section" style="margin-bottom: 24px;">
          <h4 style="margin-bottom: 12px; font-size: 16px; font-weight: 600;">🔗 Последние переходы на WB</h4>
          <div style="max-height: 200px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 8px;">
            ${stats.wbClicks.slice(0, 10).map(click => `
              <div style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6; font-size: 14px;">
                ${new Date(click.clicked_at).toLocaleString('ru-RU')}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${stats.orders.length > 0 ? `
        <div class="stats-section">
          <h4 style="margin-bottom: 12px; font-size: 16px; font-weight: 600;">📦 Заказы с этим товаром</h4>
          <div style="max-height: 300px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 8px;">
            <table style="width: 100%; font-size: 14px;">
              <thead style="background: #f9fafb; position: sticky; top: 0;">
                <tr>
                  <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">Дата</th>
                  <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">Количество</th>
                  <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">Статус</th>
                  <th style="padding: 8px; text-align: right; border-bottom: 1px solid #e5e7eb;">Сумма</th>
                </tr>
              </thead>
              <tbody>
                ${stats.orders.slice(0, 20).map(order => {
                  const items = Array.isArray(order.cart_items) ? order.cart_items : [];
                  const productItem = items.find(item => item.id === this.data.statsProduct.id);
                  const statusColors = {
                    pending: '#fbbf24',
                    confirmed: '#3b82f6',
                    processing: '#a855f7',
                    shipped: '#6366f1',
                    delivered: '#10b981',
                    cancelled: '#ef4444',
                    rejected: '#f43f5e'
                  };
                  const statusNames = {
                    pending: 'Создан',
                    confirmed: 'Подтверждён',
                    processing: 'В обработке',
                    shipped: 'Отправлен',
                    delivered: 'Доставлен',
                    cancelled: 'Отменён',
                    rejected: 'Отказан'
                  };
                  return `
                    <tr style="border-bottom: 1px solid #f3f4f6;">
                      <td style="padding: 8px;">${new Date(order.created_at).toLocaleDateString('ru-RU')}</td>
                      <td style="padding: 8px;">${productItem?.quantity || 0} шт.</td>
                      <td style="padding: 8px;">
                        <span style="color: ${statusColors[order.order_status] || '#6b7280'}; font-weight: 500;">
                          ${statusNames[order.order_status] || order.order_status}
                        </span>
                      </td>
                      <td style="padding: 8px; text-align: right;">₽${((productItem?.price || 0) * (productItem?.quantity || 0)).toFixed(2)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : '<p style="color: #6b7280; text-align: center; padding: 20px;">Заказов с этим товаром пока нет</p>'}
    `;
  },

  closeStatsModal(event) {
    if (event && event.target !== event.currentTarget) return;
    this.data.statsProduct = null;
    this.data.statsData = null;
    const container = document.getElementById('adminContent');
    if (container) {
      this.render().then(html => container.innerHTML = html);
    }
  }
};

// Глобальный доступ для событий onclick
window.AdminProductsComponent = AdminProductsComponent;
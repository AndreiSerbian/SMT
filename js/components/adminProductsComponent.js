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
    uploadingVideo: false,
    selectedImages: []
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
        </div>
        <div class="product-actions">
          <button class="btn btn-sm btn-secondary" onclick="AdminProductsComponent.editProduct('${product.id}')">
            Изменить
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
                <label>Категория*</label>
                <select name="category_id" required onchange="AdminProductsComponent.onCategoryChange(this.value)">
                  <option value="">Выберите категорию</option>
                  ${this.data.categories.map(cat => `
                    <option value="${cat.id}" ${product.category_id === cat.id ? 'selected' : ''}>${cat.name}</option>
                  `).join('')}
                </select>
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
                    Сначала выберите категорию, размер и цвет товара.
                  </p>
                </div>
                <input type="file" id="imageUpload" multiple accept="image/webp,image/jpeg,image/png" 
                       onchange="AdminProductsComponent.handleImageUpload(event)" class="hidden">
                <div class="upload-actions">
                  <button type="button" onclick="document.getElementById('imageUpload').click()" 
                          class="btn btn-secondary" ${this.data.uploadingImage ? 'disabled' : ''}>
                    ${this.data.uploadingImage ? 'Загрузка...' : 'Выбрать фото из галереи'}
                  </button>
                  ${this.data.editingProduct?.id ? `
                    <button type="button" onclick="AdminProductsComponent.reorganizePhotos()" 
                            class="btn btn-outline" title="Переместить существующие фото в правильные папки">
                      Реорганизовать фото
                    </button>
                  ` : ''}
                </div>
                <small class="help-text">Поддерживаются форматы: WebP, JPEG, PNG. Рекомендуемый размер: 800x800px</small>
                
                <div class="current-images">
                  ${(product.photos || []).map((photo, index) => `
                    <div class="image-item">
                      <img src="${this.getImageUrl(photo)}" 
                           alt="Товар ${index + 1}" class="image-preview">
                      <button type="button" onclick="AdminProductsComponent.removeImage(${index})" 
                              class="remove-image">×</button>
                      <span class="image-order">${index + 1}</span>
                      <div class="image-path-info" title="${photo}">
                        ${this.getImagePathInfo(photo)}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
            
            <div class="form-section">
              <h4>Видео товара</h4>
              <div class="video-section">
                <div class="video-upload-options">
                  <input type="file" id="videoUpload" multiple accept="video/mp4,video/webm,video/mov,video/avi" 
                         onchange="AdminProductsComponent.handleVideoUpload(event)" class="hidden">
                  <button type="button" onclick="document.getElementById('videoUpload').click()" 
                          class="btn btn-secondary" ${this.data.uploadingVideo ? 'disabled' : ''}>
                    ${this.data.uploadingVideo ? 'Загрузка видео...' : 'Выбрать видео из галереи'}
                  </button>
                  <span class="upload-separator">или</span>
                  <input type="text" name="video_url" placeholder="Ссылка на видео" 
                         class="video-input">
                  <button type="button" onclick="AdminProductsComponent.addVideoUrl()" class="btn btn-secondary">
                    Добавить по ссылке
                  </button>
                </div>
                <small class="help-text">Поддерживаются форматы видео: MP4, WebM, MOV, AVI. Максимальный размер: 100MB</small>
                
                <div class="current-videos">
                  ${(product.videos || []).map((video, index) => `
                    <div class="video-item">
                      <span class="video-path">${video}</span>
                      <button type="button" onclick="AdminProductsComponent.removeVideo(${index})" 
                              class="remove-video">×</button>
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
    await this.ensureAdminContext();
    await this.loadData();
    container.innerHTML = await this.render();
  },

  async ensureAdminContext() {
    try {
      const adminLogin = sessionStorage.getItem('admin_login');
      const adminPassword = sessionStorage.getItem('admin_password');
      
      if (adminLogin && adminPassword) {
        await supabase.rpc('set_admin_context', {
          admin_login: adminLogin,
          admin_password: adminPassword
        });
      }
    } catch (error) {
      console.error('Failed to set admin context:', error);
    }
  },

  async loadData() {
    this.data.loading = true;
    
    try {
      // Загружаем продукты и категории
      const [productsResult, categoriesResult] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
      ]);

      if (productsResult.error) throw productsResult.error;
      if (categoriesResult.error) throw categoriesResult.error;

      this.data.products = productsResult.data;
      this.data.categories = categoriesResult.data;
      
    } catch (error) {
      console.error('Error loading data:', error);
      this.showNotification('Ошибка загрузки данных', 'error');
    }
    
    this.data.loading = false;
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

  async handleImageUpload(event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    // Проверяем, что категория, размер и цвет уже выбраны для организованного размещения
    const categorySelect = document.querySelector('[name="category_id"]');
    const sizeSelect = document.querySelector('[name="size"]');
    const colorHexInput = document.querySelector('[name="color_hex_text"]') || document.querySelector('[name="color_hex"]');
    
    const categoryId = categorySelect?.value;
    const size = sizeSelect?.value;
    const colorHex = colorHexInput?.value;

    if (!categoryId || !size || !colorHex) {
      this.showNotification('Пожалуйста, сначала выберите категорию, размер и цвет товара для правильной организации фото', 'warning');
      return;
    }

    // Получаем информацию о выбранной категории
    const selectedCategory = this.data.categories.find(cat => cat.id === categoryId);

    this.data.uploadingImage = true;
    this.rerender();

    try {
      const uploadPromises = files.map(async (file) => {
        try {
          // Используем StorageHelper для организованной загрузки с категорией
          return await StorageHelper.uploadOrganizedFileWithCategory(file, selectedCategory, size, colorHex);
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
    if (this.data.editingProduct) {
      const removedPhoto = this.data.editingProduct.photos[index];
      this.data.editingProduct.photos.splice(index, 1);
      
      // Попытаемся удалить файл из storage
      try {
        await supabase.storage
          .from('product-media')
          .remove([removedPhoto]);
        
        // Если это был последний файл в папке, очистим пустые папки
        const sizeSelect = document.querySelector('[name="size"]');
        const colorHexInput = document.querySelector('[name="color_hex_text"]') || document.querySelector('[name="color_hex"]');
        
        if (sizeSelect?.value && colorHexInput?.value) {
          await StorageHelper.deleteEmptyFolders(sizeSelect.value, colorHexInput.value);
        }
      } catch (error) {
        console.error('Error removing file from storage:', error);
        // Продолжаем работу даже если не удалось удалить файл
      }
    } else {
      this.data.selectedImages.splice(index, 1);
    }
    this.rerender();
  },

  addVideoUrl() {
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

  async handleVideoUpload(event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    // Проверяем размер файлов (максимум 100MB на файл)
    const maxSize = 100 * 1024 * 1024; // 100MB
    const oversizedFiles = files.filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
      this.showNotification(`Файлы слишком большие (максимум 100MB): ${oversizedFiles.map(f => f.name).join(', ')}`, 'error');
      return;
    }

    this.data.uploadingVideo = true;
    this.rerender();

    try {
      const uploadPromises = files.map(async (file) => {
        try {
          const fileExt = file.name.split('.').pop().toLowerCase();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `videos/${fileName}`;

          const { data, error: uploadError } = await supabase.storage
            .from('product-media')
            .upload(filePath, file);

          if (uploadError) throw uploadError;
          return filePath;
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          throw error;
        }
      });

      const uploadedPaths = await Promise.all(uploadPromises);
      
      // Добавляем новые пути к существующим видео
      if (this.data.editingProduct) {
        this.data.editingProduct.videos = [...(this.data.editingProduct.videos || []), ...uploadedPaths];
      }

      this.showNotification(`Загружено ${uploadedPaths.length} видео файлов`, 'success');
    } catch (error) {
      console.error('Error uploading videos:', error);
      this.showNotification('Ошибка загрузки видео: ' + error.message, 'error');
    } finally {
      this.data.uploadingVideo = false;
      event.target.value = ''; // Очищаем input
      this.rerender();
    }
  },

  removeVideo(index) {
    if (this.data.editingProduct) {
      this.data.editingProduct.videos.splice(index, 1);
      this.rerender();
    }
  },

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
      
      const response = await supabase.functions.invoke('import-products', {
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
      category_id: '',
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

  onCategoryChange(categoryId) {
    if (this.data.editingProduct) {
      this.data.editingProduct.category_id = categoryId;
    }
  },

  editProduct(productId) {
    const product = this.data.products.find(p => p.id === productId);
    if (product) {
      this.data.editingProduct = { ...product };
      this.rerender();
    }
  },

  closeModal(event) {
    if (event && event.target !== event.currentTarget) return;
    this.data.editingProduct = null;
    this.rerender();
  },

  async saveProduct(event) {
    event.preventDefault();
    
    // Устанавливаем контекст админа перед операцией
    await this.ensureAdminContext();
    
    const formData = new FormData(event.target);
    
    // Берем цвет из текстового поля, если заполнено, иначе из color picker
    const colorHex = formData.get('color_hex_text') || formData.get('color_hex');
    
    const productData = {
      artikul: formData.get('artikul'),
      name: formData.get('name'),
      category_id: formData.get('category_id'),
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
      // Устанавливаем контекст админа перед операцией
      await this.ensureAdminContext();
      
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
  }
};

// Глобальный доступ для событий onclick
window.AdminProductsComponent = AdminProductsComponent;
import { supabase } from '../utils/supabase.js';
import { products } from '../data/products.js';

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
          <p class="category">${this.getCategoryName(product.category_id)}</p>
          <p class="color">${this.getColorName(product.color_id)}</p>
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
                <select name="category_id" required>
                  <option value="">Выберите категорию</option>
                  ${this.data.categories.map(cat => 
                    `<option value="${cat.id}" ${cat.id === product.category_id ? 'selected' : ''}>
                      ${cat.name}
                    </option>`
                  ).join('')}
                </select>
              </div>
              
              <div class="form-group">
                <label>Цвет*</label>
                <select name="color_id" required>
                  <option value="">Выберите цвет</option>
                  ${this.data.colors.map(color => 
                    `<option value="${color.id}" ${color.id === product.color_id ? 'selected' : ''}>
                      ${color.name}
                    </option>`
                  ).join('')}
                </select>
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
                <input type="file" id="imageUpload" multiple accept="image/webp,image/jpeg,image/png" 
                       onchange="AdminProductsComponent.handleImageUpload(event)" class="hidden">
                <button type="button" onclick="document.getElementById('imageUpload').click()" 
                        class="btn btn-secondary" ${this.data.uploadingImage ? 'disabled' : ''}>
                  ${this.data.uploadingImage ? 'Загрузка...' : 'Добавить изображения'}
                </button>
                <small class="help-text">Поддерживаются форматы: WebP, JPEG, PNG. Рекомендуемый размер: 800x800px</small>
                
                <div class="current-images">
                  ${(product.photos || []).map((photo, index) => `
                    <div class="image-item">
                      <img src="${this.getImageUrl(photo)}" 
                           alt="Товар ${index + 1}" class="image-preview">
                      <button type="button" onclick="AdminProductsComponent.removeImage(${index})" 
                              class="remove-image">×</button>
                      <span class="image-order">${index + 1}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
            
            <div class="form-section">
              <h4>Видео товара</h4>
              <div class="video-section">
                <input type="text" name="video_url" placeholder="Ссылка на видео или путь к файлу" 
                       class="video-input">
                <button type="button" onclick="AdminProductsComponent.addVideo()" class="btn btn-secondary">
                  Добавить видео
                </button>
                
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
            <p>Будет импортировано <strong>${products.length}</strong> товаров из файла products.js</p>
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
      // Загружаем категории и цвета
      const [categoriesResult, colorsResult, productsResult] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('colors').select('*').order('sort_order'),
        supabase.from('products').select(`
          *,
          categories(name),
          colors(name, hex_code)
        `).order('created_at', { ascending: false })
      ]);

      if (categoriesResult.error) throw categoriesResult.error;
      if (colorsResult.error) throw colorsResult.error;
      if (productsResult.error) throw productsResult.error;

      this.data.categories = categoriesResult.data;
      this.data.colors = colorsResult.data;
      this.data.products = productsResult.data;
      
    } catch (error) {
      console.error('Error loading data:', error);
      this.showNotification('Ошибка загрузки данных', 'error');
    }
    
    this.data.loading = false;
  },

  getCategoryName(categoryId) {
    const category = this.data.categories.find(c => c.id === categoryId);
    return category ? category.name : 'Неизвестно';
  },

  getColorName(colorId) {
    const color = this.data.colors.find(c => c.id === colorId);
    return color ? color.name : 'Неизвестно';
  },

  getImageUrl(photo) {
    if (photo.startsWith('http')) {
      return photo;
    }
    return `https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/${photo}`;
  },

  async handleImageUpload(event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    this.data.uploadingImage = true;
    this.rerender();

    try {
      const uploadPromises = files.map(async (file) => {
        // Генерируем уникальное имя файла
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { data, error } = await supabase.storage
          .from('product-media')
          .upload(filePath, file);

        if (error) throw error;
        return filePath;
      });

      const uploadedPaths = await Promise.all(uploadPromises);
      
      // Добавляем новые пути к существующим фото
      if (this.data.editingProduct) {
        this.data.editingProduct.photos = [...(this.data.editingProduct.photos || []), ...uploadedPaths];
      } else {
        this.data.selectedImages = [...(this.data.selectedImages || []), ...uploadedPaths];
      }

      this.showNotification(`Загружено ${uploadedPaths.length} изображений`, 'success');
    } catch (error) {
      console.error('Error uploading images:', error);
      this.showNotification('Ошибка загрузки изображений: ' + error.message, 'error');
    } finally {
      this.data.uploadingImage = false;
      event.target.value = ''; // Очищаем input
      this.rerender();
    }
  },

  removeImage(index) {
    if (this.data.editingProduct) {
      this.data.editingProduct.photos.splice(index, 1);
    } else {
      this.data.selectedImages.splice(index, 1);
    }
    this.rerender();
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
      color_id: '',
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
    const formData = new FormData(event.target);
    
    const productData = {
      artikul: formData.get('artikul'),
      name: formData.get('name'),
      category_id: formData.get('category_id'),
      color_id: formData.get('color_id'),
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
      let result;
      if (this.data.editingProduct.id) {
        // Обновление
        result = await supabase
          .from('products')
          .update(productData)
          .eq('id', this.data.editingProduct.id);
      } else {
        // Создание
        result = await supabase
          .from('products')
          .insert(productData);
      }

      if (result.error) throw result.error;

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
  }
};

// Глобальный доступ для событий onclick
window.AdminProductsComponent = AdminProductsComponent;
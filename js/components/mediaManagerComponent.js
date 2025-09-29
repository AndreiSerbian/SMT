import { supabase } from '../utils/supabase.js';

export class MediaManagerComponent {
    constructor() {
        this.currentProductId = null;
        this.images = [];
        this.categories = [];
        this.colors = [];
        this.init();
    }

    async init() {
        await this.loadCategories();
        await this.loadColors();
    }

    async loadCategories() {
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .eq('is_active', true)
                .order('sort_order');
            
            if (error) throw error;
            this.categories = data || [];
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async loadColors() {
        try {
            const { data, error } = await supabase
                .from('colors')
                .select('*')
                .eq('is_active', true)
                .order('sort_order');
            
            if (error) throw error;
            this.colors = data || [];
        } catch (error) {
            console.error('Error loading colors:', error);
        }
    }

    render() {
        return `
            <div class="media-manager">
                <div class="media-manager-header">
                    <h3>Управление фотографиями</h3>
                    <div class="product-selector">
                        <label for="productIdInput">ID товара (артикул):</label>
                        <input type="text" id="productIdInput" placeholder="Введите артикул товара">
                        <button id="loadProductBtn" class="btn btn-primary">Загрузить</button>
                    </div>
                </div>

                <div class="upload-section" style="display: none;">
                    <div class="upload-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="categorySelect">Категория:</label>
                                <select id="categorySelect">
                                    <option value="">Выберите категорию</option>
                                    ${this.categories.map(cat => `<option value="${cat.slug}">${cat.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="colorSelect">Цвет:</label>
                                <select id="colorSelect">
                                    <option value="">Выберите цвет</option>
                                    ${this.colors.map(color => `<option value="${color.name.toLowerCase().replace(/\s+/g, ' ')}">${color.name}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="imageFiles">Выберите изображения:</label>
                            <input type="file" id="imageFiles" multiple accept="image/*">
                        </div>
                        <div class="form-group">
                            <label for="primaryImageIndex">Главное изображение (номер):</label>
                            <input type="number" id="primaryImageIndex" value="1" min="1">
                        </div>
                        <button id="uploadBtn" class="btn btn-success">Загрузить изображения</button>
                    </div>
                </div>

                <div class="images-section" style="display: none;">
                    <h4>Изображения товара</h4>
                    <div id="imagesGrid" class="images-grid">
                        <!-- Images will be rendered here -->
                    </div>
                </div>

                <div id="loadingIndicator" class="loading" style="display: none;">
                    <p>Загрузка...</p>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        const loadProductBtn = document.getElementById('loadProductBtn');
        const uploadBtn = document.getElementById('uploadBtn');
        const productIdInput = document.getElementById('productIdInput');

        loadProductBtn?.addEventListener('click', () => this.loadProduct());
        uploadBtn?.addEventListener('click', () => this.uploadImages());
        productIdInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.loadProduct();
            }
        });
    }

    async loadProduct() {
        const productId = document.getElementById('productIdInput')?.value?.trim();
        if (!productId) {
            alert('Введите артикул товара');
            return;
        }

        this.currentProductId = productId;
        this.showLoading(true);

        try {
            // Check if product exists
            const { data: product, error: productError } = await supabase
                .from('products')
                .select('*')
                .eq('id', productId)
                .single();

            if (productError || !product) {
                throw new Error('Товар не найден');
            }

            // Load images for this product
            await this.loadProductImages();
            
            document.querySelector('.upload-section').style.display = 'block';
            document.querySelector('.images-section').style.display = 'block';

        } catch (error) {
            console.error('Error loading product:', error);
            alert(`Ошибка: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    async loadProductImages() {
        try {
            const response = await supabase.functions.invoke('media-manager', {
                body: {
                    action: 'get_images',
                    product_id: this.currentProductId
                }
            });

            if (response.error) throw response.error;

            this.images = response.data?.images || [];
            this.renderImages();

        } catch (error) {
            console.error('Error loading images:', error);
            alert(`Ошибка загрузки изображений: ${error.message}`);
        }
    }

    renderImages() {
        const imagesGrid = document.getElementById('imagesGrid');
        if (!imagesGrid) return;

        if (this.images.length === 0) {
            imagesGrid.innerHTML = '<p>Изображения не найдены</p>';
            return;
        }

        imagesGrid.innerHTML = this.images.map(image => `
            <div class="image-item ${image.is_primary ? 'primary' : ''}">
                <img src="${image.image_url}" alt="Product image" loading="lazy">
                <div class="image-controls">
                    <button class="btn btn-sm ${image.is_primary ? 'btn-success' : 'btn-outline'}" 
                            onclick="mediaManager.setPrimary('${image.id}')"
                            ${image.is_primary ? 'disabled' : ''}>
                        ${image.is_primary ? 'Главное' : 'Сделать главным'}
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="mediaManager.deleteImage('${image.id}')">
                        Удалить
                    </button>
                </div>
                <div class="image-info">
                    <small>${image.storage_path}</small>
                </div>
            </div>
        `).join('');
    }

    async uploadImages() {
        const categorySelect = document.getElementById('categorySelect');
        const colorSelect = document.getElementById('colorSelect');
        const imageFiles = document.getElementById('imageFiles');
        const primaryImageIndex = document.getElementById('primaryImageIndex');

        const category = categorySelect?.value;
        const color = colorSelect?.value;
        const files = imageFiles?.files;
        const primaryIndex = parseInt(primaryImageIndex?.value || '1') - 1;

        if (!category || !color) {
            alert('Выберите категорию и цвет');
            return;
        }

        if (!files || files.length === 0) {
            alert('Выберите изображения для загрузки');
            return;
        }

        if (!this.currentProductId) {
            alert('Сначала загрузите товар');
            return;
        }

        this.showLoading(true);

        try {
            // Convert files to base64
            const fileData = await Promise.all(
                Array.from(files).map(file => this.fileToBase64(file))
            );

            const response = await supabase.functions.invoke('media-manager', {
                body: {
                    action: 'upload_images',
                    product_id: this.currentProductId,
                    category: category,
                    color: color,
                    files: fileData,
                    primary_index: primaryIndex
                }
            });

            if (response.error) throw response.error;

            alert(`Успешно загружено ${response.data.uploaded_images} изображений`);
            
            // Reload images
            await this.loadProductImages();
            
            // Reset form
            imageFiles.value = '';
            primaryImageIndex.value = '1';

        } catch (error) {
            console.error('Error uploading images:', error);
            alert(`Ошибка загрузки: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    async setPrimary(imageId) {
        if (!confirm('Сделать это изображение главным?')) return;

        this.showLoading(true);

        try {
            const response = await supabase.functions.invoke('media-manager', {
                body: {
                    action: 'set_primary',
                    image_id: imageId
                }
            });

            if (response.error) throw response.error;

            await this.loadProductImages();

        } catch (error) {
            console.error('Error setting primary:', error);
            alert(`Ошибка: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    async deleteImage(imageId) {
        if (!confirm('Удалить это изображение? Действие нельзя отменить.')) return;

        this.showLoading(true);

        try {
            const response = await supabase.functions.invoke('media-manager', {
                body: {
                    action: 'delete_image',
                    image_id: imageId
                }
            });

            if (response.error) throw response.error;

            await this.loadProductImages();

        } catch (error) {
            console.error('Error deleting image:', error);
            alert(`Ошибка удаления: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                resolve({
                    name: file.name,
                    content: reader.result,
                    content_type: file.type
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    showLoading(show) {
        const indicator = document.getElementById('loadingIndicator');
        if (indicator) {
            indicator.style.display = show ? 'block' : 'none';
        }
    }
}

// Create global instance
export const mediaManagerComponent = new MediaManagerComponent();
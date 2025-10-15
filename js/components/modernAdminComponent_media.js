// Media management methods for ModernAdminComponent
const MediaMethods = {

  // Load product media from database
  async loadProductMedia(productId) {
    if (!productId) {
      this.currentProductImages = [];
      this.currentProductVideos = [];
      return;
    }

    try {
      const { data: product, error } = await this.supabase
        .from('products')
        .select('photos, videos')
        .eq('id', productId)
        .single();

      if (error) throw error;

      this.currentProductImages = product.photos || [];
      this.currentProductVideos = product.videos || [];
    } catch (error) {
      console.error('Error loading product media:', error);
      this.currentProductImages = [];
      this.currentProductVideos = [];
    }
  },

  // Convert file to base64
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = error => reject(error);
    });
  },

  // Handle image upload via media-manager
  async handleImageUpload(event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    const product = this.currentEditingProduct;
    if (!product?.id && !product?.artikul) {
      alert('Сначала создайте товар');
      return;
    }

    this.uploadingImage = true;

    try {
      // Convert files to base64
      const base64Files = await Promise.all(files.map(async (file) => {
        const base64 = await this.fileToBase64(file);
        return {
          name: file.name,
          content: base64,
          content_type: file.type
        };
      }));

      const { data, error } = await this.supabase.functions.invoke('media-manager', {
        body: {
          action: 'upload_images',
          product_id: product.id || product.artikul,
          files: base64Files
        }
      });

      if (error) throw error;

      alert(`Загружено ${files.length} изображений`);
      await this.loadProductMedia(product.id || product.artikul);
      this.updatePhotosGrid();
      this.updateVideosGrid();
      
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Ошибка загрузки изображений: ' + error.message);
    } finally {
      this.uploadingImage = false;
      event.target.value = '';
    }
  },

  // Handle drag and drop
  setupDragAndDrop() {
    const dropZone = document.getElementById('imageDropZone');
    if (!dropZone) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('drag-over');
      });
    });

    dropZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length) {
        const event = { target: { files } };
        this.handleImageUpload(event);
      }
    });
  },

  // Remove image from product
  async removeImage(index) {
    if (!confirm('Удалить это изображение?')) return;
    
    this.currentProductImages.splice(index, 1);
    await this.saveProductMedia();
    this.updatePhotosGrid();
  },

  // Replace image
  async replaceImage(index) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      this.uploadingImage = true;

      try {
        const base64 = await this.fileToBase64(file);
        const { data, error } = await this.supabase.functions.invoke('media-manager', {
          body: {
            action: 'upload_images',
            product_id: this.currentEditingProduct.id || this.currentEditingProduct.artikul,
            files: [{
              name: file.name,
              content: base64,
              content_type: file.type
            }]
          }
        });

        if (error) throw error;

        // Replace the image at the index
        this.currentProductImages[index] = data.photos[data.photos.length - 1];
        await this.saveProductMedia();
        this.updatePhotosGrid();
      } catch (error) {
        console.error('Error replacing image:', error);
        alert('Ошибка замены изображения: ' + error.message);
      } finally {
        this.uploadingImage = false;
        this.updatePhotosGrid();
      }
    };
    input.click();
  },

  // Make image primary (first)
  async makeImagePrimary(index) {
    if (index === 0) return; // Already first
    
    const image = this.currentProductImages.splice(index, 1)[0];
    this.currentProductImages.unshift(image);
    await this.saveProductMedia();
    this.updatePhotosGrid();
  },

  // Show image preview modal
  showImagePreview(url, index) {
    const modal = document.createElement('div');
    modal.className = 'image-preview-modal';
    modal.innerHTML = `
      <div class="preview-backdrop" onclick="this.parentElement.remove()"></div>
      <div class="preview-content">
        <button class="preview-close" onclick="this.closest('.image-preview-modal').remove()">×</button>
        <img src="${url}" alt="Preview" class="preview-image">
        <div class="preview-info">
          <div class="preview-url">
            <label>URL:</label>
            <input type="text" value="${url}" readonly onclick="this.select()">
            <button onclick="navigator.clipboard.writeText('${url}'); alert('URL скопирован!')">Копировать</button>
          </div>
          <div class="preview-actions">
            <button onclick="adminComponent.replaceImage(${index}); this.closest('.image-preview-modal').remove()">Заменить</button>
            ${index !== 0 ? `<button onclick="adminComponent.makeImagePrimary(${index}); this.closest('.image-preview-modal').remove()">Сделать заглавным</button>` : ''}
            <button onclick="adminComponent.removeImage(${index}); this.closest('.image-preview-modal').remove()" class="btn-danger">Удалить</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  // Save media to database
  async saveProductMedia() {
    const product = this.currentEditingProduct;
    if (!product?.id && !product?.artikul) return;

    // Устанавливаем контекст администратора перед операцией
    if (this.adminLogin) {
      try {
        await this.supabase.rpc('set_admin_login_context', {
          admin_login: this.adminLogin
        });
      } catch (error) {
        alert('Ошибка установки контекста: ' + error.message);
        return;
      }
    }

    try {
      const { error } = await this.supabase
        .from('products')
        .update({ 
          photos: this.currentProductImages,
          videos: this.currentProductVideos
        })
        .eq('id', product.id || product.artikul);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving media:', error);
      alert('Ошибка сохранения медиа: ' + error.message);
    }
  },

  // Legacy - kept for compatibility
  addVideoUrl() {
    this.addMediaUrl();
  },

  // Remove video
  async removeVideo(index) {
    if (!confirm('Удалить это видео?')) return;
    
    this.currentProductVideos.splice(index, 1);
    await this.saveProductMedia();
    this.updateVideosGrid();
  },

  // Show video preview
  showVideoPreview(url, index) {
    const modal = document.createElement('div');
    modal.className = 'image-preview-modal';
    modal.innerHTML = `
      <div class="preview-backdrop" onclick="this.parentElement.remove()"></div>
      <div class="preview-content">
        <button class="preview-close" onclick="this.closest('.image-preview-modal').remove()">×</button>
        <video src="${url}" class="preview-video" controls></video>
        <div class="preview-info">
          <div class="preview-url">
            <label>URL:</label>
            <input type="text" value="${url}" readonly onclick="this.select()">
            <button onclick="navigator.clipboard.writeText('${url}'); alert('URL скопирован!')">Копировать</button>
          </div>
          <div class="preview-actions">
            <button onclick="adminComponent.removeVideo(${index}); this.closest('.image-preview-modal').remove()" class="btn-danger">Удалить</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  // Get image URL helper
  getImageUrl(photo) {
    if (photo.startsWith('http')) {
      return photo;
    }
    return `https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/${photo}`;
  },

  // Render photos grid
  renderPhotosGrid() {
    if (!this.currentProductImages || this.currentProductImages.length === 0) {
      return '<div class="text-sm text-slate-400">Нет фотографий</div>';
    }
    
    return this.currentProductImages.map((photo, index) => {
      const url = this.getImageUrl(photo);
      return `
        <div class="media-card" onclick="adminComponent.showImagePreview('${url}', ${index})">
          <img src="${url}" alt="Photo ${index + 1}" class="media-preview">
          ${index === 0 ? '<div class="primary-badge">Главное</div>' : ''}
          <div class="media-actions">
            <button type="button" onclick="event.stopPropagation(); adminComponent.removeImage(${index})" class="action-btn" title="Удалить">🗑️</button>
            ${index !== 0 ? `<button type="button" onclick="event.stopPropagation(); adminComponent.makeImagePrimary(${index})" class="action-btn" title="Сделать главным">⭐</button>` : ''}
          </div>
        </div>
      `;
    }).join('');
  },

  // Render videos grid
  renderVideosGrid() {
    if (!this.currentProductVideos || this.currentProductVideos.length === 0) {
      return '<div class="text-sm text-slate-400">Нет видео</div>';
    }
    
    return this.currentProductVideos.map((video, index) => `
      <div class="media-card" onclick="adminComponent.showVideoPreview('${video}', ${index})">
        <video src="${video}" class="media-preview" preload="metadata"></video>
        <div class="video-play-icon">▶</div>
        <div class="media-actions">
          <button type="button" onclick="event.stopPropagation(); adminComponent.removeVideo(${index})" class="action-btn" title="Удалить">🗑️</button>
        </div>
      </div>
    `).join('');
  },

  // Update sections after changes
  updatePhotosGrid() {
    const container = document.getElementById('photosGrid');
    if (container) {
      container.innerHTML = this.renderPhotosGrid();
    }
  },

  updateVideosGrid() {
    const container = document.getElementById('videosGrid');
    if (container) {
      container.innerHTML = this.renderVideosGrid();
    }
  },

  // Add media via URL
  addMediaUrl() {
    const type = prompt('Тип медиа (photo/video):');
    if (!type) return;
    
    const url = prompt('Введите URL:');
    if (!url || !url.trim()) return;
    
    if (type.toLowerCase() === 'photo' || type.toLowerCase() === 'image') {
      this.currentProductImages.push(url.trim());
      this.saveProductMedia();
      this.updatePhotosGrid();
    } else if (type.toLowerCase() === 'video') {
      this.currentProductVideos.push(url.trim());
      this.saveProductMedia();
      this.updateVideosGrid();
    }
  },

  // Upload media files
  uploadMediaFiles() {
    document.getElementById('mediaFileInput').click();
  },

// Open preview modal
openMediaPreview() {
  const modal = document.createElement('div');
  modal.className = 'image-preview-modal';
  modal.innerHTML = `
    <div class="preview-backdrop" onclick="this.parentElement.remove()"></div>
    <div class="preview-content" style="max-width: 90vw; max-height: 90vh;">
      <button class="preview-close" onclick="this.closest('.image-preview-modal').remove()">×</button>
      <div class="p-6">
        <h3 class="text-lg font-semibold mb-4">Все медиа товара</h3>
        
        <div class="mb-6">
          <h4 class="text-sm font-medium mb-2">Фотографии (${this.currentProductImages.length})</h4>
          <div class="grid grid-cols-3 gap-3">
            ${this.currentProductImages.map((photo, index) => `
              <div class="relative group cursor-pointer" onclick="adminComponent.showImagePreview('${this.getImageUrl(photo)}', ${index})">
                <img src="${this.getImageUrl(photo)}" class="w-full h-32 object-cover rounded-lg border">
                ${index === 0 ? '<div class="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">Главное</div>' : ''}
              </div>
            `).join('') || '<p class="text-sm text-slate-400">Нет фотографий</p>'}
          </div>
        </div>
        
        <div>
          <h4 class="text-sm font-medium mb-2">Видео (${this.currentProductVideos.length})</h4>
          <div class="grid grid-cols-3 gap-3">
            ${this.currentProductVideos.map((video, index) => `
              <div class="relative group cursor-pointer" onclick="adminComponent.showVideoPreview('${video}', ${index})">
                <video src="${video}" class="w-full h-32 object-cover rounded-lg border" preload="metadata"></video>
                <div class="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                  <div class="text-white text-3xl">▶</div>
                </div>
              </div>
            `).join('') || '<p class="text-sm text-slate-400">Нет видео</p>'}
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

};

// Export for use in main component
export default MediaMethods;
export { MediaMethods };
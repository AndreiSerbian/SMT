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
}

// Convert file to base64
async fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });
}

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
  this.updateImageUploadSection();

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
    
  } catch (error) {
    console.error('Error uploading images:', error);
    alert('Ошибка загрузки изображений: ' + error.message);
  } finally {
    this.uploadingImage = false;
    event.target.value = '';
    this.updateImageUploadSection();
  }
}

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
}

// Remove image from product
async removeImage(index) {
  if (!confirm('Удалить это изображение?')) return;
  
  this.currentProductImages.splice(index, 1);
  await this.saveProductMedia();
  this.updateImageUploadSection();
}

// Replace image
async replaceImage(index) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    this.uploadingImage = true;
    this.updateImageUploadSection();

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
      this.updateImageUploadSection();
    } catch (error) {
      console.error('Error replacing image:', error);
      alert('Ошибка замены изображения: ' + error.message);
    } finally {
      this.uploadingImage = false;
      this.updateImageUploadSection();
    }
  };
  input.click();
}

// Make image primary (first)
async makeImagePrimary(index) {
  if (index === 0) return; // Already first
  
  const image = this.currentProductImages.splice(index, 1)[0];
  this.currentProductImages.unshift(image);
  await this.saveProductMedia();
  this.updateImageUploadSection();
}

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
}

// Save media to database
async saveProductMedia() {
  const product = this.currentEditingProduct;
  if (!product?.id && !product?.artikul) return;

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
}

// Add video URL
addVideoUrl() {
  const url = prompt('Введите URL видео:');
  if (url && url.trim()) {
    this.currentProductVideos.push(url.trim());
    this.saveProductMedia();
    this.updateVideoUploadSection();
  }
}

// Remove video
async removeVideo(index) {
  if (!confirm('Удалить это видео?')) return;
  
  this.currentProductVideos.splice(index, 1);
  await this.saveProductMedia();
  this.updateVideoUploadSection();
}

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
}

// Get image URL helper
getImageUrl(photo) {
  if (photo.startsWith('http')) {
    return photo;
  }
  return `https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/${photo}`;
}

// Render image upload section
renderImageUploadSection() {
  return `
    <div class="space-y-4">
      <div id="imageDropZone" class="drop-zone" onclick="document.getElementById('imageFileInput').click()">
        <div class="drop-zone-content">
          <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
          </svg>
          <p class="text-sm text-gray-600 mb-2">
            ${this.uploadingImage ? 'Загрузка...' : 'Перетащите изображения или нажмите для выбора'}
          </p>
          <input type="file" id="imageFileInput" multiple accept="image/*" class="hidden" 
                 onchange="adminComponent.handleImageUpload(event)" ${this.uploadingImage ? 'disabled' : ''}>
        </div>
      </div>
      
      ${this.currentProductImages.length ? `
        <div class="current-images">
          ${this.currentProductImages.map((photo, index) => `
            <div class="image-item" onclick="adminComponent.showImagePreview('${this.getImageUrl(photo)}', ${index})">
              <img src="${this.getImageUrl(photo)}" alt="Product image ${index + 1}" class="image-preview">
              <div class="image-order">${index + 1}</div>
              ${index === 0 ? '<div class="primary-badge">Заглавное</div>' : ''}
              <div class="image-url-preview">${this.getImageUrl(photo).substring(0, 50)}...</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

// Render video upload section  
renderVideoUploadSection() {
  return `
    <div class="space-y-4">
      <button type="button" class="px-4 py-2 text-sm border border-indigo-300 rounded-xl hover:bg-indigo-50" 
              onclick="adminComponent.addVideoUrl()">
        + Добавить видео URL
      </button>
      
      ${this.currentProductVideos.length ? `
        <div class="current-videos">
          ${this.currentProductVideos.map((video, index) => `
            <div class="video-item" onclick="adminComponent.showVideoPreview('${video}', ${index})">
              <div class="video-preview-container">
                <video src="${video}" class="video-thumbnail"></video>
                <div class="video-play-overlay">▶</div>
              </div>
              <div class="video-info">
                <span class="video-label">📹 Видео ${index + 1}</span>
                <small class="video-url-preview">${video.substring(0, 40)}...</small>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

// Update sections after changes
updateImageUploadSection() {
  const container = document.getElementById('imagesBox');
  if (container) {
    container.innerHTML = this.renderImageUploadSection();
    // Re-setup drag and drop after DOM update
    setTimeout(() => this.setupDragAndDrop(), 100);
  }
}

updateVideoUploadSection() {
  const container = document.getElementById('videosBox');
  if (container) {
    container.innerHTML = this.renderVideoUploadSection();
  }
}

};

// Export for use in main component
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MediaMethods;
} else {
  window.MediaMethods = MediaMethods;
}
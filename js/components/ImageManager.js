export class ImageManager {
  constructor(productId, container, options = {}) {
    this.productId = productId;
    this.container = container;
    this.options = {
      maxFiles: 20,
      acceptedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/mov', 'video/avi', 'video/webm'],
      ...options
    };
    this.media = []; // Renamed from images to media
    this.supabase = null;
    this.isLoading = false;
    this.showPreview = false;
    this.currentPreviewIndex = 0;
    this.currentPreviewType = 'all'; // Добавляем тип предпросмотра
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
      this.media = data.images || [];
      
      // Не перерисовываем если открыт предпросмотр
      if (!this.showPreview) {
        this.render();
      }
    } catch (error) {
      console.error('Error loading media:', error);
      this.showNotification('Ошибка загрузки медиа', 'error');
    } finally {
      this.setLoading(false);
    }
  }

  render() {
    const photos = this.media.filter(item => !this.isVideoType(item.image_url));
    const videos = this.media.filter(item => this.isVideoType(item.image_url));

    this.container.innerHTML = `
      <div class="image-manager">
        <!-- Секция фото -->
        <div class="photo-section mb-6">
          <div class="image-manager-header flex items-center justify-between mb-3">
            <span class="text-sm font-medium">Медиа товара (Фото и Видео)</span>
            <div class="flex gap-2">
              <button type="button" id="addUrlPhoto" class="text-sm px-2 py-1 rounded-lg border hover:bg-slate-50">+ URL</button>
              <label for="photoInput" class="text-sm px-2 py-1 rounded-lg border hover:bg-slate-50 cursor-pointer">+ Загрузить</label>
              <input type="file" id="photoInput" multiple accept="image/jpeg,image/jpg,image/png,image/webp,image/gif" class="hidden">
              ${photos.length > 0 ? '<button type="button" id="previewPhotosBtn" class="text-sm px-2 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Предпросмотр</button>' : ''}
            </div>
          </div>

          ${this.isLoading && !this.showPreview ? this.renderLoading() : ''}
          
          <div class="photos-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
            ${photos.map((item, index) => this.renderMediaCard(item, this.media.indexOf(item))).join('')}
          </div>

          <div id="photoUrlInputSection" class="hidden mb-3">
            <div class="flex gap-2">
              <input type="url" id="photoUrlInput" placeholder="https://example.com/photo.jpg" class="flex-1 px-3 py-2 rounded-lg border text-sm">
              <button type="button" id="addPhotoUrlBtn" class="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">Добавить</button>
              <button type="button" id="cancelPhotoUrlBtn" class="px-3 py-2 rounded-lg border text-sm">Отмена</button>
            </div>
          </div>

          <div class="text-xs text-slate-500 mb-3">
            Фото: JPG, PNG, WebP, GIF | Макс. размер: 10MB
          </div>
        </div>

        <!-- Секция видео -->
        <div class="video-section mb-6">
          <div class="image-manager-header flex items-center justify-between mb-3">
            <span class="text-sm font-medium">Видео (URL)</span>
            <div class="flex gap-2">
              <button type="button" id="addUrlVideo" class="text-sm px-2 py-1 rounded-lg border hover:bg-slate-50">+ видео</button>
              <label for="videoInput" class="text-sm px-2 py-1 rounded-lg border hover:bg-slate-50 cursor-pointer">+ Загрузить</label>
              <input type="file" id="videoInput" multiple accept="video/mp4,video/mov,video/avi,video/webm" class="hidden">
              ${videos.length > 0 ? '<button type="button" id="previewVideosBtn" class="text-sm px-2 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Предпросмотр</button>' : ''}
            </div>
          </div>
          
          <div class="videos-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
            ${videos.map((item, index) => this.renderMediaCard(item, this.media.indexOf(item))).join('')}
          </div>

          <div id="videoUrlInputSection" class="hidden mb-3">
            <div class="flex gap-2">
              <input type="url" id="videoUrlInput" placeholder="https://example.com/video.mp4" class="flex-1 px-3 py-2 rounded-lg border text-sm">
              <button type="button" id="addVideoUrlBtn" class="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">Добавить</button>
              <button type="button" id="cancelVideoUrlBtn" class="px-3 py-2 rounded-lg border text-sm">Отмена</button>
            </div>
          </div>

          <div class="text-xs text-slate-500">
            Видео: MP4, MOV, AVI, WebM | Макс. размер: 10MB
          </div>
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

  renderMediaCard(media, index) {
    const isVideo = this.isVideoType(media.image_url);
    
    return `
      <div class="image-card relative group bg-white border rounded-lg overflow-hidden cursor-pointer" 
           data-image-id="${media.id}" data-media-index="${index}">
        <div class="aspect-square relative">
          ${isVideo ? `
            <video class="w-full h-full object-cover" muted>
              <source src="${media.image_url}" type="video/mp4">
            </video>
            <div class="absolute inset-0 flex items-center justify-center bg-black/20">
              <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path>
              </svg>
            </div>
          ` : `
            <img src="${media.image_url}" alt="Product media" class="w-full h-full object-cover">
          `}
          ${media.is_primary ? '<div class="absolute top-1 left-1 bg-green-500 text-white text-xs px-1 rounded">Главное</div>' : ''}
        </div>
        
        <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div class="flex gap-1">
            <button class="preview-btn p-1 bg-white rounded hover:bg-slate-100" title="Предпросмотр">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
            </button>
            
            ${!media.is_primary ? `<button class="set-primary-btn p-1 bg-white rounded hover:bg-slate-100" title="Сделать главным">
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

  renderPreviewModal() {
    if (!this.showPreview || !this.media.length) return '';

    let filteredMedia = this.media;
    let currentFilteredIndex = this.currentPreviewIndex;
    
    if (this.currentPreviewType === 'photo') {
      filteredMedia = this.media.filter(item => !this.isVideoType(item.image_url));
      const currentMedia = this.media[this.currentPreviewIndex];
      currentFilteredIndex = filteredMedia.indexOf(currentMedia);
    } else if (this.currentPreviewType === 'video') {
      filteredMedia = this.media.filter(item => this.isVideoType(item.image_url));
      const currentMedia = this.media[this.currentPreviewIndex];
      currentFilteredIndex = filteredMedia.indexOf(currentMedia);
    }

    const currentMedia = this.media[this.currentPreviewIndex];
    const isVideo = this.isVideoType(currentMedia.image_url);

    return `
      <div id="mediaPreviewModal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" style="z-index: 9999;">
        <div class="relative max-w-4xl max-h-[90vh] mx-4">
          <button id="closePreview" class="absolute -top-10 right-0 text-white text-2xl hover:text-gray-300">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
          
          <div id="previewStage" class="relative bg-black rounded-lg overflow-hidden">
            ${isVideo ? `
              <video class="max-w-full max-h-[80vh] object-contain" controls autoplay muted>
                <source src="${currentMedia.image_url}" type="video/mp4">
                Your browser does not support video playback.
              </video>
            ` : `
              <img src="${currentMedia.image_url}" alt="Preview" class="max-w-full max-h-[80vh] object-contain" loading="eager">
            `}
          </div>

          ${filteredMedia.length > 1 ? `
            <button id="prevMedia" class="absolute left-2 top-1/2 transform -translate-y-1/2 text-white text-3xl hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-2">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
              </svg>
            </button>
            <button id="nextMedia" class="absolute right-2 top-1/2 transform -translate-y-1/2 text-white text-3xl hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-2">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
          ` : ''}

          <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-center">
            <div class="bg-black bg-opacity-50 px-3 py-1 rounded mb-2">
              ${currentFilteredIndex + 1} / ${filteredMedia.length}
              ${this.currentPreviewType !== 'all' ? ` (${this.currentPreviewType === 'photo' ? 'Фото' : 'Видео'})` : ''}
            </div>
            <button id="loadFromDb" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors duration-200">
              <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
              Загрузить из БД
            </button>
          </div>
        </div>
      </div>
    `;
  }

  isVideoType(url) {
    return /\.(mp4|mov|avi|webm)(\?|$)/i.test(url) || url.includes('video/');
  }

  attachEvents() {
    // Загрузка фото
    const photoInput = this.container.querySelector('#photoInput');
    photoInput?.addEventListener('change', (e) => this.handleFileUpload(e, 'photo'));

    // Загрузка видео
    const videoInput = this.container.querySelector('#videoInput');
    videoInput?.addEventListener('change', (e) => this.handleFileUpload(e, 'video'));

    // URL добавление фото
    const addPhotoUrlBtn = this.container.querySelector('#addUrlPhoto');
    addPhotoUrlBtn?.addEventListener('click', () => this.showUrlInput('photo'));

    const addPhotoUrlBtnConfirm = this.container.querySelector('#addPhotoUrlBtn');
    addPhotoUrlBtnConfirm?.addEventListener('click', () => this.addUrlMedia('photo'));

    const cancelPhotoUrlBtn = this.container.querySelector('#cancelPhotoUrlBtn');
    cancelPhotoUrlBtn?.addEventListener('click', () => this.hideUrlInput('photo'));

    // URL добавление видео
    const addVideoUrlBtn = this.container.querySelector('#addUrlVideo');
    addVideoUrlBtn?.addEventListener('click', () => this.showUrlInput('video'));

    const addVideoUrlBtnConfirm = this.container.querySelector('#addVideoUrlBtn');
    addVideoUrlBtnConfirm?.addEventListener('click', () => this.addUrlMedia('video'));

    const cancelVideoUrlBtn = this.container.querySelector('#cancelVideoUrlBtn');
    cancelVideoUrlBtn?.addEventListener('click', () => this.hideUrlInput('video'));

    // Кнопки предпросмотра
    const previewPhotosBtn = this.container.querySelector('#previewPhotosBtn');
    previewPhotosBtn?.addEventListener('click', () => this.openPreview(0, 'photo'));

    const previewVideosBtn = this.container.querySelector('#previewVideosBtn');
    previewVideosBtn?.addEventListener('click', () => this.openPreview(0, 'video'));

    // Обработка кнопок на карточках медиа
    this.container.addEventListener('click', (e) => {
      const mediaCard = e.target.closest('.image-card');
      if (!mediaCard) return;

      const mediaId = mediaCard.dataset.imageId;
      const mediaIndex = parseInt(mediaCard.dataset.mediaIndex);

      if (e.target.closest('.preview-btn')) {
        this.openPreview(mediaIndex);
      } else if (e.target.closest('.set-primary-btn')) {
        this.setPrimaryImage(mediaId);
      } else if (e.target.closest('.delete-btn')) {
        this.deleteImage(mediaId);
      }
    });

    // Обработчики модального окна предпросмотра
    this.attachPreviewEvents();
  }

  attachPreviewEvents() {
    // Используем setTimeout чтобы убедиться, что DOM элементы существуют
    setTimeout(() => {
      // Закрытие предпросмотра
      const closeBtn = document.getElementById('closePreview');
      closeBtn?.addEventListener('click', () => this.closePreview());

      // Навигация по медиа
      const prevBtn = document.getElementById('prevMedia');
      const nextBtn = document.getElementById('nextMedia');
      
      prevBtn?.addEventListener('click', () => this.navigatePreview(-1));
      nextBtn?.addEventListener('click', () => this.navigatePreview(1));

      // Загрузка из БД
      const loadFromDbBtn = document.getElementById('loadFromDb');
      loadFromDbBtn?.addEventListener('click', () => this.loadFromDatabase());

      // Закрытие по клику на фон
      const modal = document.getElementById('mediaPreviewModal');
      modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closePreview();
        }
      });

      // Закрытие по ESC
      const escHandler = (e) => {
        if (e.key === 'Escape') {
          this.closePreview();
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);
    }, 100);
  }

  openPreview(index, mediaType = 'all') {
    let filteredMedia = this.media;
    
    if (mediaType === 'photo') {
      filteredMedia = this.media.filter(item => !this.isVideoType(item.image_url));
    } else if (mediaType === 'video') {
      filteredMedia = this.media.filter(item => this.isVideoType(item.image_url));
    }
    
    if (!filteredMedia.length) return;
    
    // Находим индекс в полном массиве медиа
    const actualIndex = mediaType === 'all' ? index : this.media.indexOf(filteredMedia[index]);
    this.currentPreviewIndex = actualIndex;
    this.currentPreviewType = mediaType;
    this.showPreview = true;
    
    // Отключаем прокрутку фона и добавляем класс для предотвращения скроллинга
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
    
    // Обновляем только предпросмотр, не весь компонент
    this.updatePreviewModal();
  }

  closePreview() {
    this.showPreview = false;
    this.currentPreviewType = 'all'; // Сбрасываем тип предпросмотра
    // Восстанавливаем прокрутку фона
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
    
    // Удаляем только модальное окно
    const modal = document.getElementById('mediaPreviewModal');
    if (modal) {
      modal.remove();
    }
  }

  navigatePreview(direction) {
    let filteredMedia = this.media;
    
    if (this.currentPreviewType === 'photo') {
      filteredMedia = this.media.filter(item => !this.isVideoType(item.image_url));
    } else if (this.currentPreviewType === 'video') {
      filteredMedia = this.media.filter(item => this.isVideoType(item.image_url));
    }
    
    if (!filteredMedia.length) return;
    
    // Находим текущий индекс в отфильтрованном массиве
    const currentMediaItem = this.media[this.currentPreviewIndex];
    let currentFilteredIndex = filteredMedia.indexOf(currentMediaItem);
    if (currentFilteredIndex < 0) currentFilteredIndex = 0;
    
    // Переходим к следующему/предыдущему
    currentFilteredIndex += direction;
    
    if (currentFilteredIndex < 0) {
      currentFilteredIndex = filteredMedia.length - 1;
    } else if (currentFilteredIndex >= filteredMedia.length) {
      currentFilteredIndex = 0;
    }
    
    // Находим индекс в полном массиве
    this.currentPreviewIndex = this.media.indexOf(filteredMedia[currentFilteredIndex]);
    
    // Обновляем только содержимое модального окна
    this.updatePreviewContent();
  }

  async handleFileUpload(event, mediaType = 'all') {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    // Фильтруем файлы по типу
    let acceptedTypes = [];
    if (mediaType === 'photo') {
      acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    } else if (mediaType === 'video') {
      acceptedTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/webm'];
    } else {
      acceptedTypes = this.options.acceptedTypes;
    }

    // Проверяем типы файлов
    const invalidFiles = files.filter(file => !acceptedTypes.includes(file.type));
    if (invalidFiles.length) {
      this.showNotification(`Неподдерживаемые форматы файлов: ${invalidFiles.map(f => f.name).join(', ')}`, 'error');
      return;
    }

    // Проверяем лимит файлов
    if (this.media.length + files.length > this.options.maxFiles) {
      this.showNotification(`Максимум ${this.options.maxFiles} медиафайлов`, 'error');
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

  showUrlInput(mediaType = 'photo') {
    const sectionId = mediaType === 'photo' ? '#photoUrlInputSection' : '#videoUrlInputSection';
    const inputId = mediaType === 'photo' ? '#photoUrlInput' : '#videoUrlInput';
    
    const urlSection = this.container.querySelector(sectionId);
    urlSection?.classList.remove('hidden');
    const urlInput = this.container.querySelector(inputId);
    urlInput?.focus();
  }

  hideUrlInput(mediaType = 'photo') {
    const sectionId = mediaType === 'photo' ? '#photoUrlInputSection' : '#videoUrlInputSection';
    const inputId = mediaType === 'photo' ? '#photoUrlInput' : '#videoUrlInput';
    
    const urlSection = this.container.querySelector(sectionId);
    urlSection?.classList.add('hidden');
    const urlInput = this.container.querySelector(inputId);
    if (urlInput) urlInput.value = '';
  }

  async addUrlMedia(mediaType = 'photo') {
    const inputId = mediaType === 'photo' ? '#photoUrlInput' : '#videoUrlInput';
    const urlInput = this.container.querySelector(inputId);
    const url = urlInput?.value.trim();
    
    if (!url) {
      this.showNotification('Введите URL медиафайла', 'error');
      return;
    }

    if (!this.isValidMediaUrl(url, mediaType)) {
      this.showNotification(`Некорректный URL ${mediaType === 'photo' ? 'изображения' : 'видео'}`, 'error');
      return;
    }

    // Добавляем URL как медиафайл (имитируем запись в БД)
    const newMedia = {
      id: 'url_' + Date.now(),
      product_id: this.productId,
      image_url: url,
      storage_path: null,
      is_primary: this.media.length === 0,
      isUrlImage: true
    };

    this.media.push(newMedia);
    
    // Обновляем компонент только если не открыт предпросмотр
    if (!this.showPreview) {
      this.render();
      this.attachEvents();
    }
    
    this.hideUrlInput(mediaType);
    this.showNotification(`URL ${mediaType === 'photo' ? 'изображение' : 'видео'} добавлено`, 'success');
  }

  isValidMediaUrl(url, mediaType = 'all') {
    try {
      new URL(url);
      if (mediaType === 'photo') {
        return /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);
      } else if (mediaType === 'video') {
        return /\.(mp4|mov|avi|webm)(\?|$)/i.test(url) || url.includes('video/');
      } else {
        return /\.(jpg|jpeg|png|webp|gif|mp4|mov|avi|webm)(\?|$)/i.test(url);
      }
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

      // Если это URL медиафайл, удаляем локально
      if (imageId.startsWith('url_')) {
        this.media = this.media.filter(item => item.id !== imageId);
        
        // Обновляем только если не открыт предпросмотр
        if (!this.showPreview) {
          this.render();
          this.attachEvents();
        }
        
        this.showNotification('Медиафайл удален', 'success');
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
    
    // Не показываем состояние загрузки если открыт preview
    if (this.showPreview) return;
    
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

  // Метод для получения всех медиафайлов (включая URL)
  getAllImages() {
    return this.media.map(item => ({
      id: item.id,
      url: item.image_url,
      is_primary: item.is_primary,
      isUrlImage: item.isUrlImage || false,
      isVideo: this.isVideoType(item.image_url)
    }));
  }

  // Метод для установки медиафайлов при загрузке товара
  setImages(media) {
    this.media = media || [];
    
    // Обновляем только если не открыт предпросмотр
    if (!this.showPreview) {
      this.render();
      this.attachEvents();
    }
  }

  // Метод для создания и отображения модального окна предпросмотра
  updatePreviewModal() {
    // Удаляем существующее модальное окно если есть
    const existingModal = document.getElementById('mediaPreviewModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Создаем новое модальное окно
    const modalHtml = this.renderPreviewModal();
    if (modalHtml) {
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      this.attachPreviewEvents();
    }
  }

  // Метод для обновления только содержимого модального окна
  updatePreviewContent() {
    const modal = document.getElementById('mediaPreviewModal');
    if (!modal || !this.showPreview) return;

    let filteredMedia = this.media;
    let currentFilteredIndex = this.currentPreviewIndex;
    
    if (this.currentPreviewType === 'photo') {
      filteredMedia = this.media.filter(item => !this.isVideoType(item.image_url));
      const currentMedia = this.media[this.currentPreviewIndex];
      currentFilteredIndex = filteredMedia.indexOf(currentMedia);
    } else if (this.currentPreviewType === 'video') {
      filteredMedia = this.media.filter(item => this.isVideoType(item.image_url));
      const currentMedia = this.media[this.currentPreviewIndex];
      currentFilteredIndex = filteredMedia.indexOf(currentMedia);
    }

    const currentMedia = this.media[this.currentPreviewIndex];
    const isVideo = this.isVideoType(currentMedia.image_url);

    // Обновляем содержимое медиа
    const mediaContainer = document.getElementById('previewStage');
    if (mediaContainer) {
      mediaContainer.innerHTML = isVideo ? `
        <video class="max-w-full max-h-[80vh] object-contain" controls autoplay muted>
          <source src="${currentMedia.image_url}" type="video/mp4">
          Your browser does not support video playback.
        </video>
      ` : `
        <img src="${currentMedia.image_url}" alt="Preview" class="max-w-full max-h-[80vh] object-contain" loading="eager">
      `;
    }

    // Обновляем счетчик
    const counter = modal.querySelector('.absolute.bottom-4 .bg-black.bg-opacity-50');
    if (counter) {
      counter.innerHTML = `
        ${currentFilteredIndex + 1} / ${filteredMedia.length}
        ${this.currentPreviewType !== 'all' ? ` (${this.currentPreviewType === 'photo' ? 'Фото' : 'Видео'})` : ''}
      `;
    }
  }

  // Метод для загрузки фото из БД
  async loadFromDatabase() {
    if (!this.productId) {
      this.showNotification('Не выбран товар', 'error');
      return;
    }

    try {
      this.setLoading(true);

      // Загружаем все медиа для товара из БД
      const { data, error } = await this.supabase.functions.invoke('media-manager', {
        body: {
          action: 'list_images',
          product_id: this.productId
        }
      });

      if (error) throw error;

      // Фильтруем новые медиа (которых еще нет в текущем списке)
      const existingUrls = this.media.map(item => item.image_url);
      const newMedia = data.filter(item => !existingUrls.includes(item.image_url));

      if (newMedia.length === 0) {
        this.showNotification('Все медиа из БД уже загружены', 'info');
        return;
      }

      // Добавляем новые медиа к существующему списку
      this.media = [...this.media, ...newMedia];

      // Обновляем содержимое предпросмотра если он открыт
      if (this.showPreview) {
        this.updatePreviewContent();
      } else {
        this.render();
        this.attachEvents();
      }

      this.showNotification(`Загружено ${newMedia.length} медиафайлов из БД`, 'success');

    } catch (error) {
      console.error('Load from DB error:', error);
      this.showNotification('Ошибка загрузки из БД', 'error');
    } finally {
      this.setLoading(false);
    }
  }
}
import { supabase } from './supabase.js';

// Маппинг размеров в папки
const SIZE_FOLDER_MAPPING = {
  'small': 'small with bow',
  'medium': 'medium with bow', 
  'big': 'big with bow'
};

// Маппинг цветов в папки
const COLOR_FOLDER_MAPPING = {
  '#FFB6C1': 'pink',
  '#1a1a1a': 'black',
  '#FFFFFF': 'white', 
  '#FFD700': 'gold',
  '#C0C0C0': 'silver',
  '#FF0000': 'red',
  '#FFA500': 'orange',
  '#FFCBA4': 'peach',
  '#B0E0E6': 'blue ice',
  '#003366': 'blue velvet',
  '#0ABAB5': 'tiffany',
  '#F3E5AB': 'vanilla',
  '#F8F8FF': 'white diamond',
  '#2F2F2F': 'black moire',
  '#E6E6FA': 'lavender',
  '#DDA0DD': 'lilac'
};

export const StorageHelper = {
  /**
   * Создает структуру папок для товара
   * @param {string} size - размер товара (small, medium, big)
   * @param {string} colorHex - hex код цвета
   * @returns {Promise<string>} - путь к созданной папке
   */
  async createFolderStructure(size, colorHex) {
    try {
      const response = await supabase.functions.invoke('storage-manager', {
        body: { 
          action: 'create_folder_structure', 
          size, 
          colorHex 
        }
      });

      if (response.error) throw response.error;
      return response.data.folderPath;
    } catch (error) {
      console.error('Error creating folder structure:', error);
      throw error;
    }
  },

  /**
   * Получает организованный путь для файла
   * @param {string} size - размер товара
   * @param {string} colorHex - hex код цвета
   * @param {string} fileName - имя файла
   * @returns {Promise<string>} - организованный путь
   */
  async getOrganizedPath(size, colorHex, fileName) {
    try {
      const response = await supabase.functions.invoke('storage-manager', {
        body: { 
          action: 'get_organized_path', 
          size, 
          colorHex, 
          fileName 
        }
      });

      if (response.error) throw response.error;
      return response.data.path;
    } catch (error) {
      console.error('Error getting organized path:', error);
      throw error;
    }
  },

  /**
   * Перемещает файл в организованную структуру папок
   * @param {string} oldPath - старый путь файла
   * @param {string} newPath - новый путь файла
   * @returns {Promise<boolean>} - успех операции
   */
  async moveFile(oldPath, newPath) {
    try {
      const response = await supabase.functions.invoke('storage-manager', {
        body: { 
          action: 'move_file', 
          oldPath, 
          newPath 
        }
      });

      if (response.error) throw response.error;
      return response.data.success;
    } catch (error) {
      console.error('Error moving file:', error);
      throw error;
    }
  },

  /**
   * Удаляет пустые папки
   * @param {string} size - размер товара
   * @param {string} colorHex - hex код цвета
   * @returns {Promise<boolean>} - успех операции
   */
  async deleteEmptyFolders(size, colorHex) {
    try {
      const response = await supabase.functions.invoke('storage-manager', {
        body: { 
          action: 'delete_empty_folders', 
          size, 
          colorHex 
        }
      });

      if (response.error) throw response.error;
      return response.data.success;
    } catch (error) {
      console.error('Error deleting empty folders:', error);
      // Не бросаем ошибку, так как это не критично
      return false;
    }
  },

  /**
   * Получает структуру папок в Storage
   * @returns {Promise<Object>} - структура папок
   */
  async getFolderStructure() {
    try {
      const response = await supabase.functions.invoke('storage-manager', {
        body: { action: 'list_folder_structure' }
      });

      if (response.error) throw response.error;
      return response.data.structure;
    } catch (error) {
      console.error('Error getting folder structure:', error);
      throw error;
    }
  },

  /**
   * Загружает файл в организованную структуру папок
   * @param {File} file - файл для загрузки
   * @param {string} size - размер товара
   * @param {string} colorHex - hex код цвета
   * @returns {Promise<string>} - путь к загруженному файлу
   */
  async uploadOrganizedFile(file, size, colorHex) {
    try {
      // Сначала создаем структуру папок
      await this.createFolderStructure(size, colorHex);

      // Генерируем имя файла
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      // Получаем организованный путь
      const organizedPath = await this.getOrganizedPath(size, colorHex, fileName);

      // Загружаем файл
      const { data, error } = await supabase.storage
        .from('product-media')
        .upload(organizedPath, file);

      if (error) throw error;
      return organizedPath;

    } catch (error) {
      console.error('Error uploading organized file:', error);
      throw error;
    }
  },

  /**
   * Загружает файл в организованную структуру папок с категорией
   * @param {File} file - файл для загрузки
   * @param {Object} category - объект категории
   * @param {string} size - размер товара
   * @param {string} colorHex - hex код цвета
   * @returns {Promise<string>} - путь к загруженному файлу
   */
  async uploadOrganizedFileWithCategory(file, category, size, colorHex) {
    try {
      // Генерируем имя файла
      const fileExt = file.name.split('.').pop();
      const fileName = `slide${Date.now()}.${fileExt}`;
      
      // Создаем путь на основе категории
      const sizeFolder = this.getSizeFolder(size);
      const colorFolder = this.getColorFolder(colorHex);
      const organizedPath = `images/${sizeFolder}/${colorFolder}/${fileName}`;

      // Загружаем файл
      const { data, error } = await supabase.storage
        .from('product-media')
        .upload(organizedPath, file);

      if (error) throw error;
      return organizedPath;

    } catch (error) {
      console.error('Error uploading organized file with category:', error);
      throw error;
    }
  },

  /**
   * Получает название папки размера
   * @param {string} size - размер товара
   * @returns {string} - название папки
   */
  getSizeFolder(size) {
    return SIZE_FOLDER_MAPPING[size] || 'unknown';
  },

  /**
   * Получает название папки цвета
   * @param {string} colorHex - hex код цвета
   * @returns {string} - название папки
   */
  getColorFolder(colorHex) {
    return COLOR_FOLDER_MAPPING[colorHex] || 'unknown';
  },

  /**
   * Проверяет, находится ли файл в правильной структуре папок
   * @param {string} filePath - путь к файлу
   * @param {string} size - размер товара
   * @param {string} colorHex - hex код цвета
   * @returns {boolean} - true если файл в правильном месте
   */
  isFileInCorrectLocation(filePath, size, colorHex) {
    const expectedSizeFolder = this.getSizeFolder(size);
    const expectedColorFolder = this.getColorFolder(colorHex);
    const expectedPath = `images/${expectedSizeFolder}/${expectedColorFolder}`;
    
    return filePath.startsWith(expectedPath);
  },

  /**
   * Реорганизует существующие файлы товара
   * @param {Array} photos - массив путей к фото
   * @param {string} size - размер товара
   * @param {string} colorHex - hex код цвета
   * @returns {Promise<Array>} - новые пути к фото
   */
  async reorganizeProductFiles(photos, size, colorHex) {
    const reorganizedPhotos = [];

    for (const photo of photos) {
      try {
        if (!this.isFileInCorrectLocation(photo, size, colorHex)) {
          // Получаем имя файла
          const fileName = photo.split('/').pop();
          const newPath = await this.getOrganizedPath(size, colorHex, fileName);
          
          // Перемещаем файл
          await this.moveFile(photo, newPath);
          reorganizedPhotos.push(newPath);
        } else {
          // Файл уже в правильном месте
          reorganizedPhotos.push(photo);
        }
      } catch (error) {
        console.error(`Error reorganizing file ${photo}:`, error);
        // Оставляем старый путь если не удалось переместить
        reorganizedPhotos.push(photo);
      }
    }

    return reorganizedPhotos;
  }
};
import { supabase } from '../utils/supabase.js';

/**
 * Компонент управления цветами
 */
export class AdminColorsComponent {
  constructor() {
    this.colors = [];
    this.isLoading = false;
  }

  async mount(container) {
    container.innerHTML = this.getLoadingHTML();
    await this.loadColors();
    container.innerHTML = this.getHTML();
    this.attachEvents();
  }

  getLoadingHTML() {
    return `
      <div class="flex items-center justify-center py-12">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p class="text-slate-600">Загрузка цветов...</p>
        </div>
      </div>
    `;
  }

  getHTML() {
    return `
      <div class="space-y-4">
        <div class="flex justify-between items-center">
          <h2 class="text-2xl font-bold text-slate-900">Управление цветами</h2>
          <button id="btnAddColor" class="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition">
            + Добавить цвет
          </button>
        </div>

        ${this.colors.length === 0 ? this.getEmptyState() : this.getColorsGrid()}
      </div>

      <!-- Modal placeholder -->
      <div id="colorModalContainer"></div>
    `;
  }

  getEmptyState() {
    return `
      <div class="bg-white rounded-xl border p-12 text-center">
        <p class="text-slate-600 mb-4">Цвета не найдены</p>
        <button onclick="document.getElementById('btnAddColor').click()" 
                class="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
          Создать первый цвет
        </button>
      </div>
    `;
  }

  getColorsGrid() {
    return `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        ${this.colors.map(color => this.getColorCard(color)).join('')}
      </div>
    `;
  }

  getColorCard(color) {
    return `
      <div class="bg-white rounded-xl border p-4 hover:shadow-lg transition">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-12 h-12 rounded-full border-2 border-slate-200" 
               style="background-color: ${color.hex_code}"></div>
          <div class="flex-1">
            <h3 class="font-semibold text-slate-900">${color.name}</h3>
            ${color.russian_name ? `<p class="text-xs text-slate-500">${color.russian_name}</p>` : ''}
          </div>
        </div>
        
        <div class="text-xs text-slate-600 mb-3 font-mono">${color.hex_code}</div>

        <div class="flex items-center justify-between mb-3">
          <span class="text-xs text-slate-500">Порядок: ${color.sort_order}</span>
          <span class="px-2 py-1 rounded-full text-xs font-medium ${
            color.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
          }">
            ${color.is_active ? 'Активен' : 'Неактивен'}
          </span>
        </div>

        <div class="flex gap-2">
          <button onclick="adminColors.editColor('${color.id}')" 
                  class="flex-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm transition">
            Изменить
          </button>
          <button onclick="adminColors.toggleActive('${color.id}')" 
                  class="px-3 py-1.5 rounded-lg ${
                    color.is_active ? 'bg-orange-100 hover:bg-orange-200 text-orange-700' : 'bg-green-100 hover:bg-green-200 text-green-700'
                  } text-sm transition">
            ${color.is_active ? '👁️‍🗨️' : '👁️'}
          </button>
        </div>
      </div>
    `;
  }

  attachEvents() {
    const addBtn = document.getElementById('btnAddColor');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.showModal());
    }

    // Сохраняем глобальную ссылку
    window.adminColors = this;
  }

  async loadColors() {
    this.isLoading = true;
    
    try {
      const { data, error } = await supabase
        .from('colors')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      this.colors = data || [];
    } catch (error) {
      console.error('Error loading colors:', error);
      alert('Ошибка загрузки цветов');
    } finally {
      this.isLoading = false;
    }
  }

  showModal(color = null) {
    const isEdit = !!color;
    
    const modalHTML = `
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" 
           onclick="if(event.target === this) adminColors.closeModal()">
        <div class="bg-white rounded-2xl max-w-md w-full p-6">
          <h3 class="text-xl font-bold mb-4">${isEdit ? 'Редактировать цвет' : 'Новый цвет'}</h3>
          
          <form id="colorForm" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Название (English) *</label>
              <input type="text" name="name" value="${color?.name || ''}" required 
                     class="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none" 
                     placeholder="Red">
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Название (Русский)</label>
              <input type="text" name="russian_name" value="${color?.russian_name || ''}" 
                     class="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none" 
                     placeholder="Красный">
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Цвет (HEX) *</label>
              <div class="flex gap-2">
                <input type="color" name="hex_code_picker" value="${color?.hex_code || '#000000'}" 
                       class="w-16 h-10 rounded-lg border cursor-pointer"
                       onchange="document.getElementsByName('hex_code')[0].value = this.value">
                <input type="text" name="hex_code" value="${color?.hex_code || '#000000'}" required 
                       pattern="^#[0-9A-Fa-f]{6}$"
                       class="flex-1 px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none font-mono" 
                       placeholder="#FF0000"
                       oninput="if(/^#[0-9A-Fa-f]{6}$/.test(this.value)) document.getElementsByName('hex_code_picker')[0].value = this.value">
              </div>
              <p class="text-xs text-slate-500 mt-1">Формат: #RRGGBB</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Порядок сортировки</label>
              <input type="number" name="sort_order" value="${color?.sort_order || 0}" 
                     class="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none">
            </div>

            <div>
              <label class="flex items-center gap-2">
                <input type="checkbox" name="is_active" ${color?.is_active !== false ? 'checked' : ''} 
                       class="rounded">
                <span class="text-sm font-medium text-slate-700">Активен</span>
              </label>
            </div>

            <div class="flex gap-2 pt-4">
              <button type="button" onclick="adminColors.closeModal()" 
                      class="flex-1 px-4 py-2 rounded-lg border hover:bg-slate-50 transition">
                Отмена
              </button>
              <button type="submit" 
                      class="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition">
                ${isEdit ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    const modalContainer = document.getElementById('colorModalContainer');
    if (modalContainer) {
      modalContainer.innerHTML = modalHTML;
      
      const form = document.getElementById('colorForm');
      if (form) {
        form.addEventListener('submit', (e) => this.handleSubmit(e, color?.id));
      }
    }
  }

  closeModal() {
    const modalContainer = document.getElementById('colorModalContainer');
    if (modalContainer) {
      modalContainer.innerHTML = '';
    }
  }

  async handleSubmit(e, colorId = null) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const colorData = {
      name: formData.get('name').trim(),
      russian_name: formData.get('russian_name')?.trim() || null,
      hex_code: formData.get('hex_code').trim().toUpperCase(),
      sort_order: parseInt(formData.get('sort_order')) || 0,
      is_active: formData.get('is_active') === 'on'
    };

    // Валидация HEX
    if (!/^#[0-9A-F]{6}$/.test(colorData.hex_code)) {
      alert('Неверный формат HEX цвета');
      return;
    }

    try {
      if (colorId) {
        // Обновление
        const { error } = await supabase
          .from('colors')
          .update(colorData)
          .eq('id', colorId);

        if (error) throw error;
        alert('Цвет обновлен');
      } else {
        // Создание
        const { error } = await supabase
          .from('colors')
          .insert([colorData]);

        if (error) throw error;
        alert('Цвет создан');
      }

      this.closeModal();
      await this.refresh();
    } catch (error) {
      console.error('Error saving color:', error);
      alert('Ошибка сохранения цвета: ' + error.message);
    }
  }

  async editColor(colorId) {
    const color = this.colors.find(c => c.id === colorId);
    if (color) {
      this.showModal(color);
    }
  }

  async toggleActive(colorId) {
    const color = this.colors.find(c => c.id === colorId);
    if (!color) return;

    try {
      const { error } = await supabase
        .from('colors')
        .update({ is_active: !color.is_active })
        .eq('id', colorId);

      if (error) throw error;

      await this.refresh();
    } catch (error) {
      console.error('Error toggling color:', error);
      alert('Ошибка изменения статуса');
    }
  }

  async refresh() {
    const container = document.getElementById('adminContent');
    if (container) {
      await this.mount(container);
    }
  }

  destroy() {
    // Очистка
    window.adminColors = null;
  }
}

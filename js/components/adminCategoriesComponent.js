import { supabase } from '../utils/supabase.js';

/**
 * Компонент управления категориями
 */
export class AdminCategoriesComponent {
  constructor() {
    this.categories = [];
    this.isLoading = false;
  }

  async mount(container) {
    container.innerHTML = this.getLoadingHTML();
    await this.loadCategories();
    container.innerHTML = this.getHTML();
    this.attachEvents();
  }

  getLoadingHTML() {
    return `
      <div class="flex items-center justify-center py-12">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p class="text-slate-600">Загрузка категорий...</p>
        </div>
      </div>
    `;
  }

  getHTML() {
    return `
      <div class="space-y-4">
        <div class="flex justify-between items-center">
          <h2 class="text-2xl font-bold text-slate-900">Управление категориями</h2>
          <button id="btnAddCategory" class="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition">
            + Добавить категорию
          </button>
        </div>

        ${this.categories.length === 0 ? this.getEmptyState() : this.getCategoriesGrid()}
      </div>

      <!-- Modal placeholder -->
      <div id="categoryModalContainer"></div>
    `;
  }

  getEmptyState() {
    return `
      <div class="bg-white rounded-xl border p-12 text-center">
        <p class="text-slate-600 mb-4">Категории не найдены</p>
        <button onclick="document.getElementById('btnAddCategory').click()" 
                class="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
          Создать первую категорию
        </button>
      </div>
    `;
  }

  getCategoriesGrid() {
    return `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${this.categories.map(category => this.getCategoryCard(category)).join('')}
      </div>
    `;
  }

  getCategoryCard(category) {
    return `
      <div class="bg-white rounded-xl border p-4 hover:shadow-lg transition">
        <div class="flex justify-between items-start mb-3">
          <div>
            <h3 class="font-semibold text-lg text-slate-900">${category.name}</h3>
            <p class="text-sm text-slate-500">Slug: ${category.slug}</p>
          </div>
          <span class="px-2 py-1 rounded-full text-xs font-medium ${
            category.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
          }">
            ${category.is_active ? 'Активна' : 'Неактивна'}
          </span>
        </div>
        
        <div class="text-sm text-slate-600 mb-4">
          Порядок: ${category.sort_order}
        </div>

        <div class="flex gap-2">
          <button onclick="adminCategories.editCategory('${category.id}')" 
                  class="flex-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm transition">
            Изменить
          </button>
          <button onclick="adminCategories.toggleActive('${category.id}')" 
                  class="px-3 py-1.5 rounded-lg ${
                    category.is_active ? 'bg-orange-100 hover:bg-orange-200 text-orange-700' : 'bg-green-100 hover:bg-green-200 text-green-700'
                  } text-sm transition">
            ${category.is_active ? 'Скрыть' : 'Показать'}
          </button>
        </div>
      </div>
    `;
  }

  attachEvents() {
    const addBtn = document.getElementById('btnAddCategory');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.showModal());
    }

    // Сохраняем глобальную ссылку
    window.adminCategories = this;
  }

  async loadCategories() {
    this.isLoading = true;
    
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      this.categories = data || [];
    } catch (error) {
      console.error('Error loading categories:', error);
      alert('Ошибка загрузки категорий');
    } finally {
      this.isLoading = false;
    }
  }

  showModal(category = null) {
    const isEdit = !!category;
    
    const modalHTML = `
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" 
           onclick="if(event.target === this) adminCategories.closeModal()">
        <div class="bg-white rounded-2xl max-w-md w-full p-6">
          <h3 class="text-xl font-bold mb-4">${isEdit ? 'Редактировать категорию' : 'Новая категория'}</h3>
          
          <form id="categoryForm" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Название *</label>
              <input type="text" name="name" value="${category?.name || ''}" required 
                     class="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none" 
                     placeholder="Большая коробка">
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Slug *</label>
              <input type="text" name="slug" value="${category?.slug || ''}" required 
                     class="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none" 
                     placeholder="big-box">
              <p class="text-xs text-slate-500 mt-1">Используется в URL (только латиница, цифры, дефис)</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Порядок сортировки</label>
              <input type="number" name="sort_order" value="${category?.sort_order || 0}" 
                     class="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none">
            </div>

            <div>
              <label class="flex items-center gap-2">
                <input type="checkbox" name="is_active" ${category?.is_active !== false ? 'checked' : ''} 
                       class="rounded">
                <span class="text-sm font-medium text-slate-700">Активна</span>
              </label>
            </div>

            <div class="flex gap-2 pt-4">
              <button type="button" onclick="adminCategories.closeModal()" 
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

    const modalContainer = document.getElementById('categoryModalContainer');
    if (modalContainer) {
      modalContainer.innerHTML = modalHTML;
      
      const form = document.getElementById('categoryForm');
      if (form) {
        form.addEventListener('submit', (e) => this.handleSubmit(e, category?.id));
      }
    }
  }

  closeModal() {
    const modalContainer = document.getElementById('categoryModalContainer');
    if (modalContainer) {
      modalContainer.innerHTML = '';
    }
  }

  async handleSubmit(e, categoryId = null) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const categoryData = {
      name: formData.get('name').trim(),
      slug: formData.get('slug').trim(),
      sort_order: parseInt(formData.get('sort_order')) || 0,
      is_active: formData.get('is_active') === 'on'
    };

    try {
      if (categoryId) {
        // Обновление
        const { error } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', categoryId);

        if (error) throw error;
        alert('Категория обновлена');
      } else {
        // Создание
        const { error } = await supabase
          .from('categories')
          .insert([categoryData]);

        if (error) throw error;
        alert('Категория создана');
      }

      this.closeModal();
      await this.refresh();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Ошибка сохранения категории: ' + error.message);
    }
  }

  async editCategory(categoryId) {
    const category = this.categories.find(c => c.id === categoryId);
    if (category) {
      this.showModal(category);
    }
  }

  async toggleActive(categoryId) {
    const category = this.categories.find(c => c.id === categoryId);
    if (!category) return;

    try {
      const { error } = await supabase
        .from('categories')
        .update({ is_active: !category.is_active })
        .eq('id', categoryId);

      if (error) throw error;

      await this.refresh();
    } catch (error) {
      console.error('Error toggling category:', error);
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
    window.adminCategories = null;
  }
}

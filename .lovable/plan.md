# Simple Category-to-Product Binding — Implementation Plan

## Summary

Single-file update to `js/components/modernAdminComponent.js`. Replace compound `box_type + size → slug` category lookup with direct `category_id` dropdown. Make admin filter dynamic.

## Changes

### 1. `loadMeta()` (lines 468-473) — Load all categories

- Remove `.eq('is_active', true)` filter
- Change select to `'id,name,slug,is_active,sort_order'`
- Keep `.order('sort_order', { ascending: true })`

### 2. End of `loadMeta()` (after line 497) — Populate filter dynamically

After all meta loads, populate `#filterCategory`:

```js
const filterSelect = document.getElementById('filterCategory');
if (filterSelect) {
  const sorted = [...this.categories].sort((a, b) =>
    (a.sort_order ?? 999999) - (b.sort_order ?? 999999) || (a.name || '').localeCompare(b.name || '', 'ru')
  );
  filterSelect.innerHTML = '<option value="">Все категории</option>' +
    sorted.map(c => `<option value="${c.id}">${c.name}${c.is_active ? '' : ' (неактивна)'}</option>`).join('');
}
```

### 3. Filter dropdown HTML (lines 120-126) — Remove hardcoded options

Replace with only placeholder:

```html
<select id="filterCategory" class="flex-1 min-w-[140px] px-3 py-2 rounded-xl border bg-white">
  <option value="">Все категории</option>
</select>
```

### 4. Product form HTML (after line 211) — Add category dropdown

Insert before the box_type label (line 213):

```html
<label class="block">
  <span class="text-sm font-medium">Категория *</span>
  <select name="category_id" required class="mt-1 w-full px-3 py-2 rounded-xl border">
    <option value="">Выберите категорию</option>
  </select>
</label>
```

Keep box_type and size fields unchanged.

### 5. `openProduct()` (lines 704-716) — Populate category dropdown

After existing dropdown population, add:

```js
const categorySelect = form.querySelector('select[name="category_id"]');
const sortedCats = [...this.categories].sort((a, b) =>
  (a.sort_order ?? 999999) - (b.sort_order ?? 999999) || (a.name || '').localeCompare(b.name || '', 'ru')
);
categorySelect.innerHTML = '<option value="">Выберите категорию</option>' +
  sortedCats.map(c => `<option value="${c.id}">${c.name}${c.is_active ? '' : ' (неактивна)'}</option>`).join('');
```

### 6. `openProduct()` edit mode (lines 748-756) — Direct preselection

Replace slug-parsing block with:

```js
if (product.category_id) {
  categorySelect.value = product.category_id;
}
```

### 7. `loadPage()` select query (line 525) — Add `category_id`

Add `category_id` to the select string.

### 8. `loadPage()` filter logic (lines 542-550) — Direct category_id filter

Replace size/name-based filtering:

```js
const categoryFilter = document.getElementById('filterCategory')?.value;
if (categoryFilter) {
  query = query.eq('category_id', categoryFilter);
}
```

### 9. `onSaveProduct()` (lines 848-865) — Direct category_id save

Replace compound slug lookup with:

```js
const categoryId = formData.get('category_id')?.trim();
if (!categoryId) {
  alert('Пожалуйста, выберите категорию');
  return;
}
```

Keep `sizeValue` read for the `size` field. Remove `boxTypeSlug`, `categorySlug`, `category` variables. Change line 898 to `category_id: categoryId`.

## No Changes To

- DB schema / RLS / migrations
- `adminCategoriesComponent.js`
- Public storefront components
- Storage/media logic
- `box_type` and `size` form fields (preserved as-is)

## Verification

1. Create category in admin → appears in product form dropdown
2. Dropdown sorted by `sort_order`
3. Inactive categories marked with `(неактивна)`
4. Select category → save → `category_id` correct
5. Edit product → correct category preselected
6. Filter by category → works via category_id
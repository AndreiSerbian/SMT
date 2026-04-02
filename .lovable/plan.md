

# Box Type + Size as Visible Inputs, Derived category_id

## Summary

Update `js/components/modernAdminComponent.js` to remove the visible "Категория" dropdown, add "На магнитах" to box types, and derive `category_id` automatically from box_type + size on save using an explicit mapping.

## Changes — Single file: `js/components/modernAdminComponent.js`

### 1. Remove visible "Категория" dropdown from form HTML (lines 214-219)

Delete the `<label>` block with `select[name="category_id"]`.

### 2. Add "На магнитах" to box_type dropdown in `openProduct()` (lines 712-716)

After populating from `this.boxTypes`, append if missing:

```js
if (!this.boxTypes.find(t => t.slug === 'magnetic')) {
  boxTypeSelect.innerHTML += '<option value="magnetic">На магнитах</option>';
}
```

### 3. Replace `onSaveProduct()` category logic (lines 858-863)

Derive `category_id` via explicit mapping:

```js
const CATEGORY_SLUG_MAP = {
  'bow-small': 'bow-box-small',
  'bow-medium': 'bow-box-medium',
  'bow-big': 'bow-box-big',
  'handle-small': 'handle-box-small',
  'magnetic-small': 'full-cover-small-box',
};
const mapKey = `${boxType}-${sizeValue}`;
const expectedSlug = CATEGORY_SLUG_MAP[mapKey];
const category = expectedSlug ? this.categories.find(c => c.slug === expectedSlug) : null;
if (!category) {
  alert('Для выбранной комбинации типа коробки и размера не найдена категория');
  return;
}
```

### 4. Remove category dropdown population in `openProduct()` (lines 724-730)

Delete `categorySelect` population block.

### 5. Fix edit mode: derive box_type from category (lines 763-766)

Replace `categorySelect.value` with reverse derivation + safe fallback:

```js
if (product.category_id) {
  const cat = this.categories.find(c => c.id === product.category_id);
  if (cat) {
    const SLUG_TO_BOX_TYPE = {
      'bow-box-small': 'bow', 'bow-box-medium': 'bow', 'bow-box-big': 'bow',
      'handle-box-small': 'handle',
      'full-cover-small-box': 'magnetic',
    };
    const derivedType = SLUG_TO_BOX_TYPE[cat.slug];
    if (derivedType) boxTypeSelect.value = derivedType;
    // If slug not in map — leave box_type empty (safe fallback)
  }
}
sizeSelect.value = product.size || '';
```

### 6. Keep filter dropdown as-is

Dynamic category filter stays — it's a filter, not a form input.

## Critical Rules

- **`category_id` must only be resolved through `CATEGORY_SLUG_MAP` in this task.** Remove all remaining category reconstruction logic based on visible category dropdowns or slug-parsing.
- **Safe fallback in edit mode:** if `product.category_id` exists but slug is not found in `SLUG_TO_BOX_TYPE`, leave `box_type` empty — do not crash the form.

## No Changes To

- DB schema / migrations / RLS / `box_types` table
- `adminCategoriesComponent.js`
- Public storefront / homepage
- Storage/media logic
- `size` field behavior

## Verification

1. Product form → no visible "Категория" dropdown
2. Box type dropdown includes "На магнитах"
3. Save С лентой + Малая → correct `category_id`
4. Save На магнитах + Малая → magnetic category resolved
5. Save На магнитах + Большая → blocked with error
6. Edit existing product → correct box_type and size restored
7. Edit product with unknown category slug → form opens safely, box_type empty
8. Homepage category cards still work


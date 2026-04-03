

# Fix Homepage Grouping to Use category_id

## Problem
Homepage `publicProductsComponent.js` uses hardcoded size + name-based filtering, ignoring `category_id`. Magnetic products fall into "small" card because `size === 'small'` and name doesn't contain "ручк".

## Solution
Replace hardcoded category definitions and `filterProductsByCategory()` with dynamic category-based grouping using `category_id`.

## Changes — Single file: `js/components/publicProductsComponent.js`

### 1. Replace `createCategoryCards()` (lines 69-124)
Instead of hardcoded 4-category array, load categories from DB and group products by `category_id`:

```js
async createCategoryCards() {
  const allProducts = await productsService.getActiveProducts();
  const categories = await productsService.getActiveCategories();
  const colorMap = await this.getColorMap();

  this.cachedCategories = categories;

  return categories.map(category => {
    const categoryProducts = allProducts.filter(p => p.category_id === category.id);
    if (categoryProducts.length === 0) return null;

    const categoryColors = [...new Set(categoryProducts.map(p => p.color_hex))];
    const prices = categoryProducts.map(p => p.price_rub);

    return {
      slug: category.slug,
      name: category.name,
      description: '',
      products: categoryProducts,
      colors: categoryColors,
      colorMap,
      priceRange: { min: Math.min(...prices), max: Math.max(...prices) },
      mainImage: categoryProducts[0]?.photos?.[0] || '',
      totalProducts: categoryProducts.length
    };
  }).filter(Boolean);
}
```

### 2. Replace `filterProductsByCategory()` (lines 129-141)
Filter by `category_id` instead of name/size:

```js
filterProductsByCategory(products, categorySlug) {
  const category = this.cachedCategories?.find(c => c.slug === categorySlug);
  if (category) {
    return products.filter(p => p.category_id === category.id);
  }
  return products;
}
```

### 3. Replace `getProductsByCategory()` (lines 49-64)
Same approach — use `category_id` lookup instead of hardcoded switch:

```js
async getProductsByCategory(categorySlug) {
  const allProducts = await productsService.getActiveProducts();
  if (!this.cachedCategories) {
    this.cachedCategories = await productsService.getActiveCategories();
  }
  const category = this.cachedCategories.find(c => c.slug === categorySlug);
  if (category) {
    return allProducts.filter(p => p.category_id === category.id);
  }
  return allProducts;
}
```

## What stays unchanged
- Product save logic in admin
- `category_id` derivation mapping
- Category admin (`adminCategoriesComponent.js`)
- Storage/media logic
- `productsService.js`

## Important Notes

**Product rendering change:** This fix changes homepage cards from legacy hardcoded size/name buckets to real DB category cards. This is intended and required so products render in the category they are actually assigned to.

**Legacy data note:** Products with `null` `category_id` may disappear from the homepage after this fix. That is acceptable for now, but should be noted as a legacy data cleanup follow-up task.

## Verification
1. Magnetic product appears **only** in magnetic card
2. Bow products remain in bow cards
3. Handle products remain in handle card
4. Categories render in `sort_order`
5. `null` `category_id` products do not break homepage
6. Empty categories (no products) are hidden


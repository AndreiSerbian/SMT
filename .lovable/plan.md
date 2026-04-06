# Fix Color Buttons and Product Variant Mixing Across Categories

## Summary

Update 3 files to replace all name/size-based product matching with `category_id`-based filtering. This ensures color buttons and variant navigation stay within the correct category.

## Root Cause

Four code locations use `product.name + sizeType` matching instead of `category_id`:


| Location                | File                  | Line(s)                   |
| ----------------------- | --------------------- | ------------------------- |
| PDP category loading    | `productComponent.js` | 610-620                   |
| PDP keyword helper      | `productComponent.js` | 625-635                   |
| Catalog color buttons   | `colorService.js`     | 37-44, 139-145            |
| Homepage click handlers | `homeComponent.js`    | 567-568, 593-594, 625-626 |


## Changes

### File 1: `js/components/productComponent.js`

**Replace** `loadCategoryProducts()` (lines 610-620) with `category_id` filter:

```js
async loadCategoryProducts(currentProduct) {
  try {
    if (currentProduct.category_id) {
      return this.productsWithPrices.filter(p =>
        p.category_id === currentProduct.category_id
      );
    }
    return [currentProduct];
  } catch (error) {
    console.error('Error loading category products:', error);
    return [currentProduct];
  }
}
```

**Delete** `getCategoryKeyword()` (lines 625-635) — no longer used.

### File 2: `js/services/colorService.js`

**Update** `renderColorButtons()` (lines 37-44) — filter by `category_id`:

```js
.filter(([color]) =>
  allProducts.some(p =>
    p.category_id === product.category_id &&
    p.color === color
  )
)
```

Also add `data-category-id="${product.category_id}"` to the button HTML (line 62).

**Update** `findMatchingProduct()` (lines 139-145) — add `categoryId` parameter:

```js
async findMatchingProduct(baseName, baseSize, color, categoryId) {
  const allProducts = await productsService.getActiveProducts();
  if (categoryId) {
    return allProducts.find(p =>
      p.category_id === categoryId && p.color === color
    );
  }
  return allProducts.find(p =>
    p.name === baseName && p.sizeType === baseSize && p.color === color
  );
}
```

**Update** `handleColorChange()` (line 150+) — extract `categoryId` from data, pass to `findMatchingProduct`:

```js
async handleColorChange(data) {
  const { productId, baseName, baseSize, chosenColor, categoryId } = data;
  if (this.selectedColors[productId] === chosenColor) return true;
  const matchingProduct = await this.findMatchingProduct(baseName, baseSize, chosenColor, categoryId);
  // ... rest unchanged
}
```

### File 3: `js/components/homeComponent.js`

**Update all 3 product-matching blocks** (lines 567-568, 593-594, 625-626) to use `category_id` instead of `name + sizeType`:

```js
// Replace this pattern (appears 3 times):
const matchingProduct = HomeComponent.productsWithPrices.find(
  (p) => p.name === baseName && p.sizeType === baseSize && p.color === chosenColor
);

// With:
const categoryId = this.dataset.categoryId; // from data attribute
const matchingProduct = HomeComponent.productsWithPrices.find(
  (p) => p.category_id === categoryId && p.color === chosenColor
);
```

This relies on the `data-category-id` attribute added to color buttons in `colorService.js`.

## What stays unchanged

- `publicProductsComponent.js` (already correct)
- DB schema / migrations
- Admin components
- Storage/media logic
- `productsService.js`

## Technical Notes

- `category_id` is present on all 56 active products (verified previously)
- Legacy fallback kept in `findMatchingProduct()` for safety
- Products with `null` `category_id` show only themselves — no crash, no cross-category mixing

## Verification

1. Magnetic PDP → only 7 color buttons (magnetic category only)
2. Bow-small PDP → only bow-small colors, no magnetic/handle mixing
3. Homepage color click → stays within same category
4. Homepage "Подробно" button → navigates to correct category product
5. Product with `null` `category_id` → shows only itself, no crash

Check all event payload builders and button templates to ensure categoryId is passed consistently end-to-end.

The fix depends not only on matching logic, but also on correct propagation of data-category-id through rendered buttons and click handlers.
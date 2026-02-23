

# Fix: Images Not Updating After Upload in Admin Panel

## Root Cause Analysis (Ranked by Likelihood)

### 1. Missing Admin Context in `loadProductMedia` (HIGH)
In `modernAdminComponent_media.js`, `loadProductMedia()` queries the `products` table using the anon key **without setting admin context first**. The `loadPage()` method in `modernAdminComponent.js` (line 511-518) correctly calls `set_admin_login_context` before reading, but `loadProductMedia` does not.

For **inactive products**, the RLS policy only allows reading `is_active = true` products for anon users. Without admin context, the query returns empty/error for inactive products, so photos appear blank.

### 2. Missing `rerender` After Upload in ModernAdmin Media Flow (HIGH)
In `modernAdminComponent_media.js` `handleImageUpload()` (lines 75-76):
```javascript
await this.loadProductMedia(product.id || product.artikul);
this.updatePhotosGrid();
```
`updatePhotosGrid()` only updates the `#photosGrid` DOM element. But if the dialog HTML structure has been re-rendered or the element doesn't exist at that moment, the update is lost silently.

### 3. No Cache-Busting on Images (MEDIUM)
Browser may cache old image responses. When new images are uploaded with similar paths, the browser serves stale cached content.

---

## Changes

### File 1: `js/components/modernAdminComponent_media.js`

**Change A**: Add admin context before reading products in `loadProductMedia()`:

```javascript
// Load product media from database
async loadProductMedia(productId) {
    if (!productId) {
      this.currentProductImages = [];
      this.currentProductVideos = [];
      return;
    }

    try {
      // Set admin context before reading (needed for inactive products)
      if (this.adminLogin) {
        await this.supabase.rpc('set_admin_login_context', {
          admin_login: this.adminLogin
        });
      }

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
```

**Change B**: In `handleImageUpload()`, use the response data directly from the edge function instead of relying on a refetch, and add cache-busting:

```javascript
async handleImageUpload(event) {
    const files = event.target?.files ? Array.from(event.target.files) : Array.from(event.files || []);
    if (!files.length) return;

    const product = this.currentEditingProduct;
    if (!product?.id && !product?.artikul) {
      alert('Сначала создайте товар');
      return;
    }

    this.uploadingImage = true;

    try {
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

      // Use response data directly if available, otherwise refetch
      if (data && data.photos) {
        this.currentProductImages = data.photos;
      } else {
        await this.loadProductMedia(product.id || product.artikul);
      }

      alert(`Загружено ${files.length} изображений`);
      this.updatePhotosGrid();
      this.updateVideosGrid();
      
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Ошибка загрузки изображений: ' + error.message);
    } finally {
      this.uploadingImage = false;
      if (event.target) event.target.value = '';
    }
  },
```

**Change C**: Add cache-busting to `getImageUrl()`:

```javascript
getImageUrl(photo) {
    let url;
    if (photo.startsWith('http')) {
      url = photo;
    } else {
      url = `https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/${photo}`;
    }
    // Add cache-busting for freshly loaded images
    if (url.indexOf('?') === -1) {
      url += '?t=' + Date.now();
    }
    return url;
  },
```

### File 2: `js/components/adminProductsComponent.js`

**Change D**: Same fix in `loadProductMedia()` -- add admin context before querying:

```javascript
async loadProductMedia(productId) {
    try {
      // Set admin context before the call
      const adminLogin = sessionStorage.getItem('adminLogin');
      if (adminLogin) {
        await window.supabase.rpc('set_admin_login_context', {
          admin_login: adminLogin
        });
      }

      const { data, error } = await window.supabase.functions.invoke('media-manager', {
        body: {
          action: 'get_media',
          product_id: productId
        }
      });

      if (error) throw error;

      if (this.data.editingProduct) {
        this.data.editingProduct.photos = data.photos || [];
        this.data.editingProduct.videos = data.videos || [];
      }

      console.log('Loaded product media:', data);
    } catch (error) {
      console.error('Error loading product media:', error);
      this.showNotification('Ошибка загрузки медиа: ' + error.message, 'error');
    }
  },
```

**Change E**: In `handleImageUpload()`, add `this.rerender()` after loading media (currently missing -- the `rerender` in `finally` only runs after `uploadingImage` is reset, but the media data might not be reflected):

At line 626, after `loadProductMedia`, add explicit `rerender`:
```javascript
this.showNotification(`Загружено ${files.length} изображений`, 'success');
await this.loadProductMedia(product.id || product.artikul);
this.rerender(); // Explicitly rerender with fresh media data
```

---

## Summary

| Issue | File | Fix |
|-------|------|-----|
| No admin context in media read | `modernAdminComponent_media.js` | Add `set_admin_login_context` before DB query |
| Upload response data ignored | `modernAdminComponent_media.js` | Use `data.photos` from edge function response |
| Browser cache stale images | `modernAdminComponent_media.js` | Add `?t=timestamp` to image URLs |
| No admin context in media read | `adminProductsComponent.js` | Add `set_admin_login_context` before edge function call |
| Missing rerender after upload | `adminProductsComponent.js` | Add explicit `rerender()` after `loadProductMedia` |


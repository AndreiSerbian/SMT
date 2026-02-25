

# Fix Scene Upload MIME Type Error

## Problem
`storageService.js` uploads scene data as `scene.bin` with `application/octet-stream`, which Supabase Storage rejects. This breaks "Add to cart" in the customizer.

## Plan (2 file changes only)

### Change 1: `js/customizer/storageService.js` (lines 53-71)
Replace the `uploadScene` method:
- Path: `scene.bin` → `scene.json`
- Blob type: `application/octet-stream` → `application/json`
- Upload contentType: `application/octet-stream` → `application/json`
- Add `cacheControl: '3600'`

### Change 2: `js/customizer/sceneManager.js` (append before closing brace, ~line 108)
Add static method `loadSceneFromUrl(sceneUrl)`:
- Fetches with `{ cache: 'no-store' }`
- Uses `res.text()` + `JSON.parse()` (never `res.json()`)
- Throws user-friendly Russian error on parse failure

No other files need changes — `exportPipeline.js` calls `StorageService.uploadScene()` and will work automatically.


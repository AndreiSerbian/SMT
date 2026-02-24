/**
 * StorageService: Supabase storage upload helpers for designs
 */

import { supabase } from '../utils/supabase.js';

const BUCKET = 'product-media';

export const StorageService = {
  /**
   * Upload a data URL (base64) as a file to Supabase Storage
   */
  async uploadDataUrl(dataUrl, path) {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, {
        contentType: blob.type,
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path);

    return urlData.publicUrl;
  },

  /**
   * Upload preview PNGs for all 7 sides
   */
  async uploadPreviews(designId, previewDataUrls) {
    const urls = {};
    const sides = ['top', 'bottom', 'left', 'right', 'front', 'back', 'inside'];

    for (const side of sides) {
      if (previewDataUrls[side]) {
        const path = `designs/${designId}/previews/${side}.png`;
        urls[side] = await this.uploadDataUrl(previewDataUrls[side], path);
      }
    }

    return urls;
  },

  /**
   * Upload scene.json
   */
  async uploadScene(designId, sceneData) {
    const blob = new Blob([JSON.stringify(sceneData)], { type: 'application/octet-stream' });
    const path = `designs/${designId}/scene/scene.bin`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, {
        contentType: 'application/octet-stream',
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path);

    return urlData.publicUrl;
  },

  /**
   * Upload a user file (image) as a design asset
   */
  async uploadAsset(designId, file) {
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}.${ext}`;
    const path = `designs/${designId}/assets/${fileName}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        contentType: file.type,
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path);

    return urlData.publicUrl;
  },
};

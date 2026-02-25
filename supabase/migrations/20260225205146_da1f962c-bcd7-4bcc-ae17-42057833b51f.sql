UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png', 'video/mp4', 'video/webm', 'application/json']
WHERE id = 'product-media';
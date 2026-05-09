-- Backup current photos for all products
CREATE TABLE IF NOT EXISTS public.products_photos_backup_20260509 AS
SELECT id, artikul, color_hex, photos, videos, now() AS backed_up_at
FROM public.products;

-- Map artikul -> color folder for full cover small (existing storage objects)
WITH mapping(artikul, color_folder) AS (
  VALUES
    ('0702', 'Black'),
    ('0703', 'White'),
    ('0704', 'Red'),
    ('0705', 'Orange'),
    ('0706', 'Blue'),
    ('0707', 'Silver'),
    ('0708', 'Gold')
)
UPDATE public.products p
SET photos = ARRAY[
  'https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/images/full cover small/' || m.color_folder || '/slide1.webp',
  'https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/images/full cover small/' || m.color_folder || '/slide2.webp',
  'https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/images/full cover small/' || m.color_folder || '/slide3.webp',
  'https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/images/full cover small/' || m.color_folder || '/slide4.webp'
]
FROM mapping m
WHERE p.artikul = m.artikul;
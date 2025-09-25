-- Исправляем URL для Black Moire и White Brilliant продуктов
UPDATE products 
SET photos = ARRAY[
  'https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/images/big with bow/black moire/slide1.webp',
  'https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/images/big with bow/black moire/slide2.webp',
  'https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/images/big with bow/black moire/slide3.webp',
  'https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/images/big with bow/black moire/slide4.webp'
]
WHERE name ILIKE '%black moire%';

UPDATE products 
SET photos = ARRAY[
  'https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/images/big with bow/white diamond/slide1.webp',
  'https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/images/big with bow/white diamond/slide2.webp',
  'https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/images/big with bow/white diamond/slide3.webp',
  'https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/images/big with bow/white diamond/slide4.webp'
]
WHERE name ILIKE '%white%brilliant%' OR name ILIKE '%white%diamond%';
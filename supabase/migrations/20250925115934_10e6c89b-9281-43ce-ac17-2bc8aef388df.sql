-- Исправляем URL для средней коробки White diamond
UPDATE products 
SET photos = ARRAY[
  'https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/images/medium with bow/white diamond/slide1.webp',
  'https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/images/medium with bow/white diamond/slide2.webp',
  'https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/images/medium with bow/white diamond/slide3.webp',
  'https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/images/medium with bow/white diamond/slide4.webp'
]
WHERE artikul = '0643' AND size = 'medium';
-- Импорт товаров из JSON данных
INSERT INTO public.products (
  id, 
  artikul, 
  name, 
  size, 
  color_hex, 
  price_rub, 
  id_wb, 
  dimensions, 
  weight, 
  photos, 
  videos, 
  is_active
) VALUES
-- Большие коробки с лентой
('БК-001-Р', 'БК-001-Р', 'Подарочная коробка с лентой', 'big', '#FFB6C1', 1200, NULL, '{"length": 30, "width": 30, "height": 15}', 0.8, ARRAY['public/images/big with bow/pink/slide1.webp', 'public/images/big with bow/pink/slide2.webp'], ARRAY[]::text[], true),
('БК-002-Ч', 'БК-002-Ч', 'Подарочная коробка с лентой', 'big', '#1a1a1a', 1200, NULL, '{"length": 30, "width": 30, "height": 15}', 0.8, ARRAY['public/images/big with bow/black/slide1.webp', 'public/images/big with bow/black/slide2.webp', 'public/images/big with bow/black/slide3.webp', 'public/images/big with bow/black/slide4.webp'], ARRAY['public/videos/Video 0.mp4'], true),
('БК-003-Б', 'БК-003-Б', 'Подарочная коробка с лентой', 'big', '#FFFFFF', 1200, NULL, '{"length": 30, "width": 30, "height": 15}', 0.8, ARRAY['public/images/big with bow/white/slide1.webp', 'public/images/big with bow/white/slide2.webp', 'public/images/big with bow/white/slide3.webp', 'public/images/big with bow/white/slide4.webp'], ARRAY['public/videos/Video 1.mp4'], true),
('БК-004-З', 'БК-004-З', 'Подарочная коробка с лентой', 'big', '#FFD700', 1200, NULL, '{"length": 30, "width": 30, "height": 15}', 0.8, ARRAY['public/images/big with bow/gold/slide1.webp', 'public/images/big with bow/gold/slide2.webp', 'public/images/big with bow/gold/slide3.webp', 'public/images/big with bow/gold/slide4.webp'], ARRAY[]::text[], true),
('БК-005-КР', 'БК-005-КР', 'Подарочная коробка с лентой', 'big', '#FF0000', 1200, NULL, '{"length": 30, "width": 30, "height": 15}', 0.8, ARRAY['public/images/big with bow/red/slide1.webp', 'public/images/big with bow/red/slide2.webp'], ARRAY[]::text[], true),
('БК-006-О', 'БК-006-О', 'Подарочная коробка с лентой', 'big', '#FFA500', 1200, NULL, '{"length": 30, "width": 30, "height": 15}', 0.8, ARRAY['public/images/big with bow/orange/slide1.webp', 'public/images/big with bow/orange/slide2.webp'], ARRAY[]::text[], true),
('БК-007-П', 'БК-007-П', 'Подарочная коробка с лентой', 'big', '#FFCBA4', 1200, NULL, '{"length": 30, "width": 30, "height": 15}', 0.8, ARRAY['public/images/big with bow/peach/slide1.webp', 'public/images/big with bow/peach/slide2.webp', 'public/images/big with bow/peach/slide3.webp', 'public/images/big with bow/peach/slide4.webp'], ARRAY[]::text[], true),
('БК-008-ГЛ', 'БК-008-ГЛ', 'Подарочная коробка с лентой', 'big', '#B0E0E6', 1200, NULL, '{"length": 30, "width": 30, "height": 15}', 0.8, ARRAY['public/images/big with bow/blue ice/slide1.webp', 'public/images/big with bow/blue ice/slide2.webp', 'public/images/big with bow/blue ice/slide3.webp', 'public/images/big with bow/blue ice/slide4.webp'], ARRAY[]::text[], true),
('БК-009-СБ', 'БК-009-СБ', 'Подарочная коробка с лентой', 'big', '#003366', 1200, NULL, '{"length": 30, "width": 30, "height": 15}', 0.8, ARRAY['public/images/big with bow/blue velvet/slide1.webp', 'public/images/big with bow/blue velvet/slide2.webp', 'public/images/big with bow/blue velvet/slide3.webp', 'public/images/big with bow/blue velvet/slide4.webp'], ARRAY[]::text[], true),
('БК-010-Т', 'БК-010-Т', 'Подарочная коробка с лентой', 'big', '#0ABAB5', 1200, NULL, '{"length": 30, "width": 30, "height": 15}', 0.8, ARRAY['public/images/big with bow/tiffany/slide1.webp', 'public/images/big with bow/tiffany/slide2.webp'], ARRAY[]::text[], true),
('БК-011-В', 'БК-011-В', 'Подарочная коробка с лентой', 'big', '#F3E5AB', 1200, NULL, '{"length": 30, "width": 30, "height": 15}', 0.8, ARRAY['public/images/big with bow/vanilla/slide1.webp', 'public/images/big with bow/vanilla/slide2.webp', 'public/images/big with bow/vanilla/slide3.webp', 'public/images/big with bow/vanilla/slide4.webp'], ARRAY[]::text[], true),
('БК-012-БА', 'БК-012-БА', 'Подарочная коробка с лентой', 'big', '#F8F8FF', 1200, NULL, '{"length": 30, "width": 30, "height": 15}', 0.8, ARRAY['public/images/big with bow/white diamond/slide1.webp', 'public/images/big with bow/white diamond/slide2.webp', 'public/images/big with bow/white diamond/slide3.webp', 'public/images/big with bow/white diamond/slide4.webp'], ARRAY[]::text[], true),
('БК-013-ЧМ', 'БК-013-ЧМ', 'Подарочная коробка с лентой', 'big', '#2F2F2F', 1200, NULL, '{"length": 30, "width": 30, "height": 15}', 0.8, ARRAY['public/images/big with bow/black moire/slide1.webp', 'public/images/big with bow/black moire/slide2.webp', 'public/images/big with bow/black moire/slide3.webp', 'public/images/big with bow/black moire/slide4.webp'], ARRAY[]::text[], true),

-- Средние коробки с лентой
('СК-001-Ч', 'СК-001-Ч', 'Подарочная коробка с лентой', 'medium', '#1a1a1a', 800, NULL, '{"length": 22, "width": 22, "height": 11}', 0.5, ARRAY['public/images/medium with bow/black/slide1.webp', 'public/images/medium with bow/black/slide2.webp', 'public/images/medium with bow/black/slide3.webp', 'public/images/medium with bow/black/slide4.webp'], ARRAY[]::text[], true),
('СК-002-Б', 'СК-002-Б', 'Подарочная коробка с лентой', 'medium', '#FFFFFF', 800, NULL, '{"length": 22, "width": 22, "height": 11}', 0.5, ARRAY['public/images/medium with bow/white/slide1.webp', 'public/images/medium with bow/white/slide2.webp', 'public/images/medium with bow/white/slide3.webp', 'public/images/medium with bow/white/slide4.webp'], ARRAY[]::text[], true),
('СК-003-Р', 'СК-003-Р', 'Подарочная коробка с лентой', 'medium', '#FFB6C1', 800, NULL, '{"length": 22, "width": 22, "height": 11}', 0.5, ARRAY['public/images/medium with bow/pink/slide1.webp', 'public/images/medium with bow/pink/slide2.webp'], ARRAY[]::text[], true),
('СК-004-КР', 'СК-004-КР', 'Подарочная коробка с лентой', 'medium', '#FF0000', 800, NULL, '{"length": 22, "width": 22, "height": 11}', 0.5, ARRAY['public/images/medium with bow/red/slide1.webp', 'public/images/medium with bow/red/slide2.webp'], ARRAY[]::text[], true),
('СК-005-О', 'СК-005-О', 'Подарочная коробка с лентой', 'medium', '#FFA500', 800, NULL, '{"length": 22, "width": 22, "height": 11}', 0.5, ARRAY['public/images/medium with bow/orange/slide1.webp', 'public/images/medium with bow/orange/slide2.webp'], ARRAY[]::text[], true),
('СК-006-П', 'СК-006-П', 'Подарочная коробка с лентой', 'medium', '#FFCBA4', 800, NULL, '{"length": 22, "width": 22, "height": 11}', 0.5, ARRAY['public/images/medium with bow/peach/slide1.webp', 'public/images/medium with bow/peach/slide2.webp', 'public/images/medium with bow/peach/slide3.webp', 'public/images/medium with bow/peach/slide4.webp'], ARRAY[]::text[], true),
('СК-007-Т', 'СК-007-Т', 'Подарочная коробка с лентой', 'medium', '#0ABAB5', 800, NULL, '{"length": 22, "width": 22, "height": 11}', 0.5, ARRAY['public/images/medium with bow/tiffany/slide1.webp', 'public/images/medium with bow/tiffany/slide2.webp'], ARRAY[]::text[], true),
('СК-008-БА', 'СК-008-БА', 'Подарочная коробка с лентой', 'medium', '#F8F8FF', 800, NULL, '{"length": 22, "width": 22, "height": 11}', 0.5, ARRAY['public/images/medium with bow/white diamond/slide1.webp', 'public/images/medium with bow/white diamond/slide2.webp', 'public/images/medium with bow/white diamond/slide3.webp', 'public/images/medium with bow/white diamond/slide4.webp'], ARRAY[]::text[], true),
('СК-009-ЧМ', 'СК-009-ЧМ', 'Подарочная коробка с лентой', 'medium', '#2F2F2F', 800, NULL, '{"length": 22, "width": 22, "height": 11}', 0.5, ARRAY['public/images/medium with bow/black moire/slide1.webp', 'public/images/medium with bow/black moire/slide2.webp', 'public/images/medium with bow/black moire/slide3.webp', 'public/images/medium with bow/black moire/slide4.webp'], ARRAY[]::text[], true),
('СК-010-СБ', 'СК-010-СБ', 'Подарочная коробка с лентой', 'medium', '#003366', 800, NULL, '{"length": 22, "width": 22, "height": 11}', 0.5, ARRAY['public/images/medium with bow/blue velvet/slide1.webp', 'public/images/medium with bow/blue velvet/slide2.webp', 'public/images/medium with bow/blue velvet/slide3.webp', 'public/images/medium with bow/blue velvet/slide4.webp'], ARRAY[]::text[], true),
('СК-011-Л', 'СК-011-Л', 'Подарочная коробка с лентой', 'medium', '#E6E6FA', 800, NULL, '{"length": 22, "width": 22, "height": 11}', 0.5, ARRAY['public/images/medium with bow/lavender/slide1.webp', 'public/images/medium with bow/lavender/slide2.webp', 'public/images/medium with bow/lavender/slide3.webp', 'public/images/medium with bow/lavender/slide4.webp'], ARRAY[]::text[], true),

-- Малые коробки с лентой
('МК-001-Ч', 'МК-001-Ч', 'Подарочная коробка с лентой', 'small', '#1a1a1a', 500, NULL, '{"length": 16, "width": 16, "height": 8}', 0.3, ARRAY['public/images/small with bow/black/slide1.webp', 'public/images/small with bow/black/slide2.webp', 'public/images/small with bow/black/slide3.webp', 'public/images/small with bow/black/slide4.webp'], ARRAY[]::text[], true),
('МК-002-Б', 'МК-002-Б', 'Подарочная коробка с лентой', 'small', '#FFFFFF', 500, NULL, '{"length": 16, "width": 16, "height": 8}', 0.3, ARRAY['public/images/small with bow/white/slide1.webp', 'public/images/small with bow/white/slide2.webp', 'public/images/small with bow/white/slide3.webp', 'public/images/small with bow/white/slide4.webp'], ARRAY[]::text[], true),
('МК-003-З', 'МК-003-З', 'Подарочная коробка с лентой', 'small', '#FFD700', 500, NULL, '{"length": 16, "width": 16, "height": 8}', 0.3, ARRAY['public/images/small with bow/gold/slide1.webp', 'public/images/small with bow/gold/slide2.webp', 'public/images/small with bow/gold/slide3.webp', 'public/images/small with bow/gold/slide4.webp'], ARRAY[]::text[], true),
('МК-004-КР', 'МК-004-КР', 'Подарочная коробка с лентой', 'small', '#FF0000', 500, NULL, '{"length": 16, "width": 16, "height": 8}', 0.3, ARRAY['public/images/small with bow/red/slide1.webp', 'public/images/small with bow/red/slide2.webp'], ARRAY[]::text[], true),
('МК-005-О', 'МК-005-О', 'Подарочная коробка с лентой', 'small', '#FFA500', 500, NULL, '{"length": 16, "width": 16, "height": 8}', 0.3, ARRAY['public/images/small with bow/orange/slide1.webp', 'public/images/small with bow/orange/slide2.webp'], ARRAY[]::text[], true),
('МК-006-Р', 'МК-006-Р', 'Подарочная коробка с лентой', 'small', '#FFB6C1', 500, NULL, '{"length": 16, "width": 16, "height": 8}', 0.3, ARRAY['public/images/small with bow/pink/slide1.webp', 'public/images/small with bow/pink/slide2.webp'], ARRAY[]::text[], true),
('МК-007-ГЛ', 'МК-007-ГЛ', 'Подарочная коробка с лентой', 'small', '#B0E0E6', 500, NULL, '{"length": 16, "width": 16, "height": 8}', 0.3, ARRAY['public/images/small with bow/blue ice/slide1.webp', 'public/images/small with bow/blue ice/slide2.webp', 'public/images/small with bow/blue ice/slide3.webp', 'public/images/small with bow/blue ice/slide4.webp'], ARRAY[]::text[], true),
('МК-008-Т', 'МК-008-Т', 'Подарочная коробка с лентой', 'small', '#0ABAB5', 500, NULL, '{"length": 16, "width": 16, "height": 8}', 0.3, ARRAY['public/images/small with bow/tiffany/slide1.webp', 'public/images/small with bow/tiffany/slide2.webp'], ARRAY[]::text[], true),
('МК-009-В', 'МК-009-В', 'Подарочная коробка с лентой', 'small', '#F3E5AB', 500, NULL, '{"length": 16, "width": 16, "height": 8}', 0.3, ARRAY['public/images/small with bow/vanilla/slide1.webp', 'public/images/small with bow/vanilla/slide2.webp', 'public/images/small with bow/vanilla/slide3.webp', 'public/images/small with bow/vanilla/slide4.webp'], ARRAY[]::text[], true),

-- Коробки с ручкой
('КР-001-Ч', 'КР-001-Ч', 'Подарочная коробка с ручкой', 'small', '#1a1a1a', 500, 'WB001', '{"length": 20, "width": 20, "height": 10}', 0.4, ARRAY['public/images/boxes with handles/black/slide1.webp', 'public/images/boxes with handles/black/slide2.webp'], ARRAY[]::text[], true),
('КР-002-З', 'КР-002-З', 'Подарочная коробка с ручкой', 'small', '#FFD700', 500, 'WB002', '{"length": 20, "width": 20, "height": 10}', 0.4, ARRAY['public/images/boxes with handles/gold/slide1.webp', 'public/images/boxes with handles/gold/slide2.webp'], ARRAY[]::text[], true),
('КР-003-С', 'КР-003-С', 'Подарочная коробка с ручкой', 'small', '#DDA0DD', 500, 'WB003', '{"length": 20, "width": 20, "height": 10}', 0.4, ARRAY['public/images/boxes with handles/lilac/slide1.webp', 'public/images/boxes with handles/lilac/slide2.webp'], ARRAY[]::text[], true),
('КР-004-О', 'КР-004-О', 'Подарочная коробка с ручкой', 'small', '#FFA500', 500, 'WB004', '{"length": 20, "width": 20, "height": 10}', 0.4, ARRAY['public/images/boxes with handles/orange/slide1.webp', 'public/images/boxes with handles/orange/slide2.webp'], ARRAY[]::text[], true),
('КР-005-Р', 'КР-005-Р', 'Подарочная коробка с ручкой', 'small', '#FFB6C1', 500, 'WB005', '{"length": 20, "width": 20, "height": 10}', 0.4, ARRAY['public/images/boxes with handles/pink/slide1.webp', 'public/images/boxes with handles/pink/slide2.webp'], ARRAY[]::text[], true),
('КР-006-КР', 'КР-006-КР', 'Подарочная коробка с ручкой', 'small', '#FF0000', 500, 'WB006', '{"length": 20, "width": 20, "height": 10}', 0.4, ARRAY['public/images/boxes with handles/red/slide1.webp', 'public/images/boxes with handles/red/slide2.webp'], ARRAY[]::text[], true),
('КР-007-СР', 'КР-007-СР', 'Подарочная коробка с ручкой', 'small', '#C0C0C0', 500, 'WB007', '{"length": 20, "width": 20, "height": 10}', 0.4, ARRAY['public/images/boxes with handles/silver/slide1.webp', 'public/images/boxes with handles/silver/slide2.webp'], ARRAY[]::text[], true),
('КР-008-Б', 'КР-008-Б', 'Подарочная коробка с ручкой', 'small', '#FFFFFF', 500, 'WB008', '{"length": 20, "width": 20, "height": 10}', 0.4, ARRAY['public/images/boxes with handles/white/slide1.webp', 'public/images/boxes with handles/white/slide2.webp'], ARRAY[]::text[], true)

ON CONFLICT (artikul) DO UPDATE SET
  name = EXCLUDED.name,
  size = EXCLUDED.size,
  color_hex = EXCLUDED.color_hex,
  price_rub = EXCLUDED.price_rub,
  id_wb = EXCLUDED.id_wb,
  dimensions = EXCLUDED.dimensions,
  weight = EXCLUDED.weight,
  photos = EXCLUDED.photos,
  videos = EXCLUDED.videos,
  is_active = EXCLUDED.is_active;

-- Также добавляем данные в таблицу product_prices
INSERT INTO public.product_prices (product_id, price_rub) 
SELECT artikul, price_rub FROM public.products 
ON CONFLICT (product_id) DO UPDATE SET 
  price_rub = EXCLUDED.price_rub,
  updated_at = now();
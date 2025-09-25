-- Добавляем русское название цветов
ALTER TABLE colors ADD COLUMN IF NOT EXISTS russian_name TEXT;

-- Обновляем цвета с русскими названиями
INSERT INTO colors (name, hex_code, russian_name, is_active, sort_order) VALUES
('Rose', '#FFB6C1', 'Розовая', true, 1),
('Tiffany', '#0ABAB5', 'Тиффани', true, 2),
('Black', '#1a1a1a', 'Черная', true, 3),
('White', '#FFFFFF', 'Белая', true, 4),
('Red', '#FF0000', 'Красная', true, 5),
('Orange', '#FFA500', 'Оранжевая', true, 6),
('Gold', '#FFD700', 'Золото', true, 7),
('Ice Blue', '#B0E0E6', 'Голубой лед', true, 8),
('Vanilla', '#F3E5AB', 'Ванильная', true, 9),
('Blue Velvet', '#003d7a', 'Синий бархат', true, 10),
('Lavender', '#E6E6FA', 'Лавандовая', true, 11),
('Peach', '#F4C2C2', 'Персиковая', true, 12),
('Black Moire', '#2c2c2c', 'Черный муар', true, 13),
('White Diamond', '#F8F8FF', 'Белый бриллиант', true, 14),
('Silver', '#C0C0C0', 'Серебряная', true, 15),
('Lilac', '#DDA0DD', 'Сиреневая', true, 16)
ON CONFLICT (name) DO UPDATE SET 
  hex_code = EXCLUDED.hex_code,
  russian_name = EXCLUDED.russian_name,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- Обновляем id_wb для существующих товаров на основе artikul
UPDATE products SET id_wb = '215908492' WHERE artikul = '059';
UPDATE products SET id_wb = '215915227' WHERE artikul = '0591';
UPDATE products SET id_wb = '215916129' WHERE artikul = '0592';
UPDATE products SET id_wb = '215916130' WHERE artikul = '0593';
UPDATE products SET id_wb = '215916516' WHERE artikul = '0594';
UPDATE products SET id_wb = '215916522' WHERE artikul = '0595';
UPDATE products SET id_wb = '274151258' WHERE artikul = '0596';
UPDATE products SET id_wb = '274150707' WHERE artikul = '0597';
UPDATE products SET id_wb = '274149785' WHERE artikul = '0598';
UPDATE products SET id_wb = '317924791' WHERE artikul = '060';
UPDATE products SET id_wb = '243454714' WHERE artikul = '0601';
UPDATE products SET id_wb = '243455326' WHERE artikul = '0602';
UPDATE products SET id_wb = '243455885' WHERE artikul = '0603';
UPDATE products SET id_wb = '243456194' WHERE artikul = '0604';
UPDATE products SET id_wb = '243456462' WHERE artikul = '0605';
UPDATE products SET id_wb = '274190807' WHERE artikul = '0609';
UPDATE products SET id_wb = '317924791' WHERE artikul = '0640';
UPDATE products SET id_wb = '317925292' WHERE artikul = '0642';
UPDATE products SET id_wb = '317542767' WHERE artikul = '0643';
UPDATE products SET id_wb = '317925740' WHERE artikul = '0646';
UPDATE products SET id_wb = '243457427' WHERE artikul = '061';
UPDATE products SET id_wb = '243457638' WHERE artikul = '0611';
UPDATE products SET id_wb = '243458324' WHERE artikul = '0612';
UPDATE products SET id_wb = '243458675' WHERE artikul = '0613';
UPDATE products SET id_wb = '243458980' WHERE artikul = '0614';
UPDATE products SET id_wb = '243459196' WHERE artikul = '0615';
UPDATE products SET id_wb = '316806717' WHERE artikul = '0616';
UPDATE products SET id_wb = '310899160' WHERE artikul = '0617';
UPDATE products SET id_wb = '310897278' WHERE artikul = '0618';
UPDATE products SET id_wb = '317926927' WHERE artikul = '0650';
UPDATE products SET id_wb = '317927629' WHERE artikul = '0652';
UPDATE products SET id_wb = '317926506' WHERE artikul = '0653';
UPDATE products SET id_wb = '317928114' WHERE artikul = '0656';
UPDATE products SET id_wb = '244623727' WHERE artikul = '062';
UPDATE products SET id_wb = '244624458' WHERE artikul = '0621';
UPDATE products SET id_wb = '244624620' WHERE artikul = '0622';
UPDATE products SET id_wb = '244625535' WHERE artikul = '0623';
UPDATE products SET id_wb = '244625536' WHERE artikul = '0624';
UPDATE products SET id_wb = '244625537' WHERE artikul = '0625';
UPDATE products SET id_wb = '244625538' WHERE artikul = '0626';
UPDATE products SET id_wb = '244625539' WHERE artikul = '0627';
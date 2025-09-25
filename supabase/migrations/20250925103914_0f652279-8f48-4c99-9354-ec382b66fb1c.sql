-- Обновляем таблицу products с новыми данными из прайс-листа

-- Сначала создаем функцию для парсинга размеров
CREATE OR REPLACE FUNCTION parse_dimensions(dimension_str text) 
RETURNS jsonb AS $$
DECLARE
  parts text[];
  length_val numeric;
  width_val numeric; 
  height_val numeric;
BEGIN
  -- Разделяем строку по символу '*'
  parts := string_to_array(dimension_str, '*');
  
  -- Преобразуем в числа
  length_val := parts[1]::numeric;
  width_val := parts[2]::numeric;
  height_val := parts[3]::numeric;
  
  -- Возвращаем как JSON
  RETURN jsonb_build_object(
    'length', length_val,
    'width', width_val, 
    'height', height_val
  );
END;
$$ LANGUAGE plpgsql;

-- Функция для маппинга цветов на hex коды
CREATE OR REPLACE FUNCTION get_color_hex(color_name text)
RETURNS text AS $$
BEGIN
  RETURN CASE 
    WHEN color_name = 'Rose' THEN '#FFB6C1'
    WHEN color_name = 'Green' THEN '#008000'
    WHEN color_name = 'Black' THEN '#1a1a1a'
    WHEN color_name = 'White' THEN '#FFFFFF'
    WHEN color_name = 'Red' THEN '#FF0000'
    WHEN color_name = 'Orange' THEN '#FFA500'
    WHEN color_name = 'Ice Blue' THEN '#B0E0E6'
    WHEN color_name = 'Vanila' THEN '#F3E5AB'
    WHEN color_name = 'Gold' THEN '#FFD700'
    WHEN color_name = 'Lavender' THEN '#E6E6FA'
    WHEN color_name = 'Dark Blue' THEN '#003366'
    WHEN color_name = 'Lilac' THEN '#DDA0DD'
    WHEN color_name = 'Silver' THEN '#C0C0C0'
    ELSE '#000000'
  END;
END;
$$ LANGUAGE plpgsql;

-- Функция для определения размера продукта
CREATE OR REPLACE FUNCTION get_product_size(category text, dimensions jsonb)
RETURNS product_size AS $$
DECLARE
  length_val numeric;
BEGIN
  length_val := (dimensions->>'length')::numeric;
  
  -- Определяем размер по длине и категории
  IF category LIKE '%Малая%' OR length_val < 25 THEN
    RETURN 'small'::product_size;
  ELSIF category LIKE '%Средняя%' OR (length_val >= 25 AND length_val < 30) THEN
    RETURN 'medium'::product_size;
  ELSE
    RETURN 'big'::product_size;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Функция для генерации путей к фото
CREATE OR REPLACE FUNCTION generate_photo_paths(size_category text, color text)
RETURNS text[] AS $$
DECLARE
  folder_name text;
  color_folder text;
BEGIN
  -- Определяем папку по размеру
  folder_name := CASE 
    WHEN size_category = 'small' THEN 'small with bow'
    WHEN size_category = 'medium' THEN 'medium with bow' 
    WHEN size_category = 'big' THEN 'big with bow'
    ELSE 'small with bow'
  END;
  
  -- Маппинг цветов в папки
  color_folder := CASE
    WHEN color = 'Rose' THEN 'pink'
    WHEN color = 'Green' THEN 'tiffany'
    WHEN color = 'Black' THEN 'black'
    WHEN color = 'White' THEN 'white'
    WHEN color = 'Red' THEN 'red'
    WHEN color = 'Orange' THEN 'orange'
    WHEN color = 'Ice Blue' THEN 'blue ice'
    WHEN color = 'Vanila' THEN 'vanilla'
    WHEN color = 'Gold' THEN 'gold'
    WHEN color = 'Lavender' THEN 'lavender'
    WHEN color = 'Dark Blue' THEN 'blue velvet'
    WHEN color = 'Lilac' THEN 'lavender'
    WHEN color = 'Silver' THEN 'white'
    ELSE 'black'
  END;
  
  -- Возвращаем массив путей к фото
  RETURN ARRAY[
    'https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/images/' || folder_name || '/' || color_folder || '/slide1.webp',
    'https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/images/' || folder_name || '/' || color_folder || '/slide2.webp',
    'https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/images/' || folder_name || '/' || color_folder || '/slide3.webp',
    'https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/images/' || folder_name || '/' || color_folder || '/slide4.webp'
  ];
END;
$$ LANGUAGE plpgsql;

-- Теперь вставляем/обновляем данные о продуктах
WITH product_data AS (
  SELECT * FROM (VALUES 
    ('0590', 'Rose', '23*17*7', 270, 195, 'Подарочная коробка с бантом на магнитах Малая'),
    ('0591', 'Green', '23*17*7', 270, 195, 'Подарочная коробка с бантом на магнитах Малая'),
    ('0592', 'Black', '23*17*7', 270, 195, 'Подарочная коробка с бантом на магнитах Малая'),
    ('0593', 'White', '23*17*7', 270, 195, 'Подарочная коробка с бантом на магнитах Малая'),
    ('0594', 'Red', '23*17*7', 270, 195, 'Подарочная коробка с бантом на магнитах Малая'),
    ('0595', 'Orange', '23*17*7', 270, 195, 'Подарочная коробка с бантом на магнитах Малая'),
    ('0596', 'Ice Blue', '22*16.5*8.8', 310, 245, 'Подарочная коробка с бантом на магнитах Малая'),
    ('0597', 'Vanila', '22*16.5*8.8', 310, 245, 'Подарочная коробка с бантом на магнитах Малая'),
    ('0598', 'Gold', '22*16.5*8.8', 310, 245, 'Подарочная коробка с бантом на магнитах Малая'),
    ('0600', 'Rose', '26*19*8', 350, 250, 'Подарочная коробка с бантом на магнитах Средняя'),
    ('0601', 'Green', '26*19*8', 350, 250, 'Подарочная коробка с бантом на магнитах Средняя'),
    ('0602', 'Black', '26*19*8', 350, 250, 'Подарочная коробка с бантом на магнитах Средняя'),
    ('0603', 'White', '26*19*8', 350, 250, 'Подарочная коробка с бантом на магнитах Средняя'),
    ('0604', 'Red', '26*19*8', 350, 250, 'Подарочная коробка с бантом на магнитах Средняя'),
    ('0605', 'Orange', '26*19*8', 350, 250, 'Подарочная коробка с бантом на магнитах Средняя'),
    ('0609', 'Lavender', '26*19*8', 350, 250, 'Подарочная коробка с бантом на магнитах Средняя'),
    ('0640', 'Rose', '26*17*11', 370, 320, 'Подарочная коробка с бантом на магнитах Средняя'),
    ('0642', 'Black', '26*17*11', 370, 320, 'Подарочная коробка с бантом на магнитах Средняя'),
    ('0643', 'White', '26*17*11', 370, 320, 'Подарочная коробка с бантом на магнитах Средняя'),
    ('0646', 'Dark Blue', '26*17*11', 370, 320, 'Подарочная коробка с бантом на магнитах Средняя'),
    ('0610', 'Rose', '31.5*26*10.5', 470, 440, 'Подарочная коробка с бантом на магнитах Большая'),
    ('0611', 'Green', '31.5*26*10.5', 470, 440, 'Подарочная коробка с бантом на магнитах Большая'),
    ('0612', 'Black', '31.5*26*10.5', 470, 440, 'Подарочная коробка с бантом на магнитах Большая'),
    ('0613', 'White', '31.5*26*10.5', 470, 440, 'Подарочная коробка с бантом на магнитах Большая'),
    ('0614', 'Red', '31.5*26*10.5', 470, 440, 'Подарочная коробка с бантом на магнитах Большая'),
    ('0615', 'Orange', '31.5*26*10.5', 470, 440, 'Подарочная коробка с бантом на магнитах Большая'),
    ('0619', 'Ice Blue', '29*22*10.5', 470, 410, 'Подарочная коробка с бантом на магнитах Большая'),
    ('0617', 'Vanila', '29*22*10.5', 470, 410, 'Подарочная коробка с бантом на магнитах Большая'),
    ('0618', 'Gold', '29*22*10.5', 470, 410, 'Подарочная коробка с бантом на магнитах Большая'),
    ('0650', 'Rose', '30*24*10', 470, 410, 'Подарочная коробка с бантом на магнитах Большая'),
    ('0652', 'Black', '30*24*10', 470, 410, 'Подарочная коробка с бантом на магнитах Большая'),
    ('0653', 'White', '30*24*10', 470, 410, 'Подарочная коробка с бантом на магнитах Большая'),
    ('0656', 'Dark Blue', '30*24*10', 470, 410, 'Подарочная коробка с бантом на магнитах Большая'),
    ('0620', 'Rose', '30*23*11', 450, 430, 'Подарочная коробка с ручками на магнитах'),
    ('0621', 'Lilac', '30*23*11', 450, 430, 'Подарочная коробка с ручками на магнитах'),
    ('0622', 'Black', '30*23*11', 450, 430, 'Подарочная коробка с ручками на магнитах'),
    ('0623', 'White', '30*23*11', 450, 430, 'Подарочная коробка с ручками на магнитах'),
    ('0624', 'Red', '30*23*11', 450, 430, 'Подарочная коробка с ручками на магнитах'),
    ('0625', 'Orange', '30*23*11', 450, 430, 'Подарочная коробка с ручками на магнитах'),
    ('0626', 'Gold', '30*23*11', 450, 430, 'Подарочная коробка с ручками на магнитах'),
    ('0627', 'Silver', '30*23*11', 450, 430, 'Подарочная коробка с ручками на магнитах')
  ) AS t(artikul, color, dimensions_str, price, weight, category)
)
INSERT INTO products (
  id,
  artikul, 
  name,
  size,
  color_hex,
  price_rub,
  dimensions,
  weight,
  photos,
  videos,
  is_active
)
SELECT 
  pd.artikul as id,
  pd.artikul,
  pd.category || ' ' || pd.color as name,
  get_product_size(pd.category, parse_dimensions(pd.dimensions_str)),
  get_color_hex(pd.color),
  pd.price,
  parse_dimensions(pd.dimensions_str),
  pd.weight,
  generate_photo_paths(
    CASE 
      WHEN pd.category LIKE '%Малая%' THEN 'small'
      WHEN pd.category LIKE '%Средняя%' THEN 'medium'
      ELSE 'big'
    END,
    pd.color
  ),
  CASE 
    WHEN pd.category LIKE '%ручками%' THEN 
      ARRAY['https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/videos/Video 0.mp4']
    ELSE 
      ARRAY['https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/videos/Video 1.mp4']
  END,
  true
FROM product_data pd
ON CONFLICT (artikul) DO UPDATE SET
  name = EXCLUDED.name,
  size = EXCLUDED.size,
  color_hex = EXCLUDED.color_hex,
  price_rub = EXCLUDED.price_rub,
  dimensions = EXCLUDED.dimensions,
  weight = EXCLUDED.weight,
  photos = EXCLUDED.photos,
  videos = EXCLUDED.videos,
  updated_at = now();

-- Обновляем таблицу product_prices
WITH product_data AS (
  SELECT * FROM (VALUES 
    ('0590', 270), ('0591', 270), ('0592', 270), ('0593', 270), ('0594', 270), ('0595', 270), 
    ('0596', 310), ('0597', 310), ('0598', 310), ('0600', 350), ('0601', 350), ('0602', 350),
    ('0603', 350), ('0604', 350), ('0605', 350), ('0609', 350), ('0640', 370), ('0642', 370),
    ('0643', 370), ('0646', 370), ('0610', 470), ('0611', 470), ('0612', 470), ('0613', 470),
    ('0614', 470), ('0615', 470), ('0619', 470), ('0617', 470), ('0618', 470), ('0650', 470),
    ('0652', 470), ('0653', 470), ('0656', 470), ('0620', 450), ('0621', 450), ('0622', 450),
    ('0623', 450), ('0624', 450), ('0625', 450), ('0626', 450), ('0627', 450)
  ) AS t(product_id, price)
)
INSERT INTO product_prices (product_id, price_rub)
SELECT pd.product_id, pd.price FROM product_data pd
ON CONFLICT (product_id) DO UPDATE SET
  price_rub = EXCLUDED.price_rub,
  updated_at = now();

-- Обновляем пути для коробок с ручками 
UPDATE products 
SET photos = ARRAY[
  'https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/images/boxes with handles/' || 
  CASE 
    WHEN color_hex = '#FFB6C1' THEN 'pink'
    WHEN color_hex = '#DDA0DD' THEN 'lilac'
    WHEN color_hex = '#1a1a1a' THEN 'black'
    WHEN color_hex = '#FFFFFF' THEN 'white'
    WHEN color_hex = '#FF0000' THEN 'red'
    WHEN color_hex = '#FFA500' THEN 'orange'
    WHEN color_hex = '#FFD700' THEN 'gold'
    WHEN color_hex = '#C0C0C0' THEN 'silver'
    ELSE 'black'
  END || '/slide1.webp',
  'https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/images/boxes with handles/' || 
  CASE 
    WHEN color_hex = '#FFB6C1' THEN 'pink'
    WHEN color_hex = '#DDA0DD' THEN 'lilac'
    WHEN color_hex = '#1a1a1a' THEN 'black'
    WHEN color_hex = '#FFFFFF' THEN 'white'
    WHEN color_hex = '#FF0000' THEN 'red'
    WHEN color_hex = '#FFA500' THEN 'orange'
    WHEN color_hex = '#FFD700' THEN 'gold'
    WHEN color_hex = '#C0C0C0' THEN 'silver'
    ELSE 'black'
  END || '/slide2.webp'
]
WHERE artikul IN ('0620', '0621', '0622', '0623', '0624', '0625', '0626', '0627');
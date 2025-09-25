-- Исправляем предупреждения безопасности - добавляем search_path к функциям

CREATE OR REPLACE FUNCTION parse_dimensions(dimension_str text) 
RETURNS jsonb 
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION get_color_hex(color_name text)
RETURNS text 
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION get_product_size(category text, dimensions jsonb)
RETURNS product_size 
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION generate_photo_paths(size_category text, color text)
RETURNS text[] 
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
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
$$;
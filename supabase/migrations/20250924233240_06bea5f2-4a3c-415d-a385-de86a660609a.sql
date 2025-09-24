-- Упрощаем структуру: убираем UUID для размеров и цветов
-- Сначала создаем ENUM для размеров
CREATE TYPE product_size AS ENUM ('small', 'medium', 'big');

-- Добавляем новые колонки с правильными типами
ALTER TABLE public.products 
ADD COLUMN size product_size NOT NULL DEFAULT 'small'::product_size,
ADD COLUMN color_hex TEXT NOT NULL DEFAULT '#000000';

-- Заполняем данные из существующих связей (если есть данные)
UPDATE public.products 
SET size = CASE 
  WHEN EXISTS (SELECT 1 FROM categories WHERE categories.id = products.category_id AND categories.name = 'Малая') THEN 'small'::product_size
  WHEN EXISTS (SELECT 1 FROM categories WHERE categories.id = products.category_id AND categories.name = 'Средняя') THEN 'medium'::product_size  
  WHEN EXISTS (SELECT 1 FROM categories WHERE categories.id = products.category_id AND categories.name = 'Большая') THEN 'big'::product_size
  ELSE 'small'::product_size
END;

UPDATE public.products 
SET color_hex = COALESCE(
  (SELECT colors.hex_code FROM colors WHERE colors.id = products.color_id),
  '#000000'
);

-- Удаляем старые колонки
ALTER TABLE public.products 
DROP COLUMN IF EXISTS category_id,
DROP COLUMN IF EXISTS color_id;

-- Обновляем RLS политики
DROP POLICY IF EXISTS "Anyone can read active products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

CREATE POLICY "Anyone can read active products" 
ON public.products 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage products" 
ON public.products 
FOR ALL 
USING (true)
WITH CHECK (true);
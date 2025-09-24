-- Создаем справочник категорий товаров
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Создаем справочник цветов с hex кодами
CREATE TABLE public.colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  hex_code text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Создаем основную таблицу товаров
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artikul text NOT NULL UNIQUE,
  name text NOT NULL,
  category_id uuid NOT NULL REFERENCES public.categories(id),
  color_id uuid NOT NULL REFERENCES public.colors(id),
  price_rub numeric NOT NULL,
  id_wb text,
  dimensions jsonb NOT NULL,
  weight numeric NOT NULL,
  photos text[] NOT NULL,
  videos text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Создаем индексы для производительности
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_color ON public.products(color_id);
CREATE INDEX idx_products_artikul ON public.products(artikul);
CREATE INDEX idx_products_active ON public.products(is_active);

-- Создаем триггеры для автообновления updated_at
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_colors_updated_at
  BEFORE UPDATE ON public.colors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Включаем RLS на всех таблицах
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- RLS политики для публичного чтения активных записей
CREATE POLICY "Anyone can read active categories" 
  ON public.categories FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Anyone can read active colors" 
  ON public.colors FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Anyone can read active products" 
  ON public.products FOR SELECT 
  USING (is_active = true);

-- RLS политики для админов (полный доступ)
CREATE POLICY "Admins can manage categories" 
  ON public.categories FOR ALL 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can manage colors" 
  ON public.colors FOR ALL 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can manage products" 
  ON public.products FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Заполняем справочник категорий
INSERT INTO public.categories (name, slug, sort_order) VALUES
  ('Малая', 'small', 1),
  ('Средняя', 'medium', 2),
  ('Большая', 'large', 3),
  ('С ручками', 'with_handle', 4);

-- Заполняем справочник цветов
INSERT INTO public.colors (name, hex_code, sort_order) VALUES
  ('Розовая', '#FF69B4', 1),
  ('Тиффани', '#0DB5A6', 2),
  ('Черная', '#000000', 3),
  ('Белая', '#FFFFFF', 4),
  ('Красная', '#DC143C', 5),
  ('Оранжевая', '#FF8C00', 6),
  ('Голубой лед', '#87CEEB', 7),
  ('Ванильная', '#F3E5AB', 8),
  ('Золото', '#FFD700', 9),
  ('Лавандовая', '#E6E6FA', 10),
  ('Персиковая', '#FFCBA4', 11),
  ('Черный муар', '#2F2F2F', 12),
  ('Белый бриллиант', '#F8F8FF', 13),
  ('Синий бархат', '#191970', 14),
  ('Сиреневая', '#DDA0DD', 15),
  ('Серебряная', '#C0C0C0', 16);

-- Удаляем существующие цены из product_prices (заменим их товарами из products)
DELETE FROM public.product_prices;
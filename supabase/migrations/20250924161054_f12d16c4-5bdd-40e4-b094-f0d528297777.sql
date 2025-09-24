-- Create storage bucket for product media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-media', 
  'product-media', 
  true, 
  52428800, -- 50MB limit
  ARRAY['image/webp', 'image/jpeg', 'image/png', 'video/mp4', 'video/webm']
);

-- Create RLS policies for storage bucket
CREATE POLICY "Public read access for product media" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'product-media');

CREATE POLICY "Admin write access for product media" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'product-media');

CREATE POLICY "Admin update access for product media" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'product-media');

CREATE POLICY "Admin delete access for product media" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'product-media');

-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create colors table
CREATE TABLE public.colors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  hex_code TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_id TEXT UNIQUE, -- for migration compatibility
  artikul TEXT,
  id_wb TEXT,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  color_id UUID REFERENCES public.colors(id) ON DELETE SET NULL,
  size_type TEXT NOT NULL CHECK (size_type IN ('малая', 'средняя', 'большая')),
  dimensions TEXT,
  weight TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product images table
CREATE TABLE public.product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product videos table
CREATE TABLE public.product_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_videos ENABLE ROW LEVEL SECURITY;

-- RLS policies for public read access
CREATE POLICY "Public read access for categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public read access for colors" ON public.colors FOR SELECT USING (true);
CREATE POLICY "Public read access for products" ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "Public read access for product images" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Public read access for product videos" ON public.product_videos FOR SELECT USING (true);

-- RLS policies for admin full access (you'll need to implement admin authentication)
CREATE POLICY "Admin full access for categories" ON public.categories FOR ALL USING (true);
CREATE POLICY "Admin full access for colors" ON public.colors FOR ALL USING (true);
CREATE POLICY "Admin full access for products" ON public.products FOR ALL USING (true);
CREATE POLICY "Admin full access for product images" ON public.product_images FOR ALL USING (true);
CREATE POLICY "Admin full access for product videos" ON public.product_videos FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX idx_products_category_id ON public.products(category_id);
CREATE INDEX idx_products_color_id ON public.products(color_id);
CREATE INDEX idx_products_size_type ON public.products(size_type);
CREATE INDEX idx_products_is_active ON public.products(is_active);
CREATE INDEX idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX idx_product_images_sort_order ON public.product_images(sort_order);
CREATE INDEX idx_product_videos_product_id ON public.product_videos(product_id);
CREATE INDEX idx_colors_slug ON public.colors(slug);
CREATE INDEX idx_categories_slug ON public.categories(slug);

-- Create triggers for updated_at
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

-- Insert default categories
INSERT INTO public.categories (name, slug, description, sort_order) VALUES
('Большие с бантом', 'bolshie-s-bantom', 'Подарочные коробки больших размеров с декоративным бантом', 1),
('Средние с бантом', 'srednie-s-bantom', 'Подарочные коробки средних размеров с декоративным бантом', 2),
('Малые с бантом', 'malye-s-bantom', 'Подарочные коробки малых размеров с декоративным бантом', 3),
('Коробка с ручками', 'korobka-s-ruchkami', 'Подарочные коробки с удобными ручками для переноски', 4);

-- Insert colors from colorMap
INSERT INTO public.colors (name, slug, hex_code, sort_order) VALUES
('Розовая', 'rozovaya', '#FFB6C1', 1),
('Тиффани', 'tiffani', '#0ABAB5', 2),
('Черная', 'chernaya', '#1a1a1a', 3),
('Белая', 'belaya', '#FFFFFF', 4),
('Красная', 'krasnaya', '#DC143C', 5),
('Оранжевая', 'oranzhevaya', '#FF8C00', 6),
('Синий бархат', 'sinij-barhat', '#191970', 7),
('Белый бриллиант', 'belyj-brilliant', '#F8F8FF', 8),
('Персиковая', 'persikovaya', '#FFCBA4', 9),
('Черный муар', 'chernyj-muar', '#2F2F2F', 10),
('Золотая', 'zolotaya', '#FFD700', 11),
('Ванильная', 'vanilnaya', '#F3E5AB', 12),
('Голубой лед', 'goluboj-led', '#B0E0E6', 13),
('Лавандовая', 'lavandovaya', '#E6E6FA', 14),
('Серебренная', 'serebrennaya', '#C0C0C0', 15),
('Сиреневая', 'sirenevaya', '#DDA0DD', 16);
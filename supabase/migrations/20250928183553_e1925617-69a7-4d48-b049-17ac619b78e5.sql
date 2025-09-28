-- Создаем таблицу для хранения изображений товаров
CREATE TABLE public.box_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включаем RLS
ALTER TABLE public.box_images ENABLE ROW LEVEL SECURITY;

-- Политики RLS
CREATE POLICY "Anyone can read images" 
ON public.box_images 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage images" 
ON public.box_images 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.admins 
  WHERE login = current_setting('app.admin_login'::text, true) 
  AND password = current_setting('app.admin_password'::text, true)
));

-- Триггер для обновления updated_at
CREATE TRIGGER update_box_images_updated_at
BEFORE UPDATE ON public.box_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Создаем storage bucket для медиа
INSERT INTO storage.buckets (id, name, public) 
VALUES ('public-media', 'public-media', true)
ON CONFLICT (id) DO NOTHING;

-- Политики для storage
CREATE POLICY "Anyone can view public media" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'public-media');

CREATE POLICY "Admins can upload media" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'public-media');

CREATE POLICY "Admins can update media" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'public-media');

CREATE POLICY "Admins can delete media" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'public-media');
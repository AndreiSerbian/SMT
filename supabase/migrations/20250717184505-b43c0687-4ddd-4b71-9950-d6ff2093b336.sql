-- Создаём таблицу для администраторов
CREATE TABLE public.admins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  login TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включаем RLS для безопасности
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Политика для чтения администраторов (только для проверки логина)
CREATE POLICY "Allow read access for authentication" 
ON public.admins 
FOR SELECT 
USING (true);

-- Таблица для настроек сайта (режим технических работ, цены и т.д.)
CREATE TABLE public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включаем RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Политики для настроек сайта
CREATE POLICY "Allow read access to site settings" 
ON public.site_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Allow all operations on site settings" 
ON public.site_settings 
FOR ALL 
USING (true);

-- Функция для обновления времени изменения
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления времени
CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Добавляем начальные настройки
INSERT INTO public.site_settings (key, value) VALUES 
('maintenance_mode', 'false'),
('product_prices', '{}');

-- Добавляем тестового администратора
INSERT INTO public.admins (login, password) VALUES 
('admin', 'admin123');
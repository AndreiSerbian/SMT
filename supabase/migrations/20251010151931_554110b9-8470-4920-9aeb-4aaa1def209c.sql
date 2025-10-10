-- Создаем таблицу типов коробок
CREATE TABLE IF NOT EXISTS public.box_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Вставляем базовые типы
INSERT INTO public.box_types (name, slug, sort_order) VALUES
  ('С лентой', 'bow', 1),
  ('С ручками', 'handle', 2);

-- RLS policies для box_types
ALTER TABLE public.box_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active box types"
  ON public.box_types FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage box types"
  ON public.box_types FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger для updated_at
CREATE TRIGGER tg_box_types_updated_at
  BEFORE UPDATE ON public.box_types
  FOR EACH ROW
  EXECUTE FUNCTION tg_touch_updated_at();

-- Создаем таблицу размеров
CREATE TABLE IF NOT EXISTS public.sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Вставляем базовые размеры
INSERT INTO public.sizes (name, value, sort_order) VALUES
  ('Малая', 'small', 1),
  ('Средняя', 'medium', 2),
  ('Большая', 'big', 3);

-- RLS policies для sizes
ALTER TABLE public.sizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active sizes"
  ON public.sizes FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage sizes"
  ON public.sizes FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger для updated_at
CREATE TRIGGER tg_sizes_updated_at
  BEFORE UPDATE ON public.sizes
  FOR EACH ROW
  EXECUTE FUNCTION tg_touch_updated_at();
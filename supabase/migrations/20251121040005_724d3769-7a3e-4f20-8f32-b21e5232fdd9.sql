-- 1. Добавляем столбец subscribe в таблицу orders
ALTER TABLE public.orders 
ADD COLUMN subscribe boolean NOT NULL DEFAULT true;

-- 2. Создаем таблицу для отслеживания переходов на WB
CREATE TABLE public.wb_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  clicked_at timestamp with time zone NOT NULL DEFAULT now(),
  user_agent text,
  referrer text
);

-- Включаем RLS для wb_clicks
ALTER TABLE public.wb_clicks ENABLE ROW LEVEL SECURITY;

-- Политика: любой может записать клик
CREATE POLICY "Anyone can log WB clicks"
ON public.wb_clicks
FOR INSERT
WITH CHECK (true);

-- Политика: админы могут читать статистику
CREATE POLICY "Admins can read WB clicks"
ON public.wb_clicks
FOR SELECT
USING (true);

-- Создаем индекс для быстрого поиска по product_id
CREATE INDEX idx_wb_clicks_product_id ON public.wb_clicks(product_id);
CREATE INDEX idx_wb_clicks_clicked_at ON public.wb_clicks(clicked_at);
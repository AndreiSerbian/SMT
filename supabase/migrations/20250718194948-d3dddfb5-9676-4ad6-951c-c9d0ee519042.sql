-- Создание таблицы для хранения цен товаров
CREATE TABLE public.product_prices (
  product_id text PRIMARY KEY,
  price_rub numeric NOT NULL CHECK (price_rub >= 0),
  updated_at timestamp with time zone DEFAULT now()
);

-- Включаем RLS
ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;

-- Политика для чтения - доступна всем
CREATE POLICY "Anyone can read product prices" 
ON public.product_prices 
FOR SELECT 
USING (true);

-- Политика для записи - только аутентифицированным админам
CREATE POLICY "Only admins can modify prices" 
ON public.product_prices 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE login = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE login = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_product_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_prices_updated_at
  BEFORE UPDATE ON public.product_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_product_prices_updated_at();

-- Включаем realtime для таблицы
ALTER TABLE public.product_prices REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_prices;
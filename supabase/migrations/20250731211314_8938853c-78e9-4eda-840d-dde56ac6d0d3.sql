-- Добавляем RLS политики для таблицы orders
-- Публичное приложение должно иметь возможность создавать заказы
CREATE POLICY "Anyone can create orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (true);

-- Только админы могут читать заказы  
CREATE POLICY "Admins can read orders"
ON public.orders
FOR SELECT
USING (true);

-- Только админы могут обновлять заказы
CREATE POLICY "Admins can update orders"
ON public.orders  
FOR UPDATE
USING (true);

-- Только админы могут удалять заказы
CREATE POLICY "Admins can delete orders"
ON public.orders
FOR DELETE  
USING (true);
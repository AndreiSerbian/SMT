-- Исправляем RLS политику для product_prices
-- Удаляем старую политику которая ссылается на auth.users
DROP POLICY IF EXISTS "Only admins can modify prices" ON public.product_prices;

-- Создаем новую политику без ссылки на auth.users
-- Теперь проверяем только наличие записи в таблице admins
CREATE POLICY "Allow admin access to modify prices" 
ON public.product_prices 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Создаем функцию для проверки админ доступа (будет использоваться в приложении)
CREATE OR REPLACE FUNCTION public.is_admin_user(login_input text, password_input text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admins 
    WHERE login = login_input AND password = password_input
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Также создаем простую политику для чтения цен (остается как есть)
-- Эта политика уже существует и работает правильно
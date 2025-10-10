-- Удаляем старую политику для админов
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

-- Создаем функцию для проверки, является ли текущая сессия админской
CREATE OR REPLACE FUNCTION public.is_current_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_login text;
BEGIN
  -- Получаем логин из контекста сессии
  admin_login := current_setting('app.admin_login', true);
  
  -- Если логина нет, возвращаем false
  IF admin_login IS NULL OR admin_login = '' THEN
    RETURN false;
  END IF;
  
  -- Проверяем, существует ли такой админ
  RETURN EXISTS (
    SELECT 1 FROM public.admins 
    WHERE login = admin_login
  );
END;
$$;

-- Создаем новую упрощенную политику для админов
CREATE POLICY "Admins can manage products"
ON public.products
FOR ALL
USING (public.is_current_admin())
WITH CHECK (public.is_current_admin());
-- Исправляем RLS политику для админов
-- Удаляем старую неправильную политику
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

-- Создаем правильную политику, которая проверяет аутентификацию админа
-- Используем функцию is_admin_user для проверки админских полномочий
CREATE POLICY "Admins can manage products" ON public.products
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE login = current_setting('app.admin_login', true) 
    AND password = current_setting('app.admin_password', true)
  )
);

-- Создаем функцию для установки контекста админа (будет вызываться из JS)
CREATE OR REPLACE FUNCTION public.set_admin_context(admin_login text, admin_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Проверяем, что пользователь действительно админ
  IF NOT EXISTS (
    SELECT 1 FROM public.admins 
    WHERE login = admin_login AND password = admin_password
  ) THEN
    RAISE EXCEPTION 'Invalid admin credentials';
  END IF;
  
  -- Устанавливаем контекст для текущей сессии
  PERFORM set_config('app.admin_login', admin_login, false);
  PERFORM set_config('app.admin_password', admin_password, false);
END;
$$;
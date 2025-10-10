-- Создаем упрощенную функцию для установки контекста администратора (только логин)
CREATE OR REPLACE FUNCTION public.set_admin_login_context(admin_login text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Проверяем, что такой админ существует
  IF NOT EXISTS (
    SELECT 1 FROM public.admins 
    WHERE login = admin_login
  ) THEN
    RAISE EXCEPTION 'Invalid admin login';
  END IF;
  
  -- Устанавливаем контекст для текущей сессии (только логин)
  PERFORM set_config('app.admin_login', admin_login, false);
END;
$$;
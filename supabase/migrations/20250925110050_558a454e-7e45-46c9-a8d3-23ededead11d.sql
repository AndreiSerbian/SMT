-- Исправляем все оставшиеся функции

CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.storage_public_url(bucket text, rel_path text, project_ref text)
RETURNS text
LANGUAGE sql
SET search_path = 'public'
AS $$
  SELECT 'https://bsndismiessofvhglzrv.supabase.co/storage/v1/object/public/product-media/rel_path'
$$;
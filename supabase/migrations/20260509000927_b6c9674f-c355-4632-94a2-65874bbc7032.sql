ALTER TABLE public.products_photos_backup_20260509 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage photos backup"
ON public.products_photos_backup_20260509
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
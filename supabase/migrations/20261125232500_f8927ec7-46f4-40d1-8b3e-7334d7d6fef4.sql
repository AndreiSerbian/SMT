ALTER POLICY "Anyone can insert contact requests" ON public.contact_requests TO anon, authenticated WITH CHECK (length(btrim(name)) > 0 AND length(btrim(phone)) > 0);
ALTER POLICY "Allow all operations on site settings" ON public.site_settings TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "Allow read access to site settings" ON public.site_settings TO anon, authenticated USING (key IN ('maintenance_mode', 'product_prices'));
ALTER POLICY "Admin users can modify prices" ON public.product_prices TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "Anyone can read product prices" ON public.product_prices TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_prices.product_id AND p.is_active = true));
DROP POLICY "Anyone can create orders" ON public.orders;
REVOKE INSERT ON public.orders FROM anon, authenticated;
GRANT INSERT ON public.orders TO service_role;
ALTER POLICY "Admin delete access for product media" ON storage.objects TO authenticated USING (bucket_id = 'product-media' AND public.has_role(auth.uid(), 'admin'::public.app_role));
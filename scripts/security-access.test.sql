-- Read-only regression checks; a failed check raises division by zero.
WITH checks(name, passed) AS (
  SELECT 'Direct client order creation is denied; server checkout remains allowed',
    NOT has_table_privilege('anon', 'public.orders', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.orders', 'INSERT')
    AND has_table_privilege('service_role', 'public.orders', 'INSERT')
    AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND cmd IN ('INSERT','ALL') AND roles && ARRAY['public','anon','authenticated']::name[])
  UNION ALL
  SELECT 'Site setting writes require an authenticated administrator',
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='site_settings' AND cmd='ALL' AND roles=ARRAY['authenticated']::name[] AND qual LIKE '%has_role(auth.uid(),%admin%' AND with_check LIKE '%has_role(auth.uid(),%admin%')
    AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='site_settings' AND cmd IN ('ALL','INSERT','UPDATE','DELETE') AND roles && ARRAY['public','anon']::name[])
  UNION ALL
  SELECT 'Legacy price writes require an authenticated administrator',
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_prices' AND cmd='ALL' AND roles=ARRAY['authenticated']::name[] AND qual LIKE '%has_role(auth.uid(),%admin%' AND with_check LIKE '%has_role(auth.uid(),%admin%')
    AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_prices' AND cmd IN ('ALL','INSERT','UPDATE','DELETE') AND roles && ARRAY['public','anon']::name[])
  UNION ALL
  SELECT 'Contact submissions require nonblank names and phone numbers',
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='contact_requests' AND cmd='INSERT' AND with_check LIKE '%length(btrim((name)::text)) > 0%' AND with_check LIKE '%length(btrim((phone)::text)) > 0%')
  UNION ALL
  SELECT 'Product file deletion requires an authenticated administrator',
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND cmd='DELETE' AND roles=ARRAY['authenticated']::name[] AND qual LIKE '%product-media%' AND qual LIKE '%has_role(auth.uid(),%admin%')
    AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND cmd IN ('DELETE','ALL') AND roles && ARRAY['public','anon']::name[])
)
SELECT name, passed, 1 / passed::integer AS assertion FROM checks;
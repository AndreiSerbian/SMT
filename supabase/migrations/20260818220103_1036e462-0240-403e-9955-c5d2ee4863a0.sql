-- P0: remove dangerous public-role ALL policy on b2b_clients.
-- Verified via anonymous REST call: SELECT on b2b_clients returned 200 with a real row.
-- service_role bypasses RLS entirely, so no replacement policy is created.
DROP POLICY IF EXISTS "Service role can manage b2b clients" ON public.b2b_clients;

-- Defence in depth: anon must not reach this table at all.
REVOKE ALL ON public.b2b_clients FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.b2b_clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.b2b_clients TO service_role;

-- P0: wb_clicks SELECT was open to role public with USING (true).
-- Verified via anonymous REST call: SELECT returned 200 with a real row.
-- Anonymous INSERT stays (click tracking depends on it).
DROP POLICY IF EXISTS "Admins can read WB clicks" ON public.wb_clicks;

CREATE POLICY "Admins can read WB clicks"
ON public.wb_clicks
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

REVOKE ALL ON public.wb_clicks FROM anon;
GRANT INSERT ON public.wb_clicks TO anon;
GRANT SELECT, INSERT ON public.wb_clicks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wb_clicks TO service_role;
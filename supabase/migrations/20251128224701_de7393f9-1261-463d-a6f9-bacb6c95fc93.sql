-- Fix security issues from previous migration

-- Drop and recreate the view without security definer
DROP VIEW IF EXISTS public.client_analytics;

CREATE VIEW public.client_analytics AS
SELECT 
  c.id,
  c.email,
  c.phone,
  c.company_name,
  c.contact_name,
  c.created_at,
  c.updated_at,
  COUNT(o.id) as total_orders,
  COALESCE(SUM(CASE 
    WHEN o.order_status IN ('shipped', 'delivered', 'completed') 
    THEN o.total 
    ELSE 0 
  END), 0) as total_revenue,
  MAX(o.created_at) as last_order_date,
  CASE 
    WHEN COUNT(o.id) = 0 THEN 'no_orders'
    WHEN COUNT(o.id) = 1 THEN 'new'
    WHEN COUNT(o.id) BETWEEN 2 AND 2 THEN 'returning'
    ELSE 'loyal'
  END as customer_segment
FROM public.b2b_clients c
LEFT JOIN public.orders o ON c.id = o.client_id
GROUP BY c.id, c.email, c.phone, c.company_name, c.contact_name, c.created_at, c.updated_at;

-- Fix function search_path
CREATE OR REPLACE FUNCTION public.update_b2b_clients_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
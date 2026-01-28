-- Create b2b_clients table
CREATE TABLE IF NOT EXISTS public.b2b_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  company_name TEXT,
  contact_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on b2b_clients
ALTER TABLE public.b2b_clients ENABLE ROW LEVEL SECURITY;

-- RLS policies for b2b_clients
CREATE POLICY "Anyone can read b2b clients"
  ON public.b2b_clients
  FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage b2b clients"
  ON public.b2b_clients
  FOR ALL
  USING (true);

-- Add client_id to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.b2b_clients(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_b2b_clients_email ON public.b2b_clients(email);
CREATE INDEX IF NOT EXISTS idx_b2b_clients_phone ON public.b2b_clients(phone);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON public.orders(client_id);

-- Trigger to update updated_at on b2b_clients
CREATE OR REPLACE FUNCTION public.update_b2b_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_b2b_clients_updated_at_trigger
  BEFORE UPDATE ON public.b2b_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_b2b_clients_updated_at();

-- Create analytics view for clients
CREATE OR REPLACE VIEW public.client_analytics AS
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

-- Migrate existing orders to create client records
INSERT INTO public.b2b_clients (email, phone, company_name, contact_name)
SELECT DISTINCT 
  LOWER(TRIM(email)) as email,
  phone,
  NULL as company_name,
  name as contact_name
FROM public.orders
WHERE email IS NOT NULL 
  AND email != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.b2b_clients 
    WHERE b2b_clients.email = LOWER(TRIM(orders.email))
  )
ON CONFLICT (email) DO NOTHING;

-- Update existing orders with client_id
UPDATE public.orders o
SET client_id = c.id
FROM public.b2b_clients c
WHERE LOWER(TRIM(o.email)) = c.email
  AND o.client_id IS NULL;

CREATE TABLE public.designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  sku text NOT NULL,
  qty integer NOT NULL DEFAULT 1,
  comment text,
  options jsonb DEFAULT '{}',
  objects_mm jsonb DEFAULT '{}',
  preview_urls jsonb DEFAULT '{}',
  production_pdf_url text,
  status text DEFAULT 'saved' CHECK (status IN ('saved','attached_to_cart','ordered')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert designs"
  ON public.designs FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read designs"
  ON public.designs FOR SELECT USING (true);

CREATE POLICY "Anyone can update designs"
  ON public.designs FOR UPDATE USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER designs_updated_at
  BEFORE UPDATE ON public.designs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

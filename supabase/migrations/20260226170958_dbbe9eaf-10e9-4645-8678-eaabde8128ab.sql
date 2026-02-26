
ALTER TABLE public.designs
ADD COLUMN IF NOT EXISTS customized_sides jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS production_pdf_filename text;

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png', 'video/mp4', 'video/webm', 'application/json', 'application/pdf']
WHERE id = 'product-media';

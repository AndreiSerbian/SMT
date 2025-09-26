-- Add category_id field to products table
ALTER TABLE public.products 
ADD COLUMN category_id UUID REFERENCES public.categories(id);

-- Create index for better performance
CREATE INDEX idx_products_category_id ON public.products(category_id);

-- Add comment for documentation
COMMENT ON COLUMN public.products.category_id IS 'Reference to category table for product categorization';
-- ============================================
-- CRITICAL SECURITY FIXES (CORRECTED)
-- ============================================

-- ============================================
-- 1. CREATE ROLE SYSTEM
-- ============================================

-- Create enum for user roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create user_roles table for proper authorization
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Drop existing policies on user_roles if they exist
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Allow users to read their own roles
CREATE POLICY "Users can read own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only admins can manage roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 2. SECURE ADMINS TABLE (REMOVE PUBLIC ACCESS)
-- ============================================

-- DROP the dangerous public SELECT policy
DROP POLICY IF EXISTS "Allow read access for authentication" ON public.admins;

-- Drop and recreate restrictive policy
DROP POLICY IF EXISTS "Only authenticated admins can read admins table" ON public.admins;
CREATE POLICY "Only authenticated admins can read admins table"
ON public.admins
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 3. SECURE B2B CLIENTS TABLE
-- ============================================

-- DROP the dangerous public access policy
DROP POLICY IF EXISTS "Anyone can read b2b clients" ON public.b2b_clients;

-- Drop existing admin policies and recreate
DROP POLICY IF EXISTS "Admins can read b2b clients" ON public.b2b_clients;
DROP POLICY IF EXISTS "Admins can insert b2b clients" ON public.b2b_clients;
DROP POLICY IF EXISTS "Admins can update b2b clients" ON public.b2b_clients;
DROP POLICY IF EXISTS "Admins can delete b2b clients" ON public.b2b_clients;

-- Allow authenticated admins to manage B2B clients
CREATE POLICY "Admins can read b2b clients"
ON public.b2b_clients
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert b2b clients"
ON public.b2b_clients
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update b2b clients"
ON public.b2b_clients
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete b2b clients"
ON public.b2b_clients
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 4. SECURE CLIENT_ANALYTICS VIEW
-- ============================================

-- Recreate the view with security_invoker to respect RLS policies
DROP VIEW IF EXISTS public.client_analytics;

CREATE VIEW public.client_analytics 
WITH (security_invoker = true)
AS
SELECT 
  c.id,
  c.email,
  c.phone,
  c.company_name,
  c.contact_name,
  c.created_at,
  c.updated_at,
  COUNT(o.id) AS total_orders,
  COALESCE(SUM(o.total), 0) AS total_revenue,
  MAX(o.created_at) AS last_order_date,
  CASE 
    WHEN COUNT(o.id) >= 10 THEN 'VIP'
    WHEN COUNT(o.id) >= 5 THEN 'Regular'
    ELSE 'New'
  END AS customer_segment
FROM public.b2b_clients c
LEFT JOIN public.orders o ON c.id = o.client_id
GROUP BY c.id, c.email, c.phone, c.company_name, c.contact_name, c.created_at, c.updated_at;

-- ============================================
-- 5. UPDATE EXISTING ADMIN POLICIES ON ORDERS
-- ============================================
-- Orders already have admin policies, but they use 'true' instead of has_role()
-- We'll update them to use proper role checking

DROP POLICY IF EXISTS "Admins can read orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;

-- Recreate with proper role checking
CREATE POLICY "Admins can read orders"
ON public.orders
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete orders"
ON public.orders
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 6. UPDATE PRODUCTS TABLE POLICIES
-- ============================================
-- Products uses is_current_admin() which we should replace with has_role()

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

CREATE POLICY "Admins can manage products"
ON public.products
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 7. UPDATE CATEGORIES TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;

CREATE POLICY "Admins can manage categories"
ON public.categories
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 8. UPDATE COLORS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Admins can manage colors" ON public.colors;

CREATE POLICY "Admins can manage colors"
ON public.colors
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 9. UPDATE OTHER TABLES
-- ============================================

-- Contact requests - add admin read access
DROP POLICY IF EXISTS "Admins can read contact requests" ON public.contact_requests;
CREATE POLICY "Admins can read contact requests"
ON public.contact_requests
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Box types - update admin policy
DROP POLICY IF EXISTS "Admins can manage box types" ON public.box_types;
CREATE POLICY "Admins can manage box types"
ON public.box_types
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Sizes - update admin policy
DROP POLICY IF EXISTS "Admins can manage sizes" ON public.sizes;
CREATE POLICY "Admins can manage sizes"
ON public.sizes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 10. ADD HELPER FUNCTION FOR ADMIN CREATION
-- ============================================

-- Function to create an admin user (to be called manually for first admin)
CREATE OR REPLACE FUNCTION public.make_user_admin(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Get user ID from email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Insert admin role if not exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RAISE NOTICE 'User % is now an admin', user_email;
END;
$$;
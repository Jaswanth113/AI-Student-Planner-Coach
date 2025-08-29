-- Create the food_catalog table
CREATE TABLE public.food_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.food_catalog ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow all authenticated users to read the food_catalog
CREATE POLICY "Allow authenticated users to read food_catalog"
ON public.food_catalog FOR SELECT
TO authenticated
USING (true);

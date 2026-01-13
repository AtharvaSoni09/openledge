-- Enable Row Level Security for public read access
-- This policy allows anyone to read the legislation table

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Enable read access for all users" ON public.legislation;

-- Allow public read access to legislation table
CREATE POLICY "Enable read access for all users" ON public.legislation
  FOR SELECT USING (true);

-- Apply RLS to the table
ALTER TABLE public.legislation ENABLE ROW LEVEL SECURITY;
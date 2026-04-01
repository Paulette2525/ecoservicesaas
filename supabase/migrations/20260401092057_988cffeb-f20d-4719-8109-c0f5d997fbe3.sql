ALTER TABLE public.visits 
  ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS sync_error text;
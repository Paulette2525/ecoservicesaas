
ALTER TABLE public.clients ADD COLUMN address text;
ALTER TABLE public.clients ADD COLUMN client_code text;

-- Move notes (which contain addresses) to the new address column
UPDATE public.clients SET address = notes, notes = NULL WHERE notes IS NOT NULL;

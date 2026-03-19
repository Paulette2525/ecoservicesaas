ALTER TABLE public.products
  ADD COLUMN price_ht numeric,
  ADD COLUMN price_ttc numeric,
  ADD COLUMN supplier text,
  ADD COLUMN code_article text;
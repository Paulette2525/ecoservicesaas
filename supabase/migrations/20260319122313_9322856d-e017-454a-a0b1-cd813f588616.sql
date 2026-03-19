
CREATE OR REPLACE FUNCTION public.get_distinct_product_filters()
RETURNS TABLE(filter_type text, filter_value text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 'category'::text AS filter_type, category AS filter_value
  FROM products WHERE category IS NOT NULL
  GROUP BY category
  UNION ALL
  SELECT 'supplier'::text AS filter_type, supplier AS filter_value
  FROM products WHERE supplier IS NOT NULL
  GROUP BY supplier
  ORDER BY filter_type, filter_value;
$$;

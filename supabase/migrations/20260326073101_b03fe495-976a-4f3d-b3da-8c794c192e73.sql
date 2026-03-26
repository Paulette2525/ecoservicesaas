
CREATE TYPE public.equivalence_type AS ENUM ('strict', 'avec_joint', 'sans_joint', 'autre_labo');

ALTER TABLE public.product_equivalences ADD COLUMN equivalence_type public.equivalence_type NOT NULL DEFAULT 'strict';

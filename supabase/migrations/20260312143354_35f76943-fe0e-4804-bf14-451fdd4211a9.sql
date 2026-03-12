
-- Enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'commercial');

-- Enum for visit status
CREATE TYPE public.visit_status AS ENUM ('opportunite', 'prise_de_contact', 'commande_probable');

-- Enum for demand status
CREATE TYPE public.demand_status AS ENUM ('disponible', 'en_rupture', 'en_commande');

-- Enum for urgency
CREATE TYPE public.urgency_level AS ENUM ('faible', 'moyenne', 'haute');

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table (separate as per security guidelines)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  city TEXT,
  sector TEXT,
  phone TEXT,
  email TEXT,
  commercial_id UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  stock_available INTEGER NOT NULL DEFAULT 0,
  supply_delay_days INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Product equivalences (many-to-many)
CREATE TABLE public.product_equivalences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  equivalent_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, equivalent_id),
  CHECK (product_id != equivalent_id)
);
ALTER TABLE public.product_equivalences ENABLE ROW LEVEL SECURITY;

-- Visits table
CREATE TABLE public.visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  commercial_id UUID NOT NULL REFERENCES auth.users(id),
  visit_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  location TEXT,
  status visit_status NOT NULL DEFAULT 'prise_de_contact',
  report TEXT,
  summary TEXT,
  audio_url TEXT,
  transcription TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

-- Visit products (products discussed during visit)
CREATE TABLE public.visit_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  estimated_quantity INTEGER,
  urgency urgency_level DEFAULT 'moyenne',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.visit_products ENABLE ROW LEVEL SECURITY;

-- Client demands
CREATE TABLE public.client_demands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  commercial_id UUID NOT NULL REFERENCES auth.users(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  status demand_status NOT NULL DEFAULT 'en_commande',
  demand_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_demands ENABLE ROW LEVEL SECURITY;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_client_demands_updated_at BEFORE UPDATE ON public.client_demands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- Profiles
CREATE POLICY "Authenticated users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "System can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Clients
CREATE POLICY "Authenticated users can view clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update clients" ON public.clients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete clients" ON public.clients FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Products
CREATE POLICY "Authenticated users can view products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins/managers can insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins/managers can update products" ON public.products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can delete products" ON public.products FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Product equivalences
CREATE POLICY "Authenticated users can view equivalences" ON public.product_equivalences FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins/managers can insert equivalences" ON public.product_equivalences FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins/managers can delete equivalences" ON public.product_equivalences FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Visits
CREATE POLICY "Authenticated users can view visits" ON public.visits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert visits" ON public.visits FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update visits" ON public.visits FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete visits" ON public.visits FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Visit products
CREATE POLICY "Authenticated users can view visit products" ON public.visit_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert visit products" ON public.visit_products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update visit products" ON public.visit_products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete visit products" ON public.visit_products FOR DELETE TO authenticated USING (true);

-- Client demands
CREATE POLICY "Authenticated users can view demands" ON public.client_demands FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert demands" ON public.client_demands FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update demands" ON public.client_demands FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete demands" ON public.client_demands FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for audio recordings
INSERT INTO storage.buckets (id, name, public) VALUES ('visit-recordings', 'visit-recordings', false);
CREATE POLICY "Authenticated users can upload recordings" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'visit-recordings');
CREATE POLICY "Authenticated users can view recordings" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'visit-recordings');

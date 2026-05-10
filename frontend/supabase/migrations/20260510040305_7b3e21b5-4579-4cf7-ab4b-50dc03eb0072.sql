CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,

  -- FMCSA
  dot_number TEXT,
  mc_number TEXT,
  legal_name TEXT,
  dba_name TEXT,
  authority_status TEXT,
  operating_status TEXT,
  power_units INTEGER,
  drivers_count INTEGER,
  safety_rating TEXT,
  safety_rating_date DATE,
  oos_rate_vehicle NUMERIC,
  oos_rate_driver NUMERIC,
  hq_address TEXT,
  mcs150_mileage BIGINT,
  mcs150_date DATE,
  inspections_24mo INTEGER,
  oos_inspections_24mo INTEGER,
  fmcsa_raw JSONB,

  -- Website scrape
  website_url TEXT,
  about TEXT,
  services TEXT,
  culture TEXT,
  contact_info TEXT,
  logo_url TEXT,
  scrape_raw JSONB,

  -- ICP
  preferred_lanes TEXT[] DEFAULT '{}',
  equipment_types TEXT[] DEFAULT '{}',
  experience_level TEXT,
  hazmat_required BOOLEAN DEFAULT false,
  pay_min NUMERIC,
  pay_max NUMERIC,
  home_time_policy TEXT,
  benefits TEXT[] DEFAULT '{}',

  onboarding_step INTEGER NOT NULL DEFAULT 1,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies are viewable by everyone"
  ON public.companies FOR SELECT
  USING (true);

CREATE POLICY "Recruiters can insert their own company"
  ON public.companies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Recruiters can update their own company"
  ON public.companies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Recruiters can delete their own company"
  ON public.companies FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_companies_user_id ON public.companies(user_id);
CREATE INDEX idx_companies_dot ON public.companies(dot_number);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
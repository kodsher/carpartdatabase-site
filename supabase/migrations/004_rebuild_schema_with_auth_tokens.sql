-- ============================================================================
-- UPDATED DATABASE SCHEMA WITH AUTH + TOKENS + JUNKYARDS
-- This replaces the previous schema for the new requirements
-- ============================================================================

-- Drop old tables if they exist (clean slate)
DROP TABLE IF EXISTS compatibility CASCADE;
DROP TABLE IF EXISTS parts CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP FUNCTION IF EXISTS search_parts CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- UPDATED AT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PROFILES TABLE (extends Supabase Auth)
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'guest')),
  oauth_provider TEXT CHECK (oauth_provider IN ('google', 'github', 'microsoft')),
  oauth_provider_id TEXT,
  tokens INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- JUNKYARDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS junkyards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  website TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  scrap_url TEXT,
  ebay_search_query TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_junkyards_created_by ON junkyards(created_by);
CREATE INDEX IF NOT EXISTS idx_junkyards_city_state ON junkyards(city, state);
CREATE INDEX IF NOT EXISTS idx_junkyards_name ON junkyards USING gin(to_tsvector('english', name));

-- Enable RLS
ALTER TABLE junkyards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all junkyards"
  ON junkyards FOR SELECT
  USING (true);

CREATE POLICY "Users can create junkyards"
  ON junkyards FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own junkyards"
  ON junkyards FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own junkyards"
  ON junkyards FOR DELETE
  USING (auth.uid() = created_by);

-- Trigger for updated_at
CREATE TRIGGER update_junkyards_updated_at BEFORE UPDATE ON junkyards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- JUNKYARD VEHICLES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS junkyard_vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  junkyard_id UUID NOT NULL REFERENCES junkyards(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  vin TEXT,
  trim TEXT,
  engine TEXT,
  transmission TEXT,
  color TEXT,
  mileage INTEGER,
  notes TEXT,
  source_url TEXT,
  scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_junkyard_vehicles_junkyard_id ON junkyard_vehicles(junkyard_id);
CREATE INDEX IF NOT EXISTS idx_junkyard_vehicles_make_model_year ON junkyard_vehicles(make, model, year);
CREATE INDEX IF NOT EXISTS idx_junkyard_vehicles_vin ON junkyard_vehicles(vin) WHERE vin IS NOT NULL;

-- Enable RLS
ALTER TABLE junkyard_vehicles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all vehicles"
  ON junkyard_vehicles FOR SELECT
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_junkyard_vehicles_updated_at BEFORE UPDATE ON junkyard_vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VEHICLE PARTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS vehicle_parts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  junkyard_vehicle_id UUID REFERENCES junkyard_vehicles(id) ON DELETE SET NULL,
  junkyard_id UUID NOT NULL REFERENCES junkyards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  part_number TEXT,
  category TEXT CHECK (category IN ('engine', 'transmission', 'brakes', 'suspension', 'electrical', 'body', 'interior', 'other')),
  condition TEXT CHECK (condition IN ('new', 'used', 'refurbished', 'oem')),
  price DECIMAL(10, 2),
  available BOOLEAN DEFAULT true,
  notes TEXT,
  images TEXT[],
  source TEXT CHECK (source IN ('junkyard', 'ebay', 'analysis')),
  source_url TEXT,
  scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_parts_junkyard_id ON vehicle_parts(junkyard_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_parts_vehicle_id ON vehicle_parts(junkyard_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_parts_category ON vehicle_parts(category);
CREATE INDEX IF NOT EXISTS idx_vehicle_parts_available ON vehicle_parts(available);
CREATE INDEX IF NOT EXISTS idx_vehicle_parts_name_search ON vehicle_parts USING gin(to_tsvector('english', name));

-- Enable RLS
ALTER TABLE vehicle_parts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all parts"
  ON vehicle_parts FOR SELECT
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_vehicle_parts_updated_at BEFORE UPDATE ON vehicle_parts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TOKEN TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  operation_type TEXT CHECK (operation_type IN ('scrape_junkyard', 'search_ebay', 'run_analysis', 'add_junkyard', 'purchase')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_token_transactions_user_id ON token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_type ON token_transactions(type);
CREATE INDEX IF NOT EXISTS idx_token_transactions_created_at ON token_transactions(created_at DESC);

-- Enable RLS
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own transactions"
  ON token_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- SCRAPING CONFIGS TABLE (for future use)
-- ============================================================================

CREATE TABLE IF NOT EXISTS scraping_configs (
  junkyard_id UUID PRIMARY KEY REFERENCES junkyards(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  selector_rules JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE scraping_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view scraping configs for their junkyards"
  ON scraping_configs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM junkyards
      WHERE junkyards.id = scraping_configs.junkyard_id
      AND junkyards.created_by = auth.uid()
    )
  );

-- ============================================================================
-- SCRAPING JOBS TABLE (for future use)
-- ============================================================================

CREATE TABLE IF NOT EXISTS scraping_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  junkyard_id UUID NOT NULL REFERENCES junkyards(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('junkyard', 'ebay')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  vehicles_found INTEGER,
  parts_found INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_junkyard_id ON scraping_jobs(junkyard_id);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_created_at ON scraping_jobs(created_at DESC);

-- Enable RLS
ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view jobs for their junkyards"
  ON scraping_jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM junkyards
      WHERE junkyards.id = scraping_jobs.junkyard_id
      AND junkyards.created_by = auth.uid()
    )
  );

-- ============================================================================
-- ANALYSIS REQUESTS TABLE (for future use)
-- ============================================================================

CREATE TABLE IF NOT EXISTS analysis_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  part_id UUID REFERENCES vehicle_parts(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES junkyard_vehicles(id) ON DELETE SET NULL,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('market_price', 'compatibility', 'availability')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_analysis_requests_user_id ON analysis_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_requests_status ON analysis_requests(status);
CREATE INDEX IF NOT EXISTS idx_analysis_requests_created_at ON analysis_requests(created_at DESC);

-- Enable RLS
ALTER TABLE analysis_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own analysis requests"
  ON analysis_requests FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- AUTOMATIC PROFILE CREATION ON SIGNUP
-- ============================================================================

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, tokens)
  VALUES (
    NEW.id,
    NEW.email,
    'user',
    100 -- Default starting tokens
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Trigger to call function on new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- HELPER FUNCTIONS FOR TOKENS
-- ============================================================================

-- Function to check if user has enough tokens
CREATE OR REPLACE FUNCTION check_user_token_balance(user_id UUID, required_tokens INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT (tokens >= required_tokens)
    FROM profiles
    WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deduct tokens
CREATE OR REPLACE FUNCTION deduct_tokens(user_id UUID, amount INTEGER, operation_type TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  -- Get current balance
  SELECT tokens INTO current_balance
  FROM profiles
  WHERE id = user_id
  FOR UPDATE;

  -- Check balance
  IF current_balance < amount THEN
    RETURN false;
  END IF;

  -- Deduct tokens
  UPDATE profiles
  SET tokens = tokens - amount
  WHERE id = user_id;

  -- Record transaction
  INSERT INTO token_transactions (user_id, type, amount, description, operation_type)
  VALUES (
    user_id,
    'debit',
    amount,
    CASE operation_type
      WHEN 'scrape_junkyard' THEN 'Scraped junkyard inventory'
      WHEN 'search_ebay' THEN 'Searched eBay for parts'
      WHEN 'run_analysis' THEN 'Ran part analysis'
      WHEN 'add_junkyard' THEN 'Added new junkyard'
      ELSE 'Token deduction'
    END,
    operation_type
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add tokens
CREATE OR REPLACE FUNCTION add_tokens(user_id UUID, amount INTEGER, description TEXT)
RETURNS VOID AS $$
BEGIN
  -- Add tokens
  UPDATE profiles
  SET tokens = tokens + amount
  WHERE id = user_id;

  -- Record transaction
  INSERT INTO token_transactions (user_id, type, amount, description, operation_type)
  VALUES (user_id, 'credit', amount, description, 'purchase');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SEARCH FUNCTION FOR PARTS
-- ============================================================================

CREATE OR REPLACE FUNCTION search_vehicle_parts(
  search_query TEXT DEFAULT NULL,
  search_category TEXT DEFAULT NULL,
  search_condition TEXT DEFAULT NULL,
  search_junkyard_id UUID DEFAULT NULL,
  min_price DECIMAL DEFAULT NULL,
  max_price DECIMAL DEFAULT NULL,
  available_only BOOLEAN DEFAULT NULL,
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  part_number TEXT,
  category TEXT,
  condition TEXT,
  price DECIMAL,
  available BOOLEAN,
  junkyard_id UUID,
  junkyard_name TEXT,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  source TEXT,
  images TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    vp.id,
    vp.name,
    vp.part_number,
    vp.category,
    vp.condition,
    vp.price,
    vp.available,
    vp.junkyard_id,
    j.name as junkyard_name,
    jv.make as vehicle_make,
    jv.model as vehicle_model,
    jv.year as vehicle_year,
    vp.source,
    vp.images
  FROM vehicle_parts vp
  LEFT JOIN junkyards j ON vp.junkyard_id = j.id
  LEFT JOIN junkyard_vehicles jv ON vp.junkyard_vehicle_id = jv.id
  WHERE
    (search_query IS NULL OR
     vp.name ILIKE '%' || search_query || '%' OR
     vp.part_number ILIKE '%' || search_query || '%' OR
     vp.notes ILIKE '%' || search_query || '%')
    AND (search_category IS NULL OR vp.category = search_category)
    AND (search_condition IS NULL OR vp.condition = search_condition)
    AND (search_junkyard_id IS NULL OR vp.junkyard_id = search_junkyard_id)
    AND (min_price IS NULL OR vp.price >= min_price)
    AND (max_price IS NULL OR vp.price <= max_price)
    AND (available_only IS NULL OR (available_only = TRUE AND vp.available = TRUE) OR (available_only = FALSE))
  ORDER BY vp.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FIX FOR JUNKYARD VEHICLES - ALLOW NULL JUNKYARD_ID AND CREATE DEFAULT JUNKYARD
-- ============================================================================

-- First, drop existing tables if they exist
DROP TABLE IF EXISTS vehicle_parts CASCADE;
DROP TABLE IF EXISTS junkyard_vehicles CASCADE;
DROP TABLE IF EXISTS junkyards CASCADE;
DROP TABLE IF EXISTS scraping_configs CASCADE;
DROP TABLE IF EXISTS scraping_jobs CASCADE;
DROP TABLE IF EXISTS analysis_requests CASCADE;
DROP TABLE IF EXISTS token_transactions CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS check_user_token_balance() CASCADE;
DROP FUNCTION IF EXISTS deduct_tokens() CASCADE;
DROP FUNCTION IF EXISTS add_tokens() CASCADE;
DROP FUNCTION IF EXISTS search_vehicle_parts() CASCADE;

-- ============================================================================
-- ENABLE EXTENSIONS
-- ============================================================================

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
-- JUNKYARDS TABLE (simplified, created first)
-- ============================================================================

CREATE TABLE junkyards (
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
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create a default junkyard for scraped vehicles
INSERT INTO junkyards (id, name, description, website, scrap_url)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'WrenchAPart',
  'Scraped from WrenchAPart API',
  'https://wrenchapart.com',
  'https://api.wrenchapart.com/v1/vehicles?makeId=0'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- JUNKYARD VEHICLES TABLE (junkyard_id now nullable)
-- ============================================================================

CREATE TABLE junkyard_vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  junkyard_id UUID REFERENCES junkyards(id) ON DELETE SET NULL,
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
CREATE INDEX idx_junkyard_vehicles_junkyard_id ON junkyard_vehicles(junkyard_id);
CREATE INDEX idx_junkyard_vehicles_make_model_year ON junkyard_vehicles(make, model, year);

-- Enable RLS
ALTER TABLE junkyard_vehicles ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view vehicles (for now)
CREATE POLICY "Allow all to view vehicles"
  ON junkyard_vehicles FOR SELECT
  USING (true);

-- Allow service role to insert
CREATE POLICY "Allow service role to insert vehicles"
  ON junkyard_vehicles FOR INSERT
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_junkyard_vehicles_updated_at BEFORE UPDATE ON junkyard_vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- OTHER TABLES (optional for now)
-- ============================================================================

CREATE TABLE IF NOT EXISTS vehicle_parts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  junkyard_vehicle_id UUID REFERENCES junkyard_vehicles(id) ON DELETE SET NULL,
  junkyard_id UUID REFERENCES junkyards(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  part_number TEXT,
  category TEXT,
  condition TEXT,
  price DECIMAL(10, 2),
  available BOOLEAN DEFAULT true,
  notes TEXT,
  images TEXT[],
  source TEXT,
  source_url TEXT,
  scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE vehicle_parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all to view parts" ON vehicle_parts FOR SELECT USING (true);
CREATE TRIGGER update_vehicle_parts_updated_at BEFORE UPDATE ON vehicle_parts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

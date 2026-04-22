-- ============================================================================
-- PYP (PICK YOUR PART) VEHICLES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS pyp_vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id TEXT NOT NULL,
  location_name TEXT NOT NULL,
  year INTEGER NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  trim TEXT,
  vin TEXT,
  color TEXT,
  section TEXT,
  row TEXT,
  space TEXT,
  stock_number TEXT,
  available_date TIMESTAMPTZ,
  source_url TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  scraped_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- Create indexes
CREATE INDEX idx_pyp_vehicles_location_id ON pyp_vehicles(location_id);
CREATE INDEX idx_pyp_vehicles_year ON pyp_vehicles(year);
CREATE INDEX idx_pyp_vehicles_make ON pyp_vehicles(make);
CREATE INDEX idx_pyp_vehicles_model ON pyp_vehicles(model);
CREATE INDEX idx_pyp_vehicles_stock_number ON pyp_vehicles(stock_number);
CREATE INDEX idx_pyp_vehicles_available_date ON pyp_vehicles(available_date);
CREATE INDEX idx_pyp_vehicles_scraped_at ON pyp_vehicles(scraped_at);
CREATE INDEX idx_pyp_vehicles_vin_stock ON pyp_vehicles(vin, stock_number);

-- Enable RLS
ALTER TABLE pyp_vehicles ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view vehicles
CREATE POLICY "Allow all to view pyp_vehicles"
  ON pyp_vehicles FOR SELECT
  USING (true);

-- Allow service role to insert
CREATE POLICY "Allow service role to insert pyp_vehicles"
  ON pyp_vehicles FOR INSERT
  WITH CHECK (true);

-- Allow service role to update
CREATE POLICY "Allow service role to update pyp_vehicles"
  ON pyp_vehicles FOR UPDATE
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_pyp_vehicles_updated_at BEFORE UPDATE ON pyp_vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

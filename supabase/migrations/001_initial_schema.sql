-- ============================================================================
-- Initial Database Schema for Car Part Database
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'guest')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update timestamp trigger for users
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PARTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS parts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'engine', 'transmission', 'brakes', 'suspension',
    'electrical', 'body', 'interior', 'other'
  )),
  condition TEXT NOT NULL CHECK (condition IN ('new', 'used', 'refurbished', 'oem')),
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  brand TEXT,
  oem_number TEXT,
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for parts table
CREATE INDEX idx_parts_category ON parts(category);
CREATE INDEX idx_parts_condition ON parts(condition);
CREATE INDEX idx_parts_price ON parts(price);
CREATE INDEX idx_parts_stock ON parts(stock);
CREATE INDEX idx_parts_part_number ON parts(part_number);
CREATE INDEX idx_parts_name_trgm ON parts USING gin(to_tsvector('english', name));

-- Update timestamp trigger for parts
CREATE TRIGGER parts_updated_at
  BEFORE UPDATE ON parts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMPATIBILITY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS compatibility (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  part_id UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year_start INTEGER NOT NULL,
  year_end INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for compatibility
CREATE INDEX idx_compatibility_part_id ON compatibility(part_id);
CREATE INDEX idx_compatibility_make ON compatibility(make);
CREATE INDEX idx_compatibility_model ON compatibility(model);
CREATE INDEX idx_compatibility_years ON compatibility(year_start, year_end);
CREATE INDEX idx_compatibility_full ON compatibility(make, model, year_start, year_end);

-- ============================================================================
-- SEARCH FUNCTION
-- ============================================================================

-- Function to search parts with filters
CREATE OR REPLACE FUNCTION search_parts(
  search_query TEXT DEFAULT NULL,
  search_category TEXT DEFAULT NULL,
  search_condition TEXT DEFAULT NULL,
  min_price DECIMAL DEFAULT NULL,
  max_price DECIMAL DEFAULT NULL,
  in_stock BOOLEAN DEFAULT NULL,
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  part_number TEXT,
  name TEXT,
  description TEXT,
  category TEXT,
  condition TEXT,
  price DECIMAL,
  stock INTEGER,
  brand TEXT,
  oem_number TEXT,
  images TEXT[],
  compatibility_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.part_number,
    p.name,
    p.description,
    p.category,
    p.condition,
    p.price,
    p.stock,
    p.brand,
    p.oem_number,
    p.images,
    COUNT(c.id) as compatibility_count
  FROM parts p
  LEFT JOIN compatibility c ON p.id = c.part_id
  WHERE
    (search_query IS NULL OR
     p.name ILIKE '%' || search_query || '%' OR
     p.part_number ILIKE '%' || search_query || '%' OR
     p.description ILIKE '%' || search_query || '%' OR
     p.brand ILIKE '%' || search_query || '%' OR
     p.oem_number ILIKE '%' || search_query || '%')
    AND (search_category IS NULL OR p.category = search_category)
    AND (search_condition IS NULL OR p.condition = search_condition)
    AND (min_price IS NULL OR p.price >= min_price)
    AND (max_price IS NULL OR p.price <= max_price)
    AND (in_stock IS NULL OR (in_stock = TRUE AND p.stock > 0) OR (in_stock = FALSE))
  GROUP BY p.id
  ORDER BY p.name
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

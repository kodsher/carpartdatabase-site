-- ============================================================================
-- USER INVENTORY TABLE
-- ============================================================================

-- Table to store user's saved inventory (references junkyard_vehicles)
CREATE TABLE IF NOT EXISTS user_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  vehicle_id UUID NOT NULL REFERENCES junkyard_vehicles(id) ON DELETE CASCADE,
  notes TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, vehicle_id) -- Prevent duplicates
);

-- Indexes for performance
CREATE INDEX idx_user_inventory_user_id ON user_inventory(user_id);
CREATE INDEX idx_user_inventory_vehicle_id ON user_inventory(vehicle_id);
CREATE INDEX idx_user_inventory_added_at ON user_inventory(added_at DESC);

-- Enable RLS
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own inventory
CREATE POLICY "Users can view own inventory"
  ON user_inventory FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Policy: Users can add to their own inventory
CREATE POLICY "Users can add to own inventory"
  ON user_inventory FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- Policy: Users can delete from their own inventory
CREATE POLICY "Users can delete from own inventory"
  ON user_inventory FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- Policy: Users can update notes on their own inventory
CREATE POLICY "Users can update own inventory"
  ON user_inventory FOR UPDATE
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

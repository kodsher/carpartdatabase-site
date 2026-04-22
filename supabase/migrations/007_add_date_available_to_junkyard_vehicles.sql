-- ============================================================================
-- ADD DATE_AVAILABLE COLUMN TO JUNKYARD_VEHICLES
-- ============================================================================

ALTER TABLE junkyard_vehicles
ADD COLUMN IF NOT EXISTS date_available TIMESTAMPTZ;

-- Create index for date_available for faster queries
CREATE INDEX IF NOT EXISTS idx_junkyard_vehicles_date_available
ON junkyard_vehicles(date_available);

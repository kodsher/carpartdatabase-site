-- Add yard column to junkyard_vehicles table
ALTER TABLE junkyard_vehicles
ADD COLUMN IF NOT EXISTS yard TEXT;

-- Create index for yard for faster queries
CREATE INDEX IF NOT EXISTS idx_junkyard_vehicles_yard
ON junkyard_vehicles(yard);

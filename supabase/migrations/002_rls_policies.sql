-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- ============================================================================
-- USERS TABLE RLS
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view public user data (we'll expand this later)
CREATE POLICY "Users are viewable by everyone"
  ON users FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow users to insert their own data (via auth trigger, typically)
CREATE POLICY "Users can insert their own data"
  ON users FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ============================================================================
-- PARTS TABLE RLS
-- ============================================================================

ALTER TABLE parts ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view parts (public catalog)
CREATE POLICY "Parts are viewable by everyone"
  ON parts FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only admins can insert parts
CREATE POLICY "Admins can insert parts"
  ON parts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Only admins can update parts
CREATE POLICY "Admins can update parts"
  ON parts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Only admins can delete parts
CREATE POLICY "Admins can delete parts"
  ON parts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- ============================================================================
-- COMPATIBILITY TABLE RLS
-- ============================================================================

ALTER TABLE compatibility ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view compatibility data
CREATE POLICY "Compatibility is viewable by everyone"
  ON compatibility FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only admins can insert compatibility data
CREATE POLICY "Admins can insert compatibility"
  ON compatibility FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Only admins can update compatibility data
CREATE POLICY "Admins can update compatibility"
  ON compatibility FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Only admins can delete compatibility data
CREATE POLICY "Admins can delete compatibility"
  ON compatibility FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

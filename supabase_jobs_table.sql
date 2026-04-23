-- Create jobs table for triggering local scripts
CREATE TABLE IF NOT EXISTS jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  command TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'error')),
  result TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create index for pending jobs
CREATE INDEX IF NOT EXISTS idx_jobs_status_created_at ON jobs(status, created_at)
  WHERE status = 'pending';

-- Enable Realtime for the jobs table
alter publication supabase_realtime add table jobs;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to update completed_at when status changes to completed or error
CREATE OR REPLACE FUNCTION update_completed_at_column()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('completed', 'error') AND (OLD.status IS NULL OR OLD.status NOT IN ('completed', 'error')) THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for completed_at
CREATE TRIGGER update_jobs_completed_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_completed_at_column();

-- Comment
COMMENT ON TABLE jobs IS 'Jobs to be executed by local machine workers';
COMMENT ON COLUMN jobs.command IS 'Command/script to execute';
COMMENT ON COLUMN jobs.status IS 'Job status: pending, running, completed, error';
COMMENT ON COLUMN jobs.result IS 'Output from the command execution';
COMMENT ON COLUMN jobs.error IS 'Error message if execution failed';

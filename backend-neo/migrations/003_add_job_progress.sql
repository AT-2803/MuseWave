-- Add progress tracking columns to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS message TEXT;

-- Create index for faster job status queries
CREATE INDEX IF NOT EXISTS idx_jobs_status_progress ON jobs(status, progress);

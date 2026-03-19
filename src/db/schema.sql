-- Required for `gen_random_uuid()`
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ================================
-- Jobs Table
-- ================================
CREATE TABLE IF NOT EXISTS jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bull_job_id   VARCHAR(255) UNIQUE,
  type          VARCHAR(50) NOT NULL,
  priority      VARCHAR(10) NOT NULL DEFAULT 'medium',
  status        VARCHAR(20) NOT NULL DEFAULT 'queued',
  data          JSONB NOT NULL DEFAULT '{}',
  result        JSONB,
  error         TEXT,
  attempts      INTEGER DEFAULT 0,
  max_attempts  INTEGER DEFAULT 3,
  duration_ms   INTEGER,
  scheduled_for TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================
-- Job Logs Table (audit trail)
-- ================================
CREATE TABLE IF NOT EXISTS job_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id     UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  event      VARCHAR(50) NOT NULL,
  message    TEXT,
  meta       JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================
-- Indexes
-- ================================
CREATE INDEX IF NOT EXISTS idx_jobs_status      ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type        ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at  ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_bull_job_id ON jobs(bull_job_id);
CREATE INDEX IF NOT EXISTS idx_job_logs_job_id  ON job_logs(job_id);

-- ================================
-- Auto-update updated_at trigger
-- ================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS jobs_updated_at ON jobs;
CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
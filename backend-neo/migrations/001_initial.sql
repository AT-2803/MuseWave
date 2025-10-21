-- Initial migration for MuseWave backend
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  owner TEXT NOT NULL,
  rate_limit_per_min INT NOT NULL DEFAULT 60,
  created_at TIMESTAMP DEFAULT now(),
  disabled_at TIMESTAMP
);

CREATE TABLE rate_counters (
  api_key_id UUID REFERENCES api_keys(id),
  window_start_ms BIGINT NOT NULL,
  tokens INT NOT NULL,
  PRIMARY KEY (api_key_id, window_start_ms)
);

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  params JSONB NOT NULL,
  result JSONB,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  error TEXT,
  parent_id UUID REFERENCES jobs(id),
  api_key_id UUID REFERENCES api_keys(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kind TEXT NOT NULL,
  mime TEXT NOT NULL,
  path TEXT NOT NULL,
  duration_sec REAL,
  meta JSONB,
  job_id UUID REFERENCES jobs(id),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE ngram_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  order_n INT NOT NULL DEFAULT 3,
  vocab JSONB NOT NULL,
  trans_prob JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
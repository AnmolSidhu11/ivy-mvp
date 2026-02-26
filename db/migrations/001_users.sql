-- Users (reps)
CREATE TABLE IF NOT EXISTS users (
  user_id   TEXT PRIMARY KEY,
  name      TEXT,
  role      TEXT,
  territory TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

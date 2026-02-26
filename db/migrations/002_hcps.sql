-- HCPs
CREATE TABLE IF NOT EXISTS hcps (
  hcp_id    TEXT PRIMARY KEY,
  name      TEXT,
  specialty TEXT,
  clinic    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

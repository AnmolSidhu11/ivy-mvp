-- Sync status for loader (pending / synced / failed)
CREATE TABLE IF NOT EXISTS sync_status (
  event_id   UUID PRIMARY KEY,
  status     TEXT NOT NULL DEFAULT 'pending',
  last_error TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

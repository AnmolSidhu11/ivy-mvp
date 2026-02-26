-- Append-only event store (CALL / EXPENSE / SAFETY)
CREATE TABLE IF NOT EXISTS events_raw (
  event_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      TEXT NOT NULL,
  payload_json    JSONB NOT NULL,
  user_id         TEXT,
  hcp_id          TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  idempotency_key TEXT UNIQUE
);

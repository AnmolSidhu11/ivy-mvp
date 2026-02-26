-- Mutable call drafts (missing-fields loop)
CREATE TABLE IF NOT EXISTS call_drafts (
  draft_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT,
  hcp_id     TEXT,
  event_id   UUID,
  draft_json JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

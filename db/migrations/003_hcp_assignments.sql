-- Rep-to-HCP assignments (RBAC scope)
CREATE TABLE IF NOT EXISTS hcp_assignments (
  user_id TEXT NOT NULL,
  hcp_id  TEXT NOT NULL,
  PRIMARY KEY (user_id, hcp_id)
);

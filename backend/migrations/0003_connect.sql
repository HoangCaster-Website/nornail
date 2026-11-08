-- One merchant per Stripe mode. Invite credentials and OAuth states are hashed.
CREATE TABLE stripe_merchants (
  mode TEXT PRIMARY KEY CHECK(mode IN ('test','live')),
  account_id TEXT NOT NULL,
  status TEXT NOT NULL,
  checked_at TEXT NOT NULL
);
CREATE TABLE connect_invites (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  mode TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'invited',
  account_id TEXT,
  expires INTEGER NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE connect_states (
  state_hash TEXT PRIMARY KEY,
  invite_id TEXT NOT NULL REFERENCES connect_invites(id),
  expires INTEGER NOT NULL
);
CREATE TABLE connect_sessions (
  token_hash TEXT PRIMARY KEY,
  invite_id TEXT NOT NULL REFERENCES connect_invites(id),
  verified_account TEXT,
  expires INTEGER NOT NULL
);
ALTER TABLE orders ADD COLUMN stripe_account TEXT;

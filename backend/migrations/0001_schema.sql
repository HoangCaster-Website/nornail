CREATE TABLE products (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL CHECK(json_valid(data)),
  position INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE settings (id INTEGER PRIMARY KEY CHECK(id = 1), data TEXT NOT NULL CHECK(json_valid(data)));
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, expires INTEGER NOT NULL);
CREATE INDEX sessions_expiry ON sessions(expires);
CREATE TABLE rate_limits (bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
CREATE INDEX rate_limits_expiry ON rate_limits(expires);
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  items TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  session_id TEXT UNIQUE,
  email TEXT,
  created_at TEXT NOT NULL,
  paid_at TEXT
);
CREATE INDEX orders_created ON orders(created_at DESC);
CREATE TABLE stripe_events (id TEXT PRIMARY KEY);

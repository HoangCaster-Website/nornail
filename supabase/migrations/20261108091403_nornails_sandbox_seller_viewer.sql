-- Scoped read-only access for the seller; the raw capability is never stored here.
ALTER TABLE public.nornails_sandbox_config
  ADD COLUMN seller_viewer_hash TEXT
  CHECK (seller_viewer_hash IS NULL OR seller_viewer_hash ~ '^[a-f0-9]{64}$');

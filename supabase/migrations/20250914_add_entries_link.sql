-- Add optional link column to entries if missing (production schema parity)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'entries'
      AND column_name  = 'link'
  ) THEN
    ALTER TABLE public.entries
      ADD COLUMN link text NULL;
  END IF;
END $$;

-- Ensure unique constraint on (subscription_id, guid_hash) exists (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'entries_subscription_id_guid_hash_key'
  ) THEN
    ALTER TABLE public.entries
      ADD CONSTRAINT entries_subscription_id_guid_hash_key
      UNIQUE (subscription_id, guid_hash);
  END IF;
END $$;

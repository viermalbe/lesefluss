-- Relax ktln_email constraints so plain RSS feeds can be added without a KTNL address
-- 1) Make column nullable
ALTER TABLE public.subscriptions
  ALTER COLUMN ktln_email DROP NOT NULL;

-- 2) Drop unique constraint (name may vary; this is the common default)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscriptions_ktln_email_key'
  ) THEN
    ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_ktln_email_key;
  END IF;
END $$;

-- 3) Also drop a unique index if it was created separately (defensive)
DROP INDEX IF EXISTS public.subscriptions_ktln_email_key;

-- Optional: if you want to fully drop the column later, use:
-- ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS ktln_email;

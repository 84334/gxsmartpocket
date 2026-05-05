ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS allocation_allowance_pct numeric NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS allocation_savings_pct numeric NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS allocation_backup_pct numeric NOT NULL DEFAULT 10;
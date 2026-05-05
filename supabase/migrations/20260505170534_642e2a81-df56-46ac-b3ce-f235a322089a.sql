ALTER TABLE public.savings_goals 
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS in_wallet boolean NOT NULL DEFAULT false;
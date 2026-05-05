ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_spending_limit numeric NOT NULL DEFAULT 20;
ALTER TABLE public.savings_goals ADD COLUMN IF NOT EXISTS daily_save_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.savings_goals ADD COLUMN IF NOT EXISTS last_saved_on date;
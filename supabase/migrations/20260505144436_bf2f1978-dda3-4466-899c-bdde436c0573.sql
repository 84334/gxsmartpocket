ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS streak_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_goal_days integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS last_streak_date date;
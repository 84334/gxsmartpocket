ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS primary_transport text,
  ADD COLUMN IF NOT EXISTS non_negotiables text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;
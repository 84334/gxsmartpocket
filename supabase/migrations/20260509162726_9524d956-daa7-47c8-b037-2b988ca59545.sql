REVOKE ALL ON FUNCTION public.recalculate_savings_streak(uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_daily_auto_savings(date) FROM PUBLIC, anon, authenticated;
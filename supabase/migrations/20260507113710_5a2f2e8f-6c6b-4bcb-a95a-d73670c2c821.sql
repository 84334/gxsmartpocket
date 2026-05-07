
CREATE TABLE public.savings_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pocket_id uuid REFERENCES public.savings_goals(id) ON DELETE SET NULL,
  kind text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  daily_limit numeric(12,2),
  daily_spend numeric(12,2),
  remaining_budget numeric(12,2),
  total_required numeric(12,2),
  status text,
  note text,
  occurred_on date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.savings_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tx all" ON public.savings_transactions
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX savings_tx_user_date_idx ON public.savings_transactions(user_id, occurred_on DESC);

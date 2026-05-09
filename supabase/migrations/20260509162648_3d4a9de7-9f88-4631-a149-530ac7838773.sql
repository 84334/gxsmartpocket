CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

ALTER TABLE public.profiles
  ALTER COLUMN streak_goal_days SET DEFAULT 6;

UPDATE public.profiles
SET streak_goal_days = 6
WHERE streak_goal_days IS DISTINCT FROM 6;

ALTER TABLE public.savings_transactions
  ALTER COLUMN occurred_on SET DEFAULT ((now() AT TIME ZONE 'Asia/Kuala_Lumpur')::date);

CREATE INDEX IF NOT EXISTS savings_tx_user_kind_day_idx
  ON public.savings_transactions(user_id, kind, occurred_on DESC);

CREATE INDEX IF NOT EXISTS savings_goals_auto_save_idx
  ON public.savings_goals(user_id, target_date, daily_save_amount)
  WHERE daily_save_amount > 0 AND completed_at IS NULL;

CREATE OR REPLACE FUNCTION public.recalculate_savings_streak(
  _user_id uuid,
  _through_date date DEFAULT ((now() AT TIME ZONE 'Asia/Kuala_Lumpur')::date)
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day date := _through_date;
  v_count integer := 0;
BEGIN
  LOOP
    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.savings_transactions st
      WHERE st.user_id = _user_id
        AND st.occurred_on = v_day
        AND st.kind IN ('auto_save', 'manual_save')
        AND st.amount > 0
        AND COALESCE(st.status, 'success') IN ('success', 'partial')
    );

    v_count := v_count + 1;
    v_day := v_day - 1;
  END LOOP;

  IF v_count > 0 THEN
    UPDATE public.profiles
    SET streak_days = v_count,
        longest_streak = GREATEST(longest_streak, v_count),
        last_streak_date = _through_date
    WHERE id = _user_id;
  ELSE
    UPDATE public.profiles
    SET streak_days = 0,
        last_streak_date = NULL
    WHERE id = _user_id;
  END IF;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_daily_auto_savings(
  p_run_date date DEFAULT ((now() AT TIME ZONE 'Asia/Kuala_Lumpur')::date)
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user record;
  v_alloc record;
  v_start timestamptz := (p_run_date::timestamp AT TIME ZONE 'Asia/Kuala_Lumpur');
  v_end timestamptz := ((p_run_date + 1)::timestamp AT TIME ZONE 'Asia/Kuala_Lumpur');
  v_run_at timestamptz := ((p_run_date::timestamp + time '23:59') AT TIME ZONE 'Asia/Kuala_Lumpur');
  v_spend numeric(12,2);
  v_limit numeric(12,2);
  v_remaining numeric(12,2);
  v_total_required numeric(12,2);
  v_saved numeric(12,2);
  v_status text;
  v_processed_users integer := 0;
  v_transactions integer := 0;
  v_total_saved numeric(12,2) := 0;
BEGIN
  FOR v_user IN
    SELECT p.id AS user_id, COALESCE(p.daily_spending_limit, 20)::numeric(12,2) AS daily_limit
    FROM public.profiles p
    WHERE EXISTS (
      SELECT 1
      FROM public.savings_goals g
      WHERE g.user_id = p.id
        AND g.daily_save_amount > 0
        AND g.completed_at IS NULL
        AND g.current_amount < g.target_amount
        AND g.last_saved_on IS DISTINCT FROM p_run_date
    )
  LOOP
    IF EXISTS (
      SELECT 1
      FROM public.savings_transactions st
      WHERE st.user_id = v_user.user_id
        AND st.kind = 'auto_save'
        AND st.occurred_on = p_run_date
    ) THEN
      CONTINUE;
    END IF;

    SELECT COALESCE(SUM(ri.price * ri.quantity), 0)::numeric(12,2)
    INTO v_spend
    FROM public.receipt_items ri
    WHERE ri.user_id = v_user.user_id
      AND ri.created_at >= v_start
      AND ri.created_at < v_end;

    v_limit := v_user.daily_limit;
    v_remaining := GREATEST(0, v_limit - v_spend)::numeric(12,2);

    SELECT COALESCE(SUM(LEAST(g.daily_save_amount, GREATEST(g.target_amount - g.current_amount, 0))), 0)::numeric(12,2)
    INTO v_total_required
    FROM public.savings_goals g
    WHERE g.user_id = v_user.user_id
      AND g.daily_save_amount > 0
      AND g.completed_at IS NULL
      AND g.current_amount < g.target_amount
      AND g.last_saved_on IS DISTINCT FROM p_run_date;

    IF v_total_required <= 0 THEN
      CONTINUE;
    END IF;

    v_saved := 0;

    IF v_remaining <= 0 THEN
      INSERT INTO public.savings_transactions (
        user_id, kind, amount, daily_limit, daily_spend, remaining_budget,
        total_required, status, note, occurred_on, created_at
      ) VALUES (
        v_user.user_id, 'auto_save', 0, v_limit, v_spend, 0,
        v_total_required, 'skipped', 'No budget left after spending', p_run_date, v_run_at
      );
      v_transactions := v_transactions + 1;
      v_processed_users := v_processed_users + 1;
      PERFORM public.recalculate_savings_streak(v_user.user_id, p_run_date);
      CONTINUE;
    END IF;

    FOR v_alloc IN
      WITH pending AS (
        SELECT
          g.id,
          g.title,
          g.current_amount,
          g.target_amount,
          LEAST(g.daily_save_amount, GREATEST(g.target_amount - g.current_amount, 0))::numeric(12,2) AS need,
          ROW_NUMBER() OVER (ORDER BY g.target_date ASC NULLS LAST, g.daily_save_amount DESC, g.created_at ASC) AS rn
        FROM public.savings_goals g
        WHERE g.user_id = v_user.user_id
          AND g.daily_save_amount > 0
          AND g.completed_at IS NULL
          AND g.current_amount < g.target_amount
          AND g.last_saved_on IS DISTINCT FROM p_run_date
      ), weighted AS (
        SELECT
          p.*,
          CASE
            WHEN v_remaining >= v_total_required THEN p.need
            WHEN v_remaining <= 1 AND p.rn = 1 THEN LEAST(p.need, v_remaining)
            WHEN v_remaining <= 1 THEN 0
            ELSE LEAST(p.need, ROUND((p.need / NULLIF(v_total_required, 0)) * v_remaining, 2))
          END::numeric(12,2) AS apply_amount
        FROM pending p
      )
      SELECT * FROM weighted WHERE apply_amount > 0 ORDER BY rn
    LOOP
      UPDATE public.savings_goals
      SET current_amount = LEAST(target_amount, current_amount + v_alloc.apply_amount),
          last_saved_on = p_run_date,
          completed_at = CASE
            WHEN current_amount + v_alloc.apply_amount >= target_amount THEN v_run_at
            ELSE completed_at
          END,
          daily_save_amount = CASE
            WHEN current_amount + v_alloc.apply_amount >= target_amount THEN 0
            ELSE daily_save_amount
          END
      WHERE id = v_alloc.id;

      INSERT INTO public.savings_transactions (
        user_id, pocket_id, kind, amount, daily_limit, daily_spend,
        remaining_budget, total_required, status, note, occurred_on, created_at
      ) VALUES (
        v_user.user_id,
        v_alloc.id,
        'auto_save',
        v_alloc.apply_amount,
        v_limit,
        v_spend,
        v_remaining,
        v_total_required,
        CASE WHEN v_alloc.apply_amount >= v_alloc.need THEN 'success' ELSE 'partial' END,
        'Auto-saved at 11:59 PM',
        p_run_date,
        v_run_at
      );

      v_saved := v_saved + v_alloc.apply_amount;
      v_transactions := v_transactions + 1;
    END LOOP;

    IF v_saved <= 0 THEN
      v_status := 'skipped';
      INSERT INTO public.savings_transactions (
        user_id, kind, amount, daily_limit, daily_spend, remaining_budget,
        total_required, status, note, occurred_on, created_at
      ) VALUES (
        v_user.user_id, 'auto_save', 0, v_limit, v_spend, v_remaining,
        v_total_required, v_status, 'Auto-save amount was too small to allocate', p_run_date, v_run_at
      );
      v_transactions := v_transactions + 1;
    END IF;

    v_total_saved := v_total_saved + v_saved;
    v_processed_users := v_processed_users + 1;
    PERFORM public.recalculate_savings_streak(v_user.user_id, p_run_date);
  END LOOP;

  RETURN jsonb_build_object(
    'run_date', p_run_date,
    'processed_users', v_processed_users,
    'transactions', v_transactions,
    'total_saved', v_total_saved
  );
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-daily-auto-savings-2359-myt') THEN
    PERFORM cron.unschedule('process-daily-auto-savings-2359-myt');
  END IF;

  PERFORM cron.schedule(
    'process-daily-auto-savings-2359-myt',
    '59 15 * * *',
    'SELECT public.process_daily_auto_savings();'
  );
END;
$$;
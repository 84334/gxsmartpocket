
-- Wallet adjustment for splits
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS wallet_adjustment numeric(12,2) NOT NULL DEFAULT 0;

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  related_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own notifications select" ON public.notifications;
CREATE POLICY "own notifications select" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "own notifications update" ON public.notifications;
CREATE POLICY "own notifications update" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "own notifications delete" ON public.notifications;
CREATE POLICY "own notifications delete" ON public.notifications FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications (user_id, created_at DESC);

-- Split requests
CREATE TABLE IF NOT EXISTS public.split_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid,
  item_name text NOT NULL DEFAULT 'Shared item',
  merchant text,
  from_user uuid NOT NULL,
  to_user_id uuid,
  to_label text,
  amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.split_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "split select" ON public.split_requests;
CREATE POLICY "split select" ON public.split_requests FOR SELECT
  USING (auth.uid() = from_user OR auth.uid() = to_user_id);
DROP POLICY IF EXISTS "split insert" ON public.split_requests;
CREATE POLICY "split insert" ON public.split_requests FOR INSERT
  WITH CHECK (auth.uid() = from_user);
DROP POLICY IF EXISTS "split update sender" ON public.split_requests;
CREATE POLICY "split update sender" ON public.split_requests FOR UPDATE
  USING (auth.uid() = from_user);
DROP POLICY IF EXISTS "split delete sender" ON public.split_requests;
CREATE POLICY "split delete sender" ON public.split_requests FOR DELETE
  USING (auth.uid() = from_user);
CREATE INDEX IF NOT EXISTS split_to_idx ON public.split_requests (to_user_id, status);
CREATE INDEX IF NOT EXISTS split_from_idx ON public.split_requests (from_user, status);

-- Lookup user by email (for tagging)
CREATE OR REPLACE FUNCTION public.find_user_by_email(_email text)
RETURNS TABLE(user_id uuid, display_name text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p.id, p.display_name
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE lower(u.email) = lower(trim(_email))
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.find_user_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_user_by_email(text) TO authenticated;

-- Notify recipient on new split request
CREATE OR REPLACE FUNCTION public.notify_split_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_from_name text;
BEGIN
  IF NEW.to_user_id IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, 'Someone') INTO v_from_name FROM public.profiles WHERE id = NEW.from_user;
  INSERT INTO public.notifications (user_id, type, title, body, data, related_id)
  VALUES (
    NEW.to_user_id,
    'split_request',
    v_from_name || ' requested ' || to_char(NEW.amount, 'FM999990.00') || ' for ' || NEW.item_name,
    COALESCE(NEW.merchant, NEW.item_name),
    jsonb_build_object('amount', NEW.amount, 'from_user', NEW.from_user, 'item', NEW.item_name),
    NEW.id
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_split_request ON public.split_requests;
CREATE TRIGGER trg_notify_split_request
AFTER INSERT ON public.split_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_split_request();

-- Pay a split request
CREATE OR REPLACE FUNCTION public.pay_split_request(_split_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_split public.split_requests%ROWTYPE;
  v_payer_name text;
  v_receiver_name text;
BEGIN
  SELECT * INTO v_split FROM public.split_requests WHERE id = _split_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Split not found'; END IF;
  IF v_split.to_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF v_split.status <> 'pending' THEN
    RAISE EXCEPTION 'Already %', v_split.status;
  END IF;

  UPDATE public.split_requests
  SET status = 'paid', paid_at = now()
  WHERE id = _split_id;

  UPDATE public.profiles SET wallet_adjustment = wallet_adjustment - v_split.amount WHERE id = v_split.to_user_id;
  UPDATE public.profiles SET wallet_adjustment = wallet_adjustment + v_split.amount WHERE id = v_split.from_user;

  SELECT display_name INTO v_payer_name FROM public.profiles WHERE id = v_split.to_user_id;
  SELECT display_name INTO v_receiver_name FROM public.profiles WHERE id = v_split.from_user;

  INSERT INTO public.notifications (user_id, type, title, body, data, related_id)
  VALUES (
    v_split.from_user,
    'split_paid',
    COALESCE(v_payer_name, 'Someone') || ' paid you ' || to_char(v_split.amount, 'FM999990.00'),
    v_split.item_name,
    jsonb_build_object('amount', v_split.amount, 'from_user', v_split.to_user_id, 'item', v_split.item_name),
    v_split.id
  );

  INSERT INTO public.notifications (user_id, type, title, body, data, related_id)
  VALUES (
    v_split.to_user_id,
    'split_paid_self',
    'You paid ' || COALESCE(v_receiver_name, 'someone') || ' ' || to_char(v_split.amount, 'FM999990.00'),
    v_split.item_name,
    jsonb_build_object('amount', v_split.amount, 'to_user', v_split.from_user, 'item', v_split.item_name),
    v_split.id
  );

  RETURN jsonb_build_object('ok', true, 'amount', v_split.amount);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.pay_split_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pay_split_request(uuid) TO authenticated;

-- Realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.split_requests REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='notifications') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='split_requests') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.split_requests';
  END IF;
END $$;

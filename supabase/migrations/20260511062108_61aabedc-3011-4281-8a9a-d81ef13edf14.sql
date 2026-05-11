
CREATE POLICY "view receipts via split"
ON public.receipts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.split_requests s
    WHERE s.receipt_id = receipts.id
      AND s.to_user_id = auth.uid()
  )
);

CREATE POLICY "view receipt items via split"
ON public.receipt_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.split_requests s
    WHERE s.receipt_id = receipt_items.receipt_id
      AND s.to_user_id = auth.uid()
  )
);

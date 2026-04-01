-- Add UPDATE and DELETE policies for pos_transactions to allow staff to complete payments

CREATE POLICY "Restaurant members can update transactions"
  ON pos_transactions
  FOR UPDATE
  USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Restaurant members can delete transactions"
  ON pos_transactions
  FOR DELETE
  USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
  ));

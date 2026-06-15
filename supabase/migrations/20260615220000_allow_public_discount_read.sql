-- Allow anyone (authenticated) to read active discounts by ID
-- This enables the /offer/:discountId page to work for any logged-in user
CREATE POLICY "Anyone can view active discounts by id" ON subscription_discounts
  FOR SELECT USING (status = 'active' AND (expires_at IS NULL OR expires_at > now()));

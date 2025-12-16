
-- Comprehensive cleanup: Drop all old policies with public role and ensure component-based access

-- booking_channels
DROP POLICY IF EXISTS "Only admins and owners can manage booking channels" ON public.booking_channels;
DROP POLICY IF EXISTS "Only admins and owners can view booking channels" ON public.booking_channels;
DROP POLICY IF EXISTS "booking_channels_policy" ON public.booking_channels;
CREATE POLICY "Component-based booking_channels access"
ON public.booking_channels FOR ALL TO authenticated
USING (public.check_access('booking_channels', restaurant_id))
WITH CHECK (public.check_access('booking_channels', restaurant_id));

-- customers
DROP POLICY IF EXISTS "Users can view customers for their restaurant" ON public.customers;
CREATE POLICY "Component-based customers access"
ON public.customers FOR ALL TO authenticated
USING (public.check_access('customers', restaurant_id))
WITH CHECK (public.check_access('customers', restaurant_id));

-- daily_revenue_stats
DROP POLICY IF EXISTS "Analytics access for restaurant" ON public.daily_revenue_stats;
DROP POLICY IF EXISTS "Operational roles can manage revenue stats" ON public.daily_revenue_stats;
CREATE POLICY "Component-based daily_revenue_stats access"
ON public.daily_revenue_stats FOR ALL TO authenticated
USING (public.check_access('daily_revenue_stats', restaurant_id))
WITH CHECK (public.check_access('daily_revenue_stats', restaurant_id));

-- expenses
DROP POLICY IF EXISTS "Users can manage their restaurant's expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can view their restaurant's expenses" ON public.expenses;
CREATE POLICY "Component-based expenses access"
ON public.expenses FOR ALL TO authenticated
USING (public.check_access('expenses', restaurant_id))
WITH CHECK (public.check_access('expenses', restaurant_id));

-- guest_documents
DROP POLICY IF EXISTS "guest_documents_policy" ON public.guest_documents;
ALTER TABLE public.guest_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Component-based guest_documents access"
ON public.guest_documents FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.guest_profiles gp
    WHERE gp.id = guest_documents.guest_profile_id
    AND public.check_access('guest_documents', gp.restaurant_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.guest_profiles gp
    WHERE gp.id = guest_documents.guest_profile_id
    AND public.check_access('guest_documents', gp.restaurant_id)
  )
);

-- invoice_line_items
DROP POLICY IF EXISTS "invoice_line_items_policy" ON public.invoice_line_items;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Component-based invoice_line_items access"
ON public.invoice_line_items FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_line_items.invoice_id
    AND public.check_access('invoice_line_items', i.restaurant_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_line_items.invoice_id
    AND public.check_access('invoice_line_items', i.restaurant_id)
  )
);

-- invoices
DROP POLICY IF EXISTS "invoices_policy" ON public.invoices;
CREATE POLICY "Component-based invoices access"
ON public.invoices FOR ALL TO authenticated
USING (public.check_access('invoices', restaurant_id))
WITH CHECK (public.check_access('invoices', restaurant_id));

-- journal_entry_lines
DROP POLICY IF EXISTS "journal_entry_lines_policy" ON public.journal_entry_lines;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Component-based journal_entry_lines access"
ON public.journal_entry_lines FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_entry_lines.journal_entry_id
    AND public.check_access('journal_entry_lines', je.restaurant_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_entry_lines.journal_entry_id
    AND public.check_access('journal_entry_lines', je.restaurant_id)
  )
);

-- kitchen_orders
DROP POLICY IF EXISTS "Operational roles can create kitchen orders" ON public.kitchen_orders;
DROP POLICY IF EXISTS "Operational roles can update kitchen orders" ON public.kitchen_orders;
DROP POLICY IF EXISTS "Users can view kitchen orders for their restaurant" ON public.kitchen_orders;
CREATE POLICY "Component-based kitchen_orders access"
ON public.kitchen_orders FOR ALL TO authenticated
USING (public.check_access('kitchen_orders', restaurant_id))
WITH CHECK (public.check_access('kitchen_orders', restaurant_id));

-- loyalty tables
DROP POLICY IF EXISTS "Users can insert their restaurant's loyalty program" ON public.loyalty_programs;
DROP POLICY IF EXISTS "Users can update their restaurant's loyalty program" ON public.loyalty_programs;
DROP POLICY IF EXISTS "Users can view their restaurant's loyalty program" ON public.loyalty_programs;

DROP POLICY IF EXISTS "Users can insert their restaurant's loyalty redemptions" ON public.loyalty_redemptions;
DROP POLICY IF EXISTS "Users can view their restaurant's loyalty redemptions" ON public.loyalty_redemptions;

DROP POLICY IF EXISTS "Users can delete their restaurant's loyalty rewards" ON public.loyalty_rewards;
DROP POLICY IF EXISTS "Users can insert their restaurant's loyalty rewards" ON public.loyalty_rewards;
DROP POLICY IF EXISTS "Users can update their restaurant's loyalty rewards" ON public.loyalty_rewards;
DROP POLICY IF EXISTS "Users can view their restaurant's loyalty rewards" ON public.loyalty_rewards;

DROP POLICY IF EXISTS "Users can delete their restaurant's loyalty tiers" ON public.loyalty_tiers;
DROP POLICY IF EXISTS "Users can insert their restaurant's loyalty tiers" ON public.loyalty_tiers;
DROP POLICY IF EXISTS "Users can update their restaurant's loyalty tiers" ON public.loyalty_tiers;
DROP POLICY IF EXISTS "Users can view their restaurant's loyalty tiers" ON public.loyalty_tiers;

DROP POLICY IF EXISTS "Users can insert their restaurant's loyalty transactions" ON public.loyalty_transactions;
DROP POLICY IF EXISTS "Users can view their restaurant's loyalty transactions" ON public.loyalty_transactions;

-- menu_items
DROP POLICY IF EXISTS "Management roles can delete menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Menu management roles can create menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Menu management roles can update menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Users can view menu items for their restaurant" ON public.menu_items;

-- monthly_budgets
DROP POLICY IF EXISTS "Users can manage their restaurant's monthly budgets" ON public.monthly_budgets;

-- notification_preferences
DROP POLICY IF EXISTS "Users can insert their restaurant's notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update their restaurant's notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can view their restaurant's notification preferences" ON public.notification_preferences;

-- orders
DROP POLICY IF EXISTS "Management roles can delete orders" ON public.orders;
DROP POLICY IF EXISTS "Operational roles can create orders" ON public.orders;
DROP POLICY IF EXISTS "Operational roles can update orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view orders for their restaurant" ON public.orders;
CREATE POLICY "Component-based orders access"
ON public.orders FOR ALL TO authenticated
USING (public.check_access('orders', restaurant_id))
WITH CHECK (public.check_access('orders', restaurant_id));

-- payment_methods
DROP POLICY IF EXISTS "restaurant_payment_methods_policy" ON public.payment_methods;

-- payments
DROP POLICY IF EXISTS "payments_policy" ON public.payments;

-- price_history
DROP POLICY IF EXISTS "price_history_policy" ON public.price_history;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Component-based price_history access"
ON public.price_history FOR ALL TO authenticated
USING (public.check_access('price_history', restaurant_id))
WITH CHECK (public.check_access('price_history', restaurant_id));

-- pricing_rules
DROP POLICY IF EXISTS "pricing_rules_policy" ON public.pricing_rules;
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Component-based pricing_rules access"
ON public.pricing_rules FOR ALL TO authenticated
USING (public.check_access('pricing_rules', restaurant_id))
WITH CHECK (public.check_access('pricing_rules', restaurant_id));

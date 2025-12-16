-- Enable RLS on tables that don't have it enabled yet

-- Enable RLS on all tables that may be missing it
ALTER TABLE IF EXISTS public.monthly_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.operational_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rate_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.recipe_nutrition ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.restaurant_operating_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.restaurant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.revenue_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.room_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.room_amenities_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.room_amenity_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.room_cleaning_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.room_maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shift_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staff_time_clock ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.supplier_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.table_availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.table_pacing ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.table_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tax_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.restaurants ENABLE ROW LEVEL SECURITY;

-- Create simple component-based policies for newly enabled RLS tables
-- These will use the same check_access pattern

-- MONTHLY_BUDGETS
CREATE POLICY "Component-based monthly_budgets access"
ON public.monthly_budgets
FOR ALL
USING (public.check_access('monthly_budgets', restaurant_id))
WITH CHECK (public.check_access('monthly_budgets', restaurant_id));

-- NOTIFICATION_PREFERENCES
CREATE POLICY "Component-based notification_preferences access"
ON public.notification_preferences
FOR ALL
USING (public.check_access('notification_preferences', restaurant_id))
WITH CHECK (public.check_access('notification_preferences', restaurant_id));

-- OPERATIONAL_COSTS
CREATE POLICY "Component-based operational_costs access"
ON public.operational_costs
FOR ALL
USING (public.check_access('operational_costs', restaurant_id))
WITH CHECK (public.check_access('operational_costs', restaurant_id));

-- PAYMENT_METHODS
CREATE POLICY "Component-based payment_methods access"
ON public.payment_methods
FOR ALL
USING (public.check_access('payment_methods', restaurant_id))
WITH CHECK (public.check_access('payment_methods', restaurant_id));

-- PAYMENT_SETTINGS
CREATE POLICY "Component-based payment_settings access"
ON public.payment_settings
FOR ALL
USING (public.check_access('payment_settings', restaurant_id))
WITH CHECK (public.check_access('payment_settings', restaurant_id));

-- PAYMENTS
CREATE POLICY "Component-based payments access"
ON public.payments
FOR ALL
USING (public.check_access('payments', restaurant_id))
WITH CHECK (public.check_access('payments', restaurant_id));

-- PURCHASE_ORDERS
CREATE POLICY "Component-based purchase_orders access"
ON public.purchase_orders
FOR ALL
USING (public.check_access('purchase_orders', restaurant_id))
WITH CHECK (public.check_access('purchase_orders', restaurant_id));

-- RATE_PLANS
CREATE POLICY "Component-based rate_plans access"
ON public.rate_plans
FOR ALL
USING (public.check_access('rate_plans', restaurant_id))
WITH CHECK (public.check_access('rate_plans', restaurant_id));

-- RESTAURANT_OPERATING_HOURS
CREATE POLICY "Component-based restaurant_operating_hours access"
ON public.restaurant_operating_hours
FOR ALL
USING (public.check_access('restaurant_operating_hours', restaurant_id))
WITH CHECK (public.check_access('restaurant_operating_hours', restaurant_id));

-- RESTAURANT_SETTINGS
CREATE POLICY "Component-based restaurant_settings access"
ON public.restaurant_settings
FOR ALL
USING (public.check_access('restaurant_settings', restaurant_id))
WITH CHECK (public.check_access('restaurant_settings', restaurant_id));

-- RESTAURANT_SUBSCRIPTIONS
CREATE POLICY "Component-based restaurant_subscriptions access"
ON public.restaurant_subscriptions
FOR ALL
USING (public.check_access('restaurant_subscriptions', restaurant_id))
WITH CHECK (public.check_access('restaurant_subscriptions', restaurant_id));

-- REVENUE_METRICS
CREATE POLICY "Component-based revenue_metrics access"
ON public.revenue_metrics
FOR ALL
USING (public.check_access('revenue_metrics', restaurant_id))
WITH CHECK (public.check_access('revenue_metrics', restaurant_id));

-- ROOM_CLEANING_SCHEDULES
CREATE POLICY "Component-based room_cleaning_schedules access"
ON public.room_cleaning_schedules
FOR ALL
USING (public.check_access('room_cleaning_schedules', restaurant_id))
WITH CHECK (public.check_access('room_cleaning_schedules', restaurant_id));

-- ROOM_MAINTENANCE_REQUESTS
CREATE POLICY "Component-based room_maintenance_requests access"
ON public.room_maintenance_requests
FOR ALL
USING (public.check_access('room_maintenance_requests', restaurant_id))
WITH CHECK (public.check_access('room_maintenance_requests', restaurant_id));

-- SHIFT_TYPES
CREATE POLICY "Component-based shift_types access"
ON public.shift_types
FOR ALL
USING (public.check_access('shift_types', restaurant_id))
WITH CHECK (public.check_access('shift_types', restaurant_id));

-- STAFF_SHIFTS
CREATE POLICY "Component-based staff_shifts access"
ON public.staff_shifts
FOR ALL
USING (public.check_access('staff_shifts', restaurant_id))
WITH CHECK (public.check_access('staff_shifts', restaurant_id));

-- STAFF_TIME_CLOCK
CREATE POLICY "Component-based staff_time_clock access"
ON public.staff_time_clock
FOR ALL
USING (public.check_access('staff_time_clock', restaurant_id))
WITH CHECK (public.check_access('staff_time_clock', restaurant_id));

-- STAFF_LEAVES
DROP POLICY IF EXISTS "staff_leaves_policy" ON public.staff_leaves;
CREATE POLICY "Component-based staff_leaves access"
ON public.staff_leaves
FOR ALL
USING (public.check_access('staff_leaves', restaurant_id))
WITH CHECK (public.check_access('staff_leaves', restaurant_id));

-- STAFF_LEAVE_REQUESTS
CREATE POLICY "Component-based staff_leave_requests access"
ON public.staff_leave_requests
FOR ALL
USING (public.check_access('staff_leave_requests', restaurant_id))
WITH CHECK (public.check_access('staff_leave_requests', restaurant_id));

-- STAFF_LEAVE_TYPES
CREATE POLICY "Component-based staff_leave_types access"
ON public.staff_leave_types
FOR ALL
USING (public.check_access('staff_leave_types', restaurant_id))
WITH CHECK (public.check_access('staff_leave_types', restaurant_id));

-- STAFF_LEAVE_BALANCES
CREATE POLICY "Component-based staff_leave_balances access"
ON public.staff_leave_balances
FOR ALL
USING (public.check_access('staff_leave_balances', restaurant_id))
WITH CHECK (public.check_access('staff_leave_balances', restaurant_id));

-- SUPPLIER_ORDERS (already done above, skip)

-- TABLE_RESERVATIONS
CREATE POLICY "Component-based table_reservations access"
ON public.table_reservations
FOR ALL
USING (public.check_access('table_reservations', restaurant_id))
WITH CHECK (public.check_access('table_reservations', restaurant_id));

-- WAITLIST
CREATE POLICY "Component-based waitlist access"
ON public.waitlist
FOR ALL
USING (public.check_access('waitlist', restaurant_id))
WITH CHECK (public.check_access('waitlist', restaurant_id));

-- RESTAURANTS - Admin/owner only
CREATE POLICY "Admins can manage their restaurant"
ON public.restaurants
FOR ALL
USING (
  id = public.get_user_restaurant_id(auth.uid())
  AND public.user_is_admin_or_owner(auth.uid())
)
WITH CHECK (
  id = public.get_user_restaurant_id(auth.uid())
  AND public.user_is_admin_or_owner(auth.uid())
);

CREATE POLICY "Users can view their own restaurant"
ON public.restaurants
FOR SELECT
USING (id = public.get_user_restaurant_id(auth.uid()));
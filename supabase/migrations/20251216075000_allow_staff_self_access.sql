-- Allow staff members to view their own staff record by email match
-- This enables self-service features like clock in/out and leave requests
-- FIXED: Using auth.email() instead of direct query to auth.users table

-- First, drop the existing policies
DROP POLICY IF EXISTS "Component-based staff access" ON public.staff;
DROP POLICY IF EXISTS "Staff self-access and component-based access" ON public.staff;

-- Create a more permissive policy that allows:
-- 1. Component-based access (for managers to see all staff)
-- 2. Self-access (staff can see their own record by email match using auth.email())
CREATE POLICY "Staff self-access and component-based access"
ON public.staff
FOR ALL
TO authenticated
USING (
  -- Allow access if user has component-based access (managers, admins)
  public.check_access('staff', restaurant_id)
  OR
  -- Allow staff to access their own record by email match
  (
    email = auth.email()
    AND restaurant_id = public.get_user_restaurant_id()
  )
)
WITH CHECK (
  -- Only component-based access can modify
  public.check_access('staff', restaurant_id)
);

-- Also update staff_time_clock to allow staff to manage their own entries
DROP POLICY IF EXISTS "Component-based staff_time_clock access" ON public.staff_time_clock;
DROP POLICY IF EXISTS "Staff self-clock and component-based access" ON public.staff_time_clock;

CREATE POLICY "Staff self-clock and component-based access"
ON public.staff_time_clock
FOR ALL
TO authenticated
USING (
  -- Component-based access
  EXISTS (
    SELECT 1 FROM public.staff s 
    WHERE s.id = staff_time_clock.staff_id 
    AND public.check_access('staff_time_clock', s.restaurant_id)
  )
  OR
  -- Self-access: staff can manage their own time entries
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.id = staff_time_clock.staff_id
    AND s.email = auth.email()
    AND s.restaurant_id = public.get_user_restaurant_id()
  )
)
WITH CHECK (
  -- Component-based access for managers
  EXISTS (
    SELECT 1 FROM public.staff s 
    WHERE s.id = staff_time_clock.staff_id 
    AND public.check_access('staff_time_clock', s.restaurant_id)
  )
  OR
  -- Self-access: staff can create/update their own time entries
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.id = staff_time_clock.staff_id
    AND s.email = auth.email()
    AND s.restaurant_id = public.get_user_restaurant_id()
  )
);

-- Update staff_leave_requests to allow staff to manage their own leave requests
DROP POLICY IF EXISTS "Component-based staff_leave_requests access" ON public.staff_leave_requests;
DROP POLICY IF EXISTS "Staff self-leave-requests and component-based access" ON public.staff_leave_requests;

CREATE POLICY "Staff self-leave-requests and component-based access"
ON public.staff_leave_requests
FOR ALL
TO authenticated
USING (
  -- Component-based access
  EXISTS (
    SELECT 1 FROM public.staff s 
    WHERE s.id = staff_leave_requests.staff_id 
    AND public.check_access('staff_leave_requests', s.restaurant_id)
  )
  OR
  -- Self-access: staff can view their own leave requests
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.id = staff_leave_requests.staff_id
    AND s.email = auth.email()
    AND s.restaurant_id = public.get_user_restaurant_id()
  )
)
WITH CHECK (
  -- Component-based access for managers to approve/reject
  EXISTS (
    SELECT 1 FROM public.staff s 
    WHERE s.id = staff_leave_requests.staff_id 
    AND public.check_access('staff_leave_requests', s.restaurant_id)
  )
  OR
  -- Self-access: staff can create their own leave requests (but not approve)
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.id = staff_leave_requests.staff_id
    AND s.email = auth.email()
    AND s.restaurant_id = public.get_user_restaurant_id()
  )
);

-- Update staff_leave_balances to allow staff to view their own balances
DROP POLICY IF EXISTS "Component-based staff_leave_balances access" ON public.staff_leave_balances;
DROP POLICY IF EXISTS "Staff self-leave-balances and component-based access" ON public.staff_leave_balances;

CREATE POLICY "Staff self-leave-balances and component-based access"
ON public.staff_leave_balances
FOR ALL
TO authenticated
USING (
  -- Component-based access
  EXISTS (
    SELECT 1 FROM public.staff s 
    WHERE s.id = staff_leave_balances.staff_id 
    AND public.check_access('staff_leave_balances', s.restaurant_id)
  )
  OR
  -- Self-access: staff can view their own leave balances
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.id = staff_leave_balances.staff_id
    AND s.email = auth.email()
    AND s.restaurant_id = public.get_user_restaurant_id()
  )
)
WITH CHECK (
  -- Only managers can modify leave balances (not staff themselves)
  EXISTS (
    SELECT 1 FROM public.staff s 
    WHERE s.id = staff_leave_balances.staff_id 
    AND public.check_access('staff_leave_balances', s.restaurant_id)
  )
);

-- Allow all authenticated users to read staff_leave_types (needed for leave request dropdown)
DROP POLICY IF EXISTS "Component-based staff_leave_types access" ON public.staff_leave_types;
DROP POLICY IF EXISTS "Staff can read leave types" ON public.staff_leave_types;

CREATE POLICY "Staff can read leave types"
ON public.staff_leave_types
FOR SELECT
TO authenticated
USING (
  restaurant_id = public.get_user_restaurant_id()
);

-- Allow managers to manage leave types
CREATE POLICY "Managers can manage leave types"
ON public.staff_leave_types
FOR ALL
TO authenticated
USING (
  public.check_access('staff_leave_types', restaurant_id)
)
WITH CHECK (
  public.check_access('staff_leave_types', restaurant_id)
);

-- Insert default leave types for each restaurant that doesn't have them
-- Common corporate leave categories
INSERT INTO public.staff_leave_types (restaurant_id, name, days_per_year, description, is_paid, carry_forward, max_carry_forward_days)
SELECT 
  r.id as restaurant_id,
  leave_type.name,
  leave_type.days_per_year,
  leave_type.description,
  leave_type.is_paid,
  leave_type.carry_forward,
  leave_type.max_carry_forward_days
FROM public.restaurants r
CROSS JOIN (
  VALUES 
    ('Sick Leave', 12, 'Leave for medical reasons or illness', true, false, 0),
    ('Casual Leave', 12, 'Leave for personal matters and short-term needs', true, false, 0),
    ('Vacation', 15, 'Annual vacation/earned leave', true, true, 5),
    ('Maternity Leave', 90, 'Leave for childbirth and post-natal care', true, false, 0),
    ('Paternity Leave', 15, 'Leave for fathers after childbirth', true, false, 0),
    ('Bereavement Leave', 5, 'Leave for death in the family', true, false, 0),
    ('Unpaid Leave', 30, 'Leave without pay for extended personal needs', false, false, 0),
    ('Work From Home', 24, 'Days allowed to work remotely', true, false, 0)
) AS leave_type(name, days_per_year, description, is_paid, carry_forward, max_carry_forward_days)
WHERE NOT EXISTS (
  SELECT 1 FROM public.staff_leave_types slt 
  WHERE slt.restaurant_id = r.id AND slt.name = leave_type.name
);


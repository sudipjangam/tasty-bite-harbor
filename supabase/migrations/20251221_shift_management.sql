-- Shift Management System Migration
-- Run this in Supabase SQL Editor

-- =============================================
-- 1. Create shifts table (shift definitions)
-- =============================================
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- "Morning", "Evening", "Night"
  start_time TIME NOT NULL, -- e.g., '06:00:00'
  end_time TIME NOT NULL, -- e.g., '14:00:00'
  color TEXT DEFAULT '#3B82F6', -- For UI display
  grace_period_minutes INTEGER DEFAULT 15, -- Allow clock-in this many minutes early/late
  auto_clock_out_minutes INTEGER DEFAULT 120, -- Auto clock out this many minutes after shift end
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, name)
);

-- Enable RLS
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shifts
CREATE POLICY "shifts_select_policy" ON shifts
  FOR SELECT USING (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "shifts_insert_policy" ON shifts
  FOR INSERT WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "shifts_update_policy" ON shifts
  FOR UPDATE USING (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "shifts_delete_policy" ON shifts
  FOR DELETE USING (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =============================================
-- 2. Create staff_shift_assignments table
-- =============================================
CREATE TABLE IF NOT EXISTS staff_shift_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_until DATE, -- NULL means ongoing
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, shift_id, day_of_week, effective_from)
);

-- Enable RLS
ALTER TABLE staff_shift_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staff_shift_assignments
CREATE POLICY "staff_shift_assignments_select_policy" ON staff_shift_assignments
  FOR SELECT USING (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "staff_shift_assignments_insert_policy" ON staff_shift_assignments
  FOR INSERT WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "staff_shift_assignments_update_policy" ON staff_shift_assignments
  FOR UPDATE USING (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "staff_shift_assignments_delete_policy" ON staff_shift_assignments
  FOR DELETE USING (
    restaurant_id IN (
      SELECT restaurant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =============================================
-- 3. Add new columns to time_clock_entries
-- =============================================
ALTER TABLE time_clock_entries
ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shifts(id),
ADD COLUMN IF NOT EXISTS clock_in_status TEXT CHECK (clock_in_status IN ('early', 'on_time', 'late', 'no_shift')),
ADD COLUMN IF NOT EXISTS minutes_variance INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS auto_clocked_out BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS manager_override BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS override_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS override_reason TEXT;

-- =============================================
-- 4. Create indexes for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_shifts_restaurant ON shifts(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_staff_shift_assignments_staff ON staff_shift_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_shift_assignments_shift ON staff_shift_assignments(shift_id);
CREATE INDEX IF NOT EXISTS idx_staff_shift_assignments_day ON staff_shift_assignments(day_of_week);
CREATE INDEX IF NOT EXISTS idx_time_clock_entries_shift ON time_clock_entries(shift_id);

-- =============================================
-- 5. Create helper function to get staff's shift for a day
-- =============================================
CREATE OR REPLACE FUNCTION get_staff_shift_for_day(
  p_staff_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  shift_id UUID,
  shift_name TEXT,
  start_time TIME,
  end_time TIME,
  color TEXT,
  grace_period_minutes INTEGER,
  auto_clock_out_minutes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as shift_id,
    s.name as shift_name,
    s.start_time,
    s.end_time,
    s.color,
    s.grace_period_minutes,
    s.auto_clock_out_minutes
  FROM staff_shift_assignments ssa
  JOIN shifts s ON s.id = ssa.shift_id
  WHERE ssa.staff_id = p_staff_id
    AND ssa.day_of_week = EXTRACT(DOW FROM p_date)::INTEGER
    AND ssa.is_active = true
    AND ssa.effective_from <= p_date
    AND (ssa.effective_until IS NULL OR ssa.effective_until >= p_date)
    AND s.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 6. Create function to check for stale clock-ins
-- =============================================
CREATE OR REPLACE FUNCTION check_stale_clock_ins()
RETURNS TABLE (
  entry_id UUID,
  staff_id UUID,
  staff_name TEXT,
  clock_in TIMESTAMPTZ,
  hours_elapsed NUMERIC,
  shift_name TEXT,
  should_auto_clock_out BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tce.id as entry_id,
    tce.staff_id,
    CONCAT(st.first_name, ' ', st.last_name) as staff_name,
    tce.clock_in,
    ROUND(EXTRACT(EPOCH FROM (NOW() - tce.clock_in)) / 3600, 2) as hours_elapsed,
    s.name as shift_name,
    CASE 
      WHEN EXTRACT(EPOCH FROM (NOW() - tce.clock_in)) / 3600 > 16 THEN true
      WHEN s.id IS NOT NULL AND NOW()::TIME > (s.end_time + (s.auto_clock_out_minutes || ' minutes')::INTERVAL)::TIME THEN true
      ELSE false
    END as should_auto_clock_out
  FROM time_clock_entries tce
  JOIN staff st ON st.id = tce.staff_id
  LEFT JOIN shifts s ON s.id = tce.shift_id
  WHERE tce.clock_out IS NULL
    AND tce.auto_clocked_out = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 7. Insert default shifts for existing restaurants
-- =============================================
INSERT INTO shifts (restaurant_id, name, start_time, end_time, color)
SELECT 
  r.id,
  shift_data.name,
  shift_data.start_time::TIME,
  shift_data.end_time::TIME,
  shift_data.color
FROM restaurants r
CROSS JOIN (
  VALUES 
    ('Morning', '06:00:00', '14:00:00', '#F59E0B'),
    ('Evening', '14:00:00', '22:00:00', '#3B82F6'),
    ('Night', '22:00:00', '06:00:00', '#8B5CF6')
) AS shift_data(name, start_time, end_time, color)
ON CONFLICT (restaurant_id, name) DO NOTHING;

COMMENT ON TABLE shifts IS 'Defines shift schedules for restaurants (e.g., Morning, Evening, Night)';
COMMENT ON TABLE staff_shift_assignments IS 'Links staff members to their assigned shifts by day of week';
COMMENT ON COLUMN time_clock_entries.clock_in_status IS 'early, on_time, late, or no_shift';
COMMENT ON COLUMN time_clock_entries.minutes_variance IS 'Positive = late, Negative = early';

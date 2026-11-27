-- Fix C-9 + security + timezone + overnight shift handling for check_stale_clock_ins()

CREATE OR REPLACE FUNCTION public.check_stale_clock_ins()
RETURNS TABLE (
  entry_id UUID,
  staff_id UUID,
  staff_name TEXT,
  clock_in TIMESTAMPTZ,
  hours_elapsed NUMERIC,
  shift_name TEXT,
  should_auto_clock_out BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    stc.id AS entry_id,
    stc.staff_id,
    CONCAT(st.first_name, ' ', st.last_name) AS staff_name,
    stc.clock_in,
    ROUND(EXTRACT(EPOCH FROM (NOW() - stc.clock_in)) / 3600, 2) AS hours_elapsed,
    s.name AS shift_name,
    CASE
      WHEN EXTRACT(EPOCH FROM (NOW() - stc.clock_in)) / 3600 > 16 THEN true
      WHEN s.id IS NOT NULL AND (
        (
          CASE
            WHEN ((stc.clock_in AT TIME ZONE COALESCE(NULLIF(rs.timezone, ''), NULLIF(srs.timezone, ''), 'Asia/Kolkata'))::DATE + s.end_time)
                 < (stc.clock_in AT TIME ZONE COALESCE(NULLIF(rs.timezone, ''), NULLIF(srs.timezone, ''), 'Asia/Kolkata'))
              THEN ((stc.clock_in AT TIME ZONE COALESCE(NULLIF(rs.timezone, ''), NULLIF(srs.timezone, ''), 'Asia/Kolkata'))::DATE + INTERVAL '1 day' + s.end_time)
            ELSE ((stc.clock_in AT TIME ZONE COALESCE(NULLIF(rs.timezone, ''), NULLIF(srs.timezone, ''), 'Asia/Kolkata'))::DATE + s.end_time)
          END
          + make_interval(mins => COALESCE(s.auto_clock_out_minutes, 120))
        ) < (NOW() AT TIME ZONE COALESCE(NULLIF(rs.timezone, ''), NULLIF(srs.timezone, ''), 'Asia/Kolkata'))
      ) THEN true
      ELSE false
    END AS should_auto_clock_out
  FROM staff_time_clock stc
  JOIN staff st ON st.id = stc.staff_id
  LEFT JOIN shifts s ON s.id = stc.shift_id
  LEFT JOIN restaurant_settings rs ON rs.restaurant_id = stc.restaurant_id
  LEFT JOIN scheduled_report_settings srs ON srs.restaurant_id = stc.restaurant_id
  WHERE stc.clock_out IS NULL
    AND COALESCE(stc.auto_clocked_out, false) = false;
END;
$$;

REVOKE ALL ON FUNCTION public.check_stale_clock_ins() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_stale_clock_ins() TO service_role;

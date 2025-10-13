-- Add waitlist management table
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  party_size INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'seated', 'cancelled', 'no_show')),
  priority INTEGER DEFAULT 0,
  estimated_wait_time INTEGER, -- in minutes
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  seated_time TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add reservation confirmations tracking
ALTER TABLE public.table_reservations
ADD COLUMN IF NOT EXISTS confirmation_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS confirmation_method TEXT CHECK (confirmation_method IN ('email', 'sms', 'both'));

-- Add guest pacing tracking
CREATE TABLE IF NOT EXISTS public.table_pacing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  table_id UUID NOT NULL,
  reservation_id UUID,
  seated_at TIMESTAMPTZ NOT NULL,
  expected_duration_minutes INTEGER,
  actual_departure TIMESTAMPTZ,
  turn_time_minutes INTEGER,
  pacing_status TEXT DEFAULT 'on_time' CHECK (pacing_status IN ('on_time', 'delayed', 'rushed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_pacing ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage waitlist for their restaurant" ON public.waitlist;
DROP POLICY IF EXISTS "Users can manage table pacing for their restaurant" ON public.table_pacing;

-- RLS Policies for waitlist
CREATE POLICY "Users can manage waitlist for their restaurant"
ON public.waitlist
FOR ALL
USING (restaurant_id IN (
  SELECT restaurant_id FROM profiles WHERE id = auth.uid()
));

-- RLS Policies for table_pacing
CREATE POLICY "Users can manage table pacing for their restaurant"
ON public.table_pacing
FOR ALL
USING (restaurant_id IN (
  SELECT restaurant_id FROM profiles WHERE id = auth.uid()
));

-- Create trigger function if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    CREATE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END
$$;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_waitlist_updated_at ON public.waitlist;
CREATE TRIGGER update_waitlist_updated_at
BEFORE UPDATE ON public.waitlist
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_waitlist_restaurant_status ON public.waitlist(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_table_pacing_restaurant_date ON public.table_pacing(restaurant_id, seated_at);

-- Create booking channels table for managing external platforms
CREATE TABLE public.booking_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  channel_name TEXT NOT NULL,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('ota', 'direct', 'gds', 'metasearch', 'social')),
  api_endpoint TEXT,
  api_key TEXT,
  api_secret TEXT,
  commission_rate NUMERIC(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMPTZ,
  sync_frequency_minutes INTEGER DEFAULT 60,
  channel_settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create rate plans table for different pricing strategies
CREATE TABLE public.rate_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('standard', 'corporate', 'group', 'package', 'promotional')),
  base_rate NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  is_refundable BOOLEAN DEFAULT true,
  cancellation_policy JSONB DEFAULT '{}',
  min_stay_nights INTEGER DEFAULT 1,
  max_stay_nights INTEGER,
  advance_booking_days INTEGER,
  blackout_dates JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create dynamic pricing rules table
CREATE TABLE public.pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('occupancy', 'seasonal', 'event', 'demand', 'competitor', 'length_of_stay')),
  trigger_condition JSONB NOT NULL,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('percentage', 'fixed_amount', 'multiply')),
  adjustment_value NUMERIC(10,2) NOT NULL,
  min_price NUMERIC(10,2),
  max_price NUMERIC(10,2),
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  valid_from DATE,
  valid_to DATE,
  days_of_week JSONB DEFAULT '[0,1,2,3,4,5,6]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create channel inventory table for managing room availability across channels
CREATE TABLE public.channel_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  room_id UUID NOT NULL REFERENCES rooms(id),
  channel_id UUID NOT NULL REFERENCES booking_channels(id),
  rate_plan_id UUID NOT NULL REFERENCES rate_plans(id),
  date DATE NOT NULL,
  available_rooms INTEGER NOT NULL DEFAULT 0,
  price NUMERIC(10,2) NOT NULL,
  min_stay INTEGER DEFAULT 1,
  closed_to_arrival BOOLEAN DEFAULT false,
  closed_to_departure BOOLEAN DEFAULT false,
  stop_sell BOOLEAN DEFAULT false,
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, channel_id, rate_plan_id, date)
);

-- Create competitor pricing table for price comparison
CREATE TABLE public.competitor_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  competitor_name TEXT NOT NULL,
  competitor_url TEXT,
  room_type TEXT,
  date DATE NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  last_scraped TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create demand forecast table for predictive pricing
CREATE TABLE public.demand_forecast (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  room_id UUID NOT NULL REFERENCES rooms(id),
  forecast_date DATE NOT NULL,
  predicted_occupancy NUMERIC(5,2) DEFAULT 0,
  predicted_adr NUMERIC(10,2) DEFAULT 0,
  demand_level TEXT CHECK (demand_level IN ('low', 'medium', 'high', 'very_high')),
  confidence_score NUMERIC(3,2) DEFAULT 0,
  factors JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, forecast_date)
);

-- Create booking source tracking
CREATE TABLE public.booking_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  reservation_id UUID NOT NULL REFERENCES reservations(id),
  channel_id UUID REFERENCES booking_channels(id),
  source_type TEXT NOT NULL CHECK (source_type IN ('direct', 'ota', 'phone', 'walk_in', 'email')),
  booking_reference TEXT,
  commission_amount NUMERIC(10,2) DEFAULT 0,
  net_amount NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create price history for tracking changes
CREATE TABLE public.price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  room_id UUID NOT NULL REFERENCES rooms(id),
  rate_plan_id UUID REFERENCES rate_plans(id),
  date DATE NOT NULL,
  old_price NUMERIC(10,2),
  new_price NUMERIC(10,2) NOT NULL,
  change_reason TEXT,
  changed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create revenue management metrics
CREATE TABLE public.revenue_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  date DATE NOT NULL,
  total_revenue NUMERIC(12,2) DEFAULT 0,
  room_revenue NUMERIC(12,2) DEFAULT 0,
  f_and_b_revenue NUMERIC(12,2) DEFAULT 0,
  occupancy_rate NUMERIC(5,2) DEFAULT 0,
  adr NUMERIC(10,2) DEFAULT 0, -- Average Daily Rate
  revpar NUMERIC(10,2) DEFAULT 0, -- Revenue Per Available Room
  total_rooms INTEGER DEFAULT 0,
  occupied_rooms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, date)
);

-- Enable RLS on all new tables
ALTER TABLE public.booking_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_forecast ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "booking_channels_policy" ON public.booking_channels FOR ALL USING (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "rate_plans_policy" ON public.rate_plans FOR ALL USING (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "pricing_rules_policy" ON public.pricing_rules FOR ALL USING (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "channel_inventory_policy" ON public.channel_inventory FOR ALL USING (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "competitor_pricing_policy" ON public.competitor_pricing FOR ALL USING (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "demand_forecast_policy" ON public.demand_forecast FOR ALL USING (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "booking_sources_policy" ON public.booking_sources FOR ALL USING (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "price_history_policy" ON public.price_history FOR ALL USING (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "revenue_metrics_policy" ON public.revenue_metrics FOR ALL USING (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
);

-- Create updated_at triggers
CREATE TRIGGER update_booking_channels_updated_at BEFORE UPDATE ON booking_channels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rate_plans_updated_at BEFORE UPDATE ON rate_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pricing_rules_updated_at BEFORE UPDATE ON pricing_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_revenue_metrics_updated_at BEFORE UPDATE ON revenue_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default booking channels
INSERT INTO public.booking_channels (restaurant_id, channel_name, channel_type, commission_rate) 
SELECT 
  r.id as restaurant_id,
  unnest(ARRAY['Direct Website', 'Booking.com', 'Agoda', 'Expedia', 'MakeMyTrip', 'Goibibo', 'OYO', 'Phone Bookings']) as channel_name,
  unnest(ARRAY['direct', 'ota', 'ota', 'ota', 'ota', 'ota', 'ota', 'direct']) as channel_type,
  unnest(ARRAY[0, 15, 18, 20, 12, 14, 25, 0]) as commission_rate
FROM restaurants r;

-- Insert default rate plans
INSERT INTO public.rate_plans (restaurant_id, name, description, plan_type, base_rate) 
SELECT 
  r.id as restaurant_id,
  unnest(ARRAY['Standard Rate', 'Early Bird', 'Last Minute', 'Corporate Rate', 'Group Rate']) as name,
  unnest(ARRAY[
    'Standard room rate',
    '15% discount for bookings 30 days in advance',
    '20% discount for same-day bookings',
    'Special rate for corporate clients',
    'Discounted rate for group bookings (5+ rooms)'
  ]) as description,
  unnest(ARRAY['standard', 'promotional', 'promotional', 'corporate', 'group']) as plan_type,
  unnest(ARRAY[3000, 2550, 2400, 2700, 2500]) as base_rate
FROM restaurants r;

-- Insert sample pricing rules
INSERT INTO public.pricing_rules (restaurant_id, rule_name, rule_type, trigger_condition, adjustment_type, adjustment_value, priority) 
SELECT 
  r.id as restaurant_id,
  unnest(ARRAY[
    'High Occupancy Premium',
    'Weekend Premium',
    'Low Season Discount',
    'Extended Stay Discount',
    'Last Minute Boost'
  ]) as rule_name,
  unnest(ARRAY['occupancy', 'seasonal', 'seasonal', 'length_of_stay', 'demand']) as rule_type,
  unnest(ARRAY[
    '{"occupancy_threshold": 80}',
    '{"days": [5, 6]}',
    '{"months": [6, 7, 8, 9]}',
    '{"min_nights": 7}',
    '{"days_before": 1}'
  ]::jsonb[]) as trigger_condition,
  unnest(ARRAY['percentage', 'percentage', 'percentage', 'percentage', 'percentage']) as adjustment_type,
  unnest(ARRAY[25, 15, -20, -15, 30]) as adjustment_value,
  unnest(ARRAY[1, 2, 3, 4, 5]) as priority
FROM restaurants r;

-- ============================================================================
-- ONLINE AGGREGATOR INTEGRATIONS (Swiggy, Zomato, magicpin, UrbanPiper)
-- ============================================================================

-- 1. Aggregator Stores Configuration Table
CREATE TABLE IF NOT EXISTS public.aggregator_stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('swiggy', 'zomato', 'magicpin', 'urbanpiper', 'ondc')),
    store_id TEXT NOT NULL DEFAULT '',
    merchant_id TEXT DEFAULT '',
    api_key TEXT DEFAULT '',
    api_secret TEXT DEFAULT '',
    webhook_secret TEXT DEFAULT '',
    is_connected BOOLEAN NOT NULL DEFAULT false,
    is_store_open BOOLEAN NOT NULL DEFAULT true,
    is_in_rush BOOLEAN NOT NULL DEFAULT false,
    auto_accept_orders BOOLEAN NOT NULL DEFAULT true,
    default_prep_time_minutes INTEGER NOT NULL DEFAULT 15,
    commission_percentage NUMERIC(5,2) NOT NULL DEFAULT 18.00,
    markup_percentage NUMERIC(5,2) NOT NULL DEFAULT 15.00,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_restaurant_provider UNIQUE (restaurant_id, provider)
);

-- 2. Aggregator Item Mappings & 86ing Table
CREATE TABLE IF NOT EXISTS public.aggregator_item_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('swiggy', 'zomato', 'magicpin', 'urbanpiper', 'ondc')),
    channel_item_id TEXT DEFAULT '',
    channel_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    is_in_stock BOOLEAN NOT NULL DEFAULT true,
    is_available BOOLEAN NOT NULL DEFAULT true,
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_restaurant_item_provider UNIQUE (restaurant_id, menu_item_id, provider)
);

-- 3. Aggregator Orders Log & Relay Table
CREATE TABLE IF NOT EXISTS public.aggregator_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('swiggy', 'zomato', 'magicpin', 'urbanpiper', 'ondc')),
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    aggregator_order_id TEXT NOT NULL,
    display_order_id TEXT NOT NULL,
    customer_name TEXT NOT NULL DEFAULT 'Guest',
    customer_phone TEXT,
    channel_status TEXT NOT NULL DEFAULT 'placed',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    gross_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    packaging_charge NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    taxes NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    commission_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    net_payout NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    rider_name TEXT,
    rider_phone TEXT,
    rider_status TEXT DEFAULT 'not_assigned',
    otp TEXT,
    customer_notes TEXT,
    prep_time_minutes INTEGER NOT NULL DEFAULT 15,
    raw_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_aggregator_stores_restaurant ON public.aggregator_stores(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_aggregator_item_mappings_restaurant ON public.aggregator_item_mappings(restaurant_id, menu_item_id);
CREATE INDEX IF NOT EXISTS idx_aggregator_orders_restaurant ON public.aggregator_orders(restaurant_id, provider, created_at);
CREATE INDEX IF NOT EXISTS idx_aggregator_orders_order_id ON public.aggregator_orders(order_id);

-- RLS Policies
ALTER TABLE public.aggregator_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aggregator_item_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aggregator_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own restaurant aggregator stores"
    ON public.aggregator_stores FOR ALL
    USING (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage own restaurant aggregator items"
    ON public.aggregator_item_mappings FOR ALL
    USING (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage own restaurant aggregator orders"
    ON public.aggregator_orders FOR ALL
    USING (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()));

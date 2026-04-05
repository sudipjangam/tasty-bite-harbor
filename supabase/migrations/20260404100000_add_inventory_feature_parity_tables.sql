-- Feature 2: Supplier Performance Tracking
CREATE TABLE IF NOT EXISTS public.supplier_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurant_settings(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    po_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
    unit_price NUMERIC NOT NULL,
    order_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.supplier_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.supplier_price_history FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.supplier_price_history FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON public.supplier_price_history FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON public.supplier_price_history FOR DELETE USING (auth.role() = 'authenticated');

-- Trigger to auto-capture price when PO is received
CREATE OR REPLACE FUNCTION public.capture_supplier_price_on_receipt()
RETURNS TRIGGER AS $$
BEGIN
    -- If status changes to 'received' or 'partially_received'
    IF NEW.status IN ('received', 'partially_received') AND (OLD.status NOT IN ('received', 'partially_received') OR OLD.status IS NULL) THEN
        INSERT INTO public.supplier_price_history (restaurant_id, supplier_id, item_id, po_id, unit_price, order_date)
        SELECT 
            NEW.restaurant_id,
            NEW.supplier_id,
            poi.item_id,
            NEW.id,
            poi.unit_price,
            NEW.updated_at
        FROM public.purchase_order_items poi
        WHERE poi.po_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_capture_supplier_price ON public.purchase_orders;
CREATE TRIGGER trg_capture_supplier_price
    AFTER UPDATE ON public.purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.capture_supplier_price_on_receipt();


-- Feature 4: Storage Locations Management
CREATE TABLE IF NOT EXISTS public.storage_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurant_settings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.storage_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.storage_locations FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON public.storage_locations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON public.storage_locations FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON public.storage_locations FOR DELETE USING (auth.role() = 'authenticated');

-- Add storage location reference to inventory items
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS storage_location_id UUID REFERENCES public.storage_locations(id) ON DELETE SET NULL;

-- Add salary column to staff table
ALTER TABLE public.staff 
ADD COLUMN IF NOT EXISTS salary DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS salary_type VARCHAR(20) DEFAULT 'monthly' CHECK (salary_type IN ('hourly', 'daily', 'monthly', 'yearly')),
ADD COLUMN IF NOT EXISTS hire_date DATE,
ADD COLUMN IF NOT EXISTS employment_type VARCHAR(20) DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'intern'));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_staff_salary ON public.staff(salary) WHERE salary IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_hire_date ON public.staff(hire_date) WHERE hire_date IS NOT NULL;

-- Add suppliers table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    contact_person VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view suppliers for their restaurant" 
ON public.suppliers FOR SELECT 
USING (
    restaurant_id IN (
        SELECT restaurant_id FROM public.profiles 
        WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can insert suppliers for their restaurant" 
ON public.suppliers FOR INSERT 
WITH CHECK (
    restaurant_id IN (
        SELECT restaurant_id FROM public.profiles 
        WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can update suppliers for their restaurant" 
ON public.suppliers FOR UPDATE 
USING (
    restaurant_id IN (
        SELECT restaurant_id FROM public.profiles 
        WHERE id = auth.uid()
    )
);

-- Add purchase_orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL,
    supplier_id UUID,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    order_date DATE DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'delivered', 'cancelled')),
    total_amount DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL
);

-- Add purchase_order_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_order_id UUID NOT NULL,
    inventory_item_id UUID,
    item_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    received_quantity DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id) ON DELETE SET NULL
);

-- Add RLS policies for purchase orders
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view purchase orders for their restaurant" 
ON public.purchase_orders FOR SELECT 
USING (
    restaurant_id IN (
        SELECT restaurant_id FROM public.profiles 
        WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can insert purchase orders for their restaurant" 
ON public.purchase_orders FOR INSERT 
WITH CHECK (
    restaurant_id IN (
        SELECT restaurant_id FROM public.profiles 
        WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can update purchase orders for their restaurant" 
ON public.purchase_orders FOR UPDATE 
USING (
    restaurant_id IN (
        SELECT restaurant_id FROM public.profiles 
        WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can view purchase order items for their restaurant" 
ON public.purchase_order_items FOR SELECT 
USING (
    purchase_order_id IN (
        SELECT id FROM public.purchase_orders 
        WHERE restaurant_id IN (
            SELECT restaurant_id FROM public.profiles 
            WHERE id = auth.uid()
        )
    )
);

CREATE POLICY "Users can insert purchase order items for their restaurant" 
ON public.purchase_order_items FOR INSERT 
WITH CHECK (
    purchase_order_id IN (
        SELECT id FROM public.purchase_orders 
        WHERE restaurant_id IN (
            SELECT restaurant_id FROM public.profiles 
            WHERE id = auth.uid()
        )
    )
);

CREATE POLICY "Users can update purchase order items for their restaurant" 
ON public.purchase_order_items FOR UPDATE 
USING (
    purchase_order_id IN (
        SELECT id FROM public.purchase_orders 
        WHERE restaurant_id IN (
            SELECT restaurant_id FROM public.profiles 
            WHERE id = auth.uid()
        )
    )
);

-- Add function to auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_suppliers_updated_at 
    BEFORE UPDATE ON public.suppliers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at 
    BEFORE UPDATE ON public.purchase_orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add operational costs table for analytics
CREATE TABLE IF NOT EXISTS public.operational_costs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL,
    cost_type VARCHAR(50) NOT NULL, -- 'rent', 'utilities', 'marketing', 'maintenance', 'other'
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    cost_date DATE DEFAULT CURRENT_DATE,
    is_recurring BOOLEAN DEFAULT false,
    recurring_frequency VARCHAR(20), -- 'monthly', 'quarterly', 'yearly'
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS for operational costs
ALTER TABLE public.operational_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view operational costs for their restaurant" 
ON public.operational_costs FOR SELECT 
USING (
    restaurant_id IN (
        SELECT restaurant_id FROM public.profiles 
        WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can insert operational costs for their restaurant" 
ON public.operational_costs FOR INSERT 
WITH CHECK (
    restaurant_id IN (
        SELECT restaurant_id FROM public.profiles 
        WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can update operational costs for their restaurant" 
ON public.operational_costs FOR UPDATE 
USING (
    restaurant_id IN (
        SELECT restaurant_id FROM public.profiles 
        WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can delete operational costs for their restaurant" 
ON public.operational_costs FOR DELETE 
USING (
    restaurant_id IN (
        SELECT restaurant_id FROM public.profiles 
        WHERE id = auth.uid()
    )
);

-- Add trigger for operational costs updated_at
CREATE TRIGGER update_operational_costs_updated_at 
    BEFORE UPDATE ON public.operational_costs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
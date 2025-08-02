-- Add UPI payment settings to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN upi_id TEXT,
ADD COLUMN payment_gateway_enabled BOOLEAN DEFAULT false;

-- Create payment settings table for additional configurations
CREATE TABLE public.payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  upi_id TEXT NOT NULL,
  upi_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for payment settings
CREATE POLICY "Users can view their own payment settings" 
ON public.payment_settings 
FOR SELECT 
USING (restaurant_id IN (
  SELECT restaurant_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can insert their own payment settings" 
ON public.payment_settings 
FOR INSERT 
WITH CHECK (restaurant_id IN (
  SELECT restaurant_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can update their own payment settings" 
ON public.payment_settings 
FOR UPDATE 
USING (restaurant_id IN (
  SELECT restaurant_id FROM profiles WHERE id = auth.uid()
));

-- Create trigger for updating timestamps
CREATE TRIGGER update_payment_settings_updated_at
BEFORE UPDATE ON public.payment_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
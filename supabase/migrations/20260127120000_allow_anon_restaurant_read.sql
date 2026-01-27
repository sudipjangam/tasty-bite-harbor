-- Allow anonymous users to read restaurant data for QR ordering
-- This enables customers to view restaurant information when scanning QR codes

CREATE POLICY "Allow anonymous read for QR ordering"
ON public.restaurants
FOR SELECT
TO anon
USING (qr_ordering_enabled = true);

-- Comment
COMMENT ON POLICY "Allow anonymous read for QR ordering" ON public.restaurants IS 
'Allows anonymous users (customers) to read restaurant data when QR ordering is enabled. This is required for the QR code ordering system to work.';

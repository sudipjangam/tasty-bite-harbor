-- Create GDPR requests table
CREATE TABLE public.gdpr_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('export', 'delete', 'rectification')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
    user_email TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.gdpr_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Manage gdpr_requests by restaurant" ON public.gdpr_requests
    FOR ALL
    USING (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()));

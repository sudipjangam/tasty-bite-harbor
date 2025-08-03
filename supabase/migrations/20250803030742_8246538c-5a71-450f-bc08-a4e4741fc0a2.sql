-- Create staff_documents table for storing document information
CREATE TABLE public.staff_documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('aadhar_card', 'pan_card', 'voter_id', 'driving_license', 'other')),
    document_number TEXT,
    document_name TEXT NOT NULL,
    google_drive_file_id TEXT,
    google_drive_url TEXT,
    file_size BIGINT,
    mime_type TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.staff_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their restaurant's staff documents" 
ON public.staff_documents 
FOR ALL 
USING (restaurant_id IN (
    SELECT restaurant_id FROM profiles WHERE id = auth.uid()
));

-- Create indexes for better performance
CREATE INDEX idx_staff_documents_staff_id ON public.staff_documents(staff_id);
CREATE INDEX idx_staff_documents_restaurant_id ON public.staff_documents(restaurant_id);
CREATE INDEX idx_staff_documents_type ON public.staff_documents(document_type);

-- Add trigger for updating updated_at timestamp
CREATE TRIGGER update_staff_documents_updated_at
    BEFORE UPDATE ON public.staff_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
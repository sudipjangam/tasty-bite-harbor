-- Ensure staff_documents table exists with proper structure
CREATE TABLE IF NOT EXISTS public.staff_documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('aadhar_card', 'pan_card', 'voter_id', 'driving_license', 'passport', 'bank_passbook', 'salary_certificate', 'experience_letter', 'education_certificate', 'other')),
    document_number TEXT,
    document_name TEXT NOT NULL,
    google_drive_file_id TEXT,
    google_drive_url TEXT,
    file_size BIGINT,
    mime_type TEXT,
    is_verified BOOLEAN DEFAULT false,
    uploaded_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.staff_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for staff documents
CREATE POLICY "Users can view their restaurant's staff documents" 
ON public.staff_documents 
FOR SELECT 
USING (restaurant_id IN (
    SELECT restaurant_id 
    FROM profiles 
    WHERE id = auth.uid()
));

CREATE POLICY "Users can create their restaurant's staff documents" 
ON public.staff_documents 
FOR INSERT 
WITH CHECK (restaurant_id IN (
    SELECT restaurant_id 
    FROM profiles 
    WHERE id = auth.uid()
));

CREATE POLICY "Users can update their restaurant's staff documents" 
ON public.staff_documents 
FOR UPDATE 
USING (restaurant_id IN (
    SELECT restaurant_id 
    FROM profiles 
    WHERE id = auth.uid()
));

CREATE POLICY "Users can delete their restaurant's staff documents" 
ON public.staff_documents 
FOR DELETE 
USING (restaurant_id IN (
    SELECT restaurant_id 
    FROM profiles 
    WHERE id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.update_staff_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_staff_documents_updated_at
    BEFORE UPDATE ON public.staff_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_staff_documents_updated_at();

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'staff_documents_staff_id_fkey'
        AND table_name = 'staff_documents'
    ) THEN
        ALTER TABLE public.staff_documents 
        ADD CONSTRAINT staff_documents_staff_id_fkey 
        FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;
    END IF;
END $$;
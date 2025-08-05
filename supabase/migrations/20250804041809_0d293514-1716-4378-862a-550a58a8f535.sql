-- Update the CHECK constraint to include new document types
ALTER TABLE public.staff_documents 
DROP CONSTRAINT IF EXISTS staff_documents_document_type_check;

ALTER TABLE public.staff_documents 
ADD CONSTRAINT staff_documents_document_type_check 
CHECK (document_type IN ('aadhar_card', 'pan_card', 'voter_id', 'driving_license', 'passport', 'bank_passbook', 'salary_certificate', 'experience_letter', 'education_certificate', 'other'));
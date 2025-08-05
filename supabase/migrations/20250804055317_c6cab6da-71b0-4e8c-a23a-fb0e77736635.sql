-- Add document fields to staff table
ALTER TABLE staff ADD COLUMN documents JSONB DEFAULT '[]'::jsonb;

-- Add comment to explain the structure
COMMENT ON COLUMN staff.documents IS 'Array of document objects: [{"type": "aadhar_card", "number": "1234-5678-9012", "file_url": "base64_or_url", "custom_name": null}, {"type": "other", "number": "ABC123", "file_url": "base64", "custom_name": "Employment Certificate"}]';

-- Create an index on documents for better performance
CREATE INDEX idx_staff_documents ON staff USING GIN (documents);
-- Migrate Customer_MobileNumber from integer to text to support various phone formats
-- and prevent losing leading zeros or country codes

-- First, alter the column type to text
ALTER TABLE orders 
ALTER COLUMN "Customer_MobileNumber" TYPE text 
USING CASE 
  WHEN "Customer_MobileNumber" IS NULL THEN NULL
  ELSE "Customer_MobileNumber"::text
END;

-- Add comment explaining the column
COMMENT ON COLUMN orders."Customer_MobileNumber" IS 'Customer mobile number stored as text to preserve formatting and leading zeros';
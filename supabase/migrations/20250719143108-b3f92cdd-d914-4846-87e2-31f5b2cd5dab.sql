-- Fix the budget status check constraint
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_status_check;

-- Add proper check constraint for budget status
ALTER TABLE budgets ADD CONSTRAINT budgets_status_check 
CHECK (status IN ('draft', 'active', 'approved', 'completed', 'cancelled'));

-- Update existing budgets with invalid status to 'draft'
UPDATE budgets SET status = 'draft' WHERE status NOT IN ('draft', 'active', 'approved', 'completed', 'cancelled');
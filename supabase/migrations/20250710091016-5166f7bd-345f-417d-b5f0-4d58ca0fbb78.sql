-- Add missing roles to the user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'owner';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'chef';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'waiter';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'staff';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'viewer';
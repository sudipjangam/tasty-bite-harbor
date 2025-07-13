-- Check and fix RLS policies for profiles table to ensure users can access their own profile
-- First, let's check if the policies exist and update them if needed

-- Enable RLS on profiles table (if not already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to recreate them properly
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create policy for users to view their own profile data
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- Create policy for users to update their own profile
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- Create policy for users to insert their own profile
CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- Also ensure restaurants table has proper RLS policies
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- Drop and recreate restaurant policies
DROP POLICY IF EXISTS "Users can view restaurant data" ON public.restaurants;

-- Allow users to view restaurant data if they are associated with that restaurant
CREATE POLICY "Users can view restaurant data" 
ON public.restaurants 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.restaurant_id = restaurants.id
  )
);

-- Ensure restaurant_subscriptions table has proper RLS policies
ALTER TABLE public.restaurant_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop and recreate subscription policies
DROP POLICY IF EXISTS "Users can view restaurant subscriptions" ON public.restaurant_subscriptions;

-- Allow users to view subscription data for their restaurant
CREATE POLICY "Users can view restaurant subscriptions" 
ON public.restaurant_subscriptions 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.restaurant_id = restaurant_subscriptions.restaurant_id
  )
);
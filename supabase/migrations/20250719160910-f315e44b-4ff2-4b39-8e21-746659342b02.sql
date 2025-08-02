-- Create backup_settings table
CREATE TABLE public.backup_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  auto_backup_enabled BOOLEAN NOT NULL DEFAULT false,
  backup_frequency TEXT NOT NULL DEFAULT 'daily',
  retention_days INTEGER NOT NULL DEFAULT 30,
  backup_location TEXT NOT NULL DEFAULT 'local',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.backup_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "backup_settings_policy" 
ON public.backup_settings 
FOR ALL 
USING (restaurant_id IN (
  SELECT profiles.restaurant_id 
  FROM profiles 
  WHERE profiles.id = auth.uid()
));

-- Create trigger for updated_at
CREATE TRIGGER update_backup_settings_updated_at
  BEFORE UPDATE ON public.backup_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
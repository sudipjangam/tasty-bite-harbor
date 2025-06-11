
-- Create guest profiles table for detailed guest information
CREATE TABLE public.guest_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  guest_phone TEXT,
  date_of_birth DATE,
  nationality TEXT,
  id_type TEXT CHECK (id_type IN ('passport', 'drivers_license', 'aadhar', 'voter_id', 'other')),
  id_number TEXT,
  address JSONB DEFAULT '{}',
  emergency_contact JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  vip_status BOOLEAN DEFAULT false,
  blacklisted BOOLEAN DEFAULT false,
  notes TEXT,
  total_stays INTEGER DEFAULT 0,
  total_spent NUMERIC(12,2) DEFAULT 0,
  last_stay TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, guest_email),
  UNIQUE(restaurant_id, guest_phone)
);

-- Create guest documents table for storing ID documents
CREATE TABLE public.guest_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_profile_id UUID NOT NULL REFERENCES guest_profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('id_front', 'id_back', 'passport', 'visa', 'other')),
  document_url TEXT NOT NULL,
  document_number TEXT,
  expiry_date DATE,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create check_ins table for tracking check-in process
CREATE TABLE public.check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  reservation_id UUID NOT NULL REFERENCES reservations(id),
  guest_profile_id UUID NOT NULL REFERENCES guest_profiles(id),
  room_id UUID NOT NULL REFERENCES rooms(id),
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  expected_check_out TIMESTAMPTZ NOT NULL,
  actual_check_out TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'checked_in' CHECK (status IN ('checked_in', 'checked_out', 'no_show', 'early_departure')),
  check_in_method TEXT NOT NULL DEFAULT 'front_desk' CHECK (check_in_method IN ('front_desk', 'self_service', 'mobile')),
  room_rate NUMERIC(10,2) NOT NULL,
  total_guests INTEGER NOT NULL DEFAULT 1,
  special_requests TEXT,
  key_cards_issued INTEGER DEFAULT 1,
  security_deposit NUMERIC(10,2) DEFAULT 0,
  additional_charges JSONB DEFAULT '[]',
  staff_notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.guest_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "guest_profiles_policy" ON public.guest_profiles FOR ALL USING (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "guest_documents_policy" ON public.guest_documents FOR ALL USING (
  EXISTS (
    SELECT 1 FROM guest_profiles gp 
    WHERE gp.id = guest_documents.guest_profile_id 
    AND gp.restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "check_ins_policy" ON public.check_ins FOR ALL USING (
  restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
);

-- Create updated_at triggers
CREATE TRIGGER update_guest_profiles_updated_at BEFORE UPDATE ON guest_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_check_ins_updated_at BEFORE UPDATE ON check_ins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

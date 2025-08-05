
export interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  position?: string;
  email?: string;
  phone?: string;
  Shift?: string;
  restaurant_id: string;
  created_at: string;
  updated_at: string;
  status?: string;
  photo_url?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  start_date?: string;
  availability_notes?: string;
  role_ids?: string[];
  salary?: number;
  salary_type?: string;
  documents?: Document[];
}

export interface Document {
  type: string;
  number: string;
  file_url: string;
  custom_name?: string;
}

export interface StaffRole {
  id: string;
  name: string;
  restaurant_id: string;
  permissions: any[];
  created_at: string;
  updated_at: string;
}

export interface StaffShift {
  id: string;
  staff_id: string;
  restaurant_id: string;
  start_time: string;
  end_time: string;
  location?: string;
  created_at: string;
  updated_at: string;
}

export interface StaffLeaveBalance {
  id: string;
  staff_id: string;
  restaurant_id: string;
  leave_type: string;
  total_days: number;
  used_days: number;
  created_at: string;
  updated_at: string;
}

export interface StaffLeaveType {
  id: string;
  restaurant_id: string;
  name: string;
  accrual_type: string;
  accrual_amount: number;
  accrual_period: string;
  requires_approval: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffLeaveRequest {
  id: string;
  staff_id: string;
  restaurant_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason?: string;
  status: "pending" | "approved" | "denied";
  approved_by?: string;
  manager_comments?: string;
  created_at: string;
  updated_at: string;
}

export interface StaffTimeClockEntry {
  id: string;
  staff_id: string;
  restaurant_id: string;
  clock_in: string;
  clock_out?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface StaffDocument {
  id: string;
  staff_id: string;
  restaurant_id: string;
  document_type: 'aadhar_card' | 'pan_card' | 'voter_id' | 'driving_license' | 'passport' | 'bank_passbook' | 'salary_certificate' | 'experience_letter' | 'education_certificate' | 'other';
  document_number?: string;
  document_name: string;
  google_drive_file_id?: string;
  google_drive_url?: string;
  file_size?: number;
  mime_type?: string;
  is_verified?: boolean;
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
}

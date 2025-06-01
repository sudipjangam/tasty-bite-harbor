
export interface TableReservation {
  id: string;
  restaurant_id: string;
  table_id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
  special_requests?: string;
  notes?: string;
  arrival_time?: string;
  departure_time?: string;
  created_at: string;
  updated_at: string;
}

export interface RestaurantOperatingHours {
  id: string;
  restaurant_id: string;
  day_of_week: number;
  opening_time: string;
  closing_time: string;
  is_closed: boolean;
  created_at: string;
  updated_at: string;
}

export interface TableAvailabilitySlot {
  id: string;
  restaurant_id: string;
  table_id: string;
  date: string;
  time_slot: string;
  is_available: boolean;
  max_party_size?: number;
  created_at: string;
  updated_at: string;
}

export interface ReservationFormData {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  duration_minutes: number;
  special_requests: string;
}

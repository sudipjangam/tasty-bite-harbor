/**
 * Room and Hotel related types
 */

export interface RoomFoodOrder {
  id: string;
  created_at: string;
  room_id: string;
  order_id: string;
  total: number;
  status: string;
}

export interface Room {
  id: string;
  room_number: string;
  room_type: string;
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  floor: number;
  restaurant_id: string;
  created_at: string;
  updated_at: string;
}

export interface ReservationWithSpecialOccasion {
  id: string;
  customer_name: string;
  customer_phone: string;
  special_occasion: string;
  special_occasion_date: string;
  room_id: string;
}

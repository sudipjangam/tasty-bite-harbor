export interface Order {
  id: string;
  customer_name: string;
  items: string[];
  total: number;
  status: string;
  created_at: string;
  restaurant_id: string;
  updated_at: string;
}
import { OrderItem } from './orders';

/**
 * QR Code entity types
 */
export type QREntityType = 'table' | 'room';

/**
 * Payment status for customer order sessions
 */
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * QR Code interface for tables and rooms
 */
export interface QRCode {
  id: string;
  restaurant_id: string;
  entity_type: QREntityType;
  entity_id: string; // References restaurant_tables.id or restaurant_rooms.id
  qr_code_data: string; // Encrypted data containing entity info and token
  qr_code_url?: string; // Base64 image or URL to QR code image
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Customer Order Session for managing cart and payment before order placement
 */
export interface CustomerOrderSession {
  id: string;
  qr_code_id?: string;
  restaurant_id: string;
  entity_type: QREntityType;
  entity_id: string;
  session_token: string;
  cart_items: OrderItem[];
  customer_name?: string;
  customer_phone?: string;
  special_instructions?: string;
  payment_status: PaymentStatus;
  payment_intent_id?: string;
  payment_amount?: number;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

/**
 * QR Ordering Settings for restaurants
 */
export interface QROrderSettings {
  qr_ordering_enabled: boolean;
  qr_service_charge_percent: number;
  qr_payment_required: boolean; // Always true for security
}

/**
 * Decoded QR Code Data
 */
export interface DecodedQRData {
  restaurantId: string;
  entityType: QREntityType;
  entityId: string;
  entityName: string; // Table number or room number
  token: string;
  timestamp: number;
}

/**
 * Customer Menu Item (simplified for public display)
 */
export interface CustomerMenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image_url?: string;
  is_vegetarian?: boolean;
  is_available: boolean;
}

/**
 * Restaurant Info for Customer (public info only)
 */
export interface CustomerRestaurantInfo {
  id: string;
  name: string;
  logo_url?: string;
  qr_ordering_enabled: boolean;
  qr_service_charge_percent: number;
  upi_id?: string; // For payment
  upi_name?: string;
}

/**
 * QR Order Placement Request
 */
export interface QROrderRequest {
  session_id: string;
  customer_name?: string;
  customer_phone?: string;
  special_instructions?: string;
  payment_intent_id: string; // Payment must be completed first
}

/**
 * QR Order Response
 */
export interface QROrderResponse {
  success: boolean;
  order_id?: string;
  order_number?: string;
  tracking_token?: string;
  message?: string;
  error?: string;
}

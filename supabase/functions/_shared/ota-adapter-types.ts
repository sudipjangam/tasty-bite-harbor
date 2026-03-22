/**
 * OTA Adapter — Shared Types & Interface
 * 
 * Every OTA integration (MMT, Goibibo, Booking.com, etc.) must implement
 * the OTAAdapter interface. This ensures the core sync engine is OTA-agnostic.
 */

// ─── Authentication ───────────────────────────────────────────────

export interface OTACredentials {
  ota_name: string;
  username?: string;
  password?: string;
  access_token?: string;
  refresh_token?: string;
  api_endpoint?: string;
  auth_type: 'token' | 'basic' | 'session' | 'oauth2';
  extra_config?: Record<string, any>;
}

export interface AuthSession {
  token: string;
  token_type: 'bearer' | 'basic' | 'cookie';
  expires_at?: Date;
  cookies?: Record<string, string>;
  headers: Record<string, string>;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latency_ms: number;
  ota_name: string;
  details?: Record<string, any>;
}

// ─── ARI (Availability, Rates, Inventory) ─────────────────────────

export interface RatePushPayload {
  ota_room_type_id: string;
  ota_rate_plan_id: string;
  date: string;          // YYYY-MM-DD
  rate: number;
  currency: string;
  single_rate?: number;  // single occupancy rate
  extra_adult?: number;
  extra_child?: number;
}

export interface AvailabilityPayload {
  ota_room_type_id: string;
  date: string;          // YYYY-MM-DD
  available_count: number;
  stop_sell: boolean;
}

export interface RestrictionPayload {
  ota_room_type_id: string;
  ota_rate_plan_id?: string;
  date: string;
  restriction_type: 'stop_sell' | 'close_to_arrival' | 'close_to_departure' | 'min_stay' | 'max_stay' | 'min_advance' | 'max_advance';
  value: number | boolean;
}

// ─── Reservations ─────────────────────────────────────────────────

export interface OTAReservation {
  ota_booking_id: string;
  ota_name: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  check_in: string;
  check_out: string;
  room_type: string;
  ota_room_type_id: string;
  room_count: number;
  adults: number;
  children: number;
  total_amount: number;
  commission_amount?: number;
  net_amount?: number;
  currency: string;
  booking_status: 'confirmed' | 'modified' | 'cancelled' | 'no_show';
  payment_status: 'pending' | 'paid' | 'partial' | 'refunded';
  payment_mode?: 'prepaid' | 'pay_at_hotel';
  special_requests?: string;
  raw_payload: Record<string, any>;
}

export interface OTAModification {
  ota_booking_id: string;
  modification_type: 'date_change' | 'room_change' | 'guest_change' | 'rate_change';
  old_values: Record<string, any>;
  new_values: Record<string, any>;
  raw_payload: Record<string, any>;
}

export interface OTACancellation {
  ota_booking_id: string;
  cancellation_reason?: string;
  cancellation_charge?: number;
  raw_payload: Record<string, any>;
}

// ─── Sync Result ──────────────────────────────────────────────────

export interface SyncResult {
  success: boolean;
  records_processed: number;
  records_failed: number;
  errors: SyncError[];
  request_payload?: Record<string, any>;
  response_payload?: Record<string, any>;
  http_status_code?: number;
  duration_ms: number;
}

export interface SyncError {
  code: string;
  message: string;
  record_id?: string;
  details?: Record<string, any>;
}

// ─── The Core Adapter Interface ───────────────────────────────────

export interface OTAAdapter {
  readonly ota_name: string;

  // Authentication — works with your credentials
  authenticate(credentials: OTACredentials): Promise<AuthSession>;
  refreshSession(session: AuthSession): Promise<AuthSession>;
  testConnection(credentials: OTACredentials): Promise<ConnectionTestResult>;

  // ARI Push (Outbound: your system → OTA)
  pushRates(session: AuthSession, rates: RatePushPayload[]): Promise<SyncResult>;
  pushAvailability(session: AuthSession, inventory: AvailabilityPayload[]): Promise<SyncResult>;
  pushRestrictions(session: AuthSession, restrictions: RestrictionPayload[]): Promise<SyncResult>;

  // Reservation Pull (Inbound: OTA → your system)
  pullReservations(session: AuthSession, since: Date): Promise<OTAReservation[]>;
  pullModifications(session: AuthSession, since: Date): Promise<OTAModification[]>;
  pullCancellations(session: AuthSession, since: Date): Promise<OTACancellation[]>;
  confirmReservation(session: AuthSession, ota_booking_id: string): Promise<boolean>;
}

// ─── Adapter Registry ─────────────────────────────────────────────

const adapterRegistry = new Map<string, () => OTAAdapter>();

export function registerAdapter(ota_name: string, factory: () => OTAAdapter): void {
  adapterRegistry.set(ota_name.toLowerCase(), factory);
}

export function getAdapter(ota_name: string): OTAAdapter {
  const factory = adapterRegistry.get(ota_name.toLowerCase());
  if (!factory) {
    throw new Error(`No adapter registered for OTA: ${ota_name}. Available: ${Array.from(adapterRegistry.keys()).join(', ')}`);
  }
  return factory();
}

export function getRegisteredAdapters(): string[] {
  return Array.from(adapterRegistry.keys());
}

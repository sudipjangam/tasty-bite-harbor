/**
 * MakeMyTrip / Goibibo OTA Adapter
 * 
 * Both MMT and Goibibo share the InGo-MMT platform. This adapter handles:
 * - Token-based authentication (access token from InGo-MMT Extranet)
 * - Session-based fallback (login with username/password)
 * - Rate push, availability push, restriction push
 * - Reservation pull, modification pull, cancellation pull
 */

import type {
  OTAAdapter,
  OTACredentials,
  AuthSession,
  ConnectionTestResult,
  RatePushPayload,
  AvailabilityPayload,
  RestrictionPayload,
  OTAReservation,
  OTAModification,
  OTACancellation,
  SyncResult,
  SyncError,
} from './ota-adapter-types.ts';

import { registerAdapter } from './ota-adapter-types.ts';

const DEFAULT_MMT_API_BASE = 'https://connect.makemytrip.com/api/v1';

export class MMTGoibiboAdapter implements OTAAdapter {
  readonly ota_name: string;
  
  constructor(ota_name: string = 'mmt') {
    this.ota_name = ota_name; // 'mmt' or 'goibibo' — same API, different display name
  }

  // ─── Authentication ───────────────────────────────────────────

  async authenticate(credentials: OTACredentials): Promise<AuthSession> {
    const baseUrl = credentials.api_endpoint || DEFAULT_MMT_API_BASE;

    // Tier 1: If we have an access token, use it directly
    if (credentials.access_token) {
      return {
        token: credentials.access_token,
        token_type: 'bearer',
        expires_at: credentials.extra_config?.token_expiry 
          ? new Date(credentials.extra_config.token_expiry) 
          : undefined,
        headers: {
          'Authorization': `Bearer ${credentials.access_token}`,
          'Content-Type': 'application/json',
          'X-Channel-Manager': 'SwadeshiCMS',
        },
      };
    }

    // Tier 3 fallback: Login with username/password to get a session
    if (credentials.username && credentials.password) {
      const loginResponse = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
        }),
      });

      if (!loginResponse.ok) {
        const errorBody = await loginResponse.text();
        throw new Error(`MMT login failed (${loginResponse.status}): ${errorBody}`);
      }

      const loginData = await loginResponse.json();
      const sessionToken = loginData.token || loginData.access_token || loginData.session_id;

      if (!sessionToken) {
        throw new Error('MMT login response did not contain a token');
      }

      return {
        token: sessionToken,
        token_type: 'bearer',
        expires_at: loginData.expires_at ? new Date(loginData.expires_at) : undefined,
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
          'X-Channel-Manager': 'SwadeshiCMS',
        },
      };
    }

    throw new Error('No valid credentials provided for MMT/Goibibo. Need access_token or username+password.');
  }

  async refreshSession(session: AuthSession): Promise<AuthSession> {
    // For token-based auth, re-authenticate with stored credentials
    // The caller should handle this by calling authenticate() again
    return session;
  }

  async testConnection(credentials: OTACredentials): Promise<ConnectionTestResult> {
    const start = Date.now();
    try {
      const session = await this.authenticate(credentials);
      const baseUrl = credentials.api_endpoint || DEFAULT_MMT_API_BASE;
      
      // Hit a lightweight endpoint to verify connectivity
      const response = await fetch(`${baseUrl}/property/status`, {
        headers: session.headers,
      });

      return {
        success: response.ok,
        message: response.ok 
          ? 'Connected to InGo-MMT successfully' 
          : `Connection test returned HTTP ${response.status}`,
        latency_ms: Date.now() - start,
        ota_name: this.ota_name,
        details: {
          http_status: response.status,
          auth_type: credentials.auth_type,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        latency_ms: Date.now() - start,
        ota_name: this.ota_name,
      };
    }
  }

  // ─── ARI Push ─────────────────────────────────────────────────

  async pushRates(session: AuthSession, rates: RatePushPayload[]): Promise<SyncResult> {
    const start = Date.now();
    const errors: SyncError[] = [];
    let processed = 0;

    try {
      // InGo-MMT accepts batch rate updates
      const payload = {
        rates: rates.map(r => ({
          room_type_id: r.ota_room_type_id,
          rate_plan_id: r.ota_rate_plan_id,
          date: r.date,
          price: r.rate,
          currency: r.currency || 'INR',
          single_occupancy_price: r.single_rate,
          extra_adult_charge: r.extra_adult,
          extra_child_charge: r.extra_child,
        })),
      };

      const response = await fetch(`${this._getBaseUrl(session)}/rates/update`, {
        method: 'POST',
        headers: session.headers,
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => ({ error: 'Non-JSON response' }));

      if (response.ok) {
        processed = rates.length;
      } else {
        errors.push({
          code: `HTTP_${response.status}`,
          message: responseData.error || responseData.message || `HTTP ${response.status}`,
          details: responseData,
        });
      }

      return {
        success: response.ok,
        records_processed: processed,
        records_failed: rates.length - processed,
        errors,
        request_payload: payload,
        response_payload: responseData,
        http_status_code: response.status,
        duration_ms: Date.now() - start,
      };
    } catch (error) {
      errors.push({
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Unknown network error',
      });

      return {
        success: false,
        records_processed: 0,
        records_failed: rates.length,
        errors,
        duration_ms: Date.now() - start,
      };
    }
  }

  async pushAvailability(session: AuthSession, inventory: AvailabilityPayload[]): Promise<SyncResult> {
    const start = Date.now();
    const errors: SyncError[] = [];

    try {
      const payload = {
        inventory: inventory.map(inv => ({
          room_type_id: inv.ota_room_type_id,
          date: inv.date,
          available_rooms: inv.available_count,
          stop_sell: inv.stop_sell,
        })),
      };

      const response = await fetch(`${this._getBaseUrl(session)}/availability/update`, {
        method: 'POST',
        headers: session.headers,
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => ({ error: 'Non-JSON response' }));

      if (!response.ok) {
        errors.push({
          code: `HTTP_${response.status}`,
          message: responseData.error || `HTTP ${response.status}`,
          details: responseData,
        });
      }

      return {
        success: response.ok,
        records_processed: response.ok ? inventory.length : 0,
        records_failed: response.ok ? 0 : inventory.length,
        errors,
        request_payload: payload,
        response_payload: responseData,
        http_status_code: response.status,
        duration_ms: Date.now() - start,
      };
    } catch (error) {
      errors.push({
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        records_processed: 0,
        records_failed: inventory.length,
        errors,
        duration_ms: Date.now() - start,
      };
    }
  }

  async pushRestrictions(session: AuthSession, restrictions: RestrictionPayload[]): Promise<SyncResult> {
    const start = Date.now();
    const errors: SyncError[] = [];

    try {
      const payload = {
        restrictions: restrictions.map(r => ({
          room_type_id: r.ota_room_type_id,
          rate_plan_id: r.ota_rate_plan_id,
          date: r.date,
          type: r.restriction_type,
          value: r.value,
        })),
      };

      const response = await fetch(`${this._getBaseUrl(session)}/restrictions/update`, {
        method: 'POST',
        headers: session.headers,
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        errors.push({
          code: `HTTP_${response.status}`,
          message: responseData.error || `HTTP ${response.status}`,
          details: responseData,
        });
      }

      return {
        success: response.ok,
        records_processed: response.ok ? restrictions.length : 0,
        records_failed: response.ok ? 0 : restrictions.length,
        errors,
        request_payload: payload,
        response_payload: responseData,
        http_status_code: response.status,
        duration_ms: Date.now() - start,
      };
    } catch (error) {
      errors.push({ code: 'NETWORK_ERROR', message: error instanceof Error ? error.message : 'Unknown error' });
      return { success: false, records_processed: 0, records_failed: restrictions.length, errors, duration_ms: Date.now() - start };
    }
  }

  // ─── Reservation Pull ─────────────────────────────────────────

  async pullReservations(session: AuthSession, since: Date): Promise<OTAReservation[]> {
    try {
      const response = await fetch(
        `${this._getBaseUrl(session)}/reservations?since=${since.toISOString()}&status=confirmed`,
        { headers: session.headers }
      );

      if (!response.ok) {
        throw new Error(`Failed to pull reservations: HTTP ${response.status}`);
      }

      const data = await response.json();
      const bookings = data.reservations || data.bookings || data.data || [];

      return bookings.map((b: any) => ({
        ota_booking_id: b.booking_id || b.reservation_id || b.id,
        ota_name: this.ota_name,
        guest_name: b.guest_name || b.customer_name || `${b.first_name || ''} ${b.last_name || ''}`.trim(),
        guest_email: b.guest_email || b.email,
        guest_phone: b.guest_phone || b.phone || b.mobile,
        check_in: b.check_in || b.checkin_date,
        check_out: b.check_out || b.checkout_date,
        room_type: b.room_type || b.room_category,
        ota_room_type_id: b.room_type_id || b.room_id,
        room_count: b.room_count || b.rooms || 1,
        adults: b.adults || b.adult_count || 1,
        children: b.children || b.child_count || 0,
        total_amount: parseFloat(b.total_amount || b.total_price || b.amount || 0),
        commission_amount: parseFloat(b.commission || 0),
        net_amount: parseFloat(b.net_amount || b.hotel_amount || 0),
        currency: b.currency || 'INR',
        booking_status: this._mapBookingStatus(b.status),
        payment_status: b.payment_status || 'pending',
        payment_mode: b.payment_mode || b.pay_mode,
        special_requests: b.special_requests || b.remarks,
        raw_payload: b,
      }));
    } catch (error) {
      console.error(`[${this.ota_name}] Failed to pull reservations:`, error);
      return [];
    }
  }

  async pullModifications(session: AuthSession, since: Date): Promise<OTAModification[]> {
    try {
      const response = await fetch(
        `${this._getBaseUrl(session)}/reservations?since=${since.toISOString()}&status=modified`,
        { headers: session.headers }
      );

      if (!response.ok) return [];

      const data = await response.json();
      const mods = data.modifications || data.data || [];

      return mods.map((m: any) => ({
        ota_booking_id: m.booking_id || m.reservation_id,
        modification_type: m.type || 'date_change',
        old_values: m.old_values || {},
        new_values: m.new_values || {},
        raw_payload: m,
      }));
    } catch {
      return [];
    }
  }

  async pullCancellations(session: AuthSession, since: Date): Promise<OTACancellation[]> {
    try {
      const response = await fetch(
        `${this._getBaseUrl(session)}/reservations?since=${since.toISOString()}&status=cancelled`,
        { headers: session.headers }
      );

      if (!response.ok) return [];

      const data = await response.json();
      const cancellations = data.cancellations || data.data || [];

      return cancellations.map((c: any) => ({
        ota_booking_id: c.booking_id || c.reservation_id,
        cancellation_reason: c.reason || c.cancellation_reason,
        cancellation_charge: parseFloat(c.charge || c.cancellation_charge || 0),
        raw_payload: c,
      }));
    } catch {
      return [];
    }
  }

  async confirmReservation(session: AuthSession, ota_booking_id: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this._getBaseUrl(session)}/reservations/${ota_booking_id}/confirm`,
        { method: 'POST', headers: session.headers }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private _getBaseUrl(_session: AuthSession): string {
    return DEFAULT_MMT_API_BASE;
  }

  private _mapBookingStatus(status: string): OTAReservation['booking_status'] {
    const s = (status || '').toLowerCase();
    if (s.includes('confirm')) return 'confirmed';
    if (s.includes('modif')) return 'modified';
    if (s.includes('cancel')) return 'cancelled';
    if (s.includes('no_show') || s.includes('noshow')) return 'no_show';
    return 'confirmed';
  }
}

// ─── Register both MMT and Goibibo (shared platform) ────────────

registerAdapter('mmt', () => new MMTGoibiboAdapter('mmt'));
registerAdapter('makemytrip', () => new MMTGoibiboAdapter('mmt'));
registerAdapter('goibibo', () => new MMTGoibiboAdapter('goibibo'));

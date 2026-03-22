/**
 * Booking.com OTA Adapter
 * 
 * Booking.com uses the Connectivity Partner API with:
 * - OTA XML (OpenTravel Alliance v2003B) or JSON REST endpoints
 * - HTTP Basic Auth (partner username + password)
 * 
 * This adapter supports both JSON REST (preferred) and XML fallback.
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
} from '../ota-adapter-types.ts';

import { registerAdapter } from '../ota-adapter-types.ts';

const DEFAULT_BDC_API_BASE = 'https://supply-xml.booking.com/hotels/xml';
const DEFAULT_BDC_JSON_BASE = 'https://supply-api.booking.com/v1';

export class BookingComAdapter implements OTAAdapter {
  readonly ota_name = 'booking_com';
  private useJson: boolean;

  constructor(useJson: boolean = true) {
    this.useJson = useJson;
  }

  // ─── Authentication ───────────────────────────────────────────

  async authenticate(credentials: OTACredentials): Promise<AuthSession> {
    // Booking.com uses HTTP Basic Auth for Connectivity Partners
    if (credentials.username && credentials.password) {
      const basicToken = btoa(`${credentials.username}:${credentials.password}`);
      
      return {
        token: basicToken,
        token_type: 'basic',
        headers: {
          'Authorization': `Basic ${basicToken}`,
          'Content-Type': this.useJson ? 'application/json' : 'application/xml',
          'Accept': this.useJson ? 'application/json' : 'application/xml',
        },
      };
    }

    // Fallback: access token if provided (custom arrangements)
    if (credentials.access_token) {
      return {
        token: credentials.access_token,
        token_type: 'bearer',
        headers: {
          'Authorization': `Bearer ${credentials.access_token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      };
    }

    throw new Error('Booking.com requires username + password (Basic Auth) or an access token.');
  }

  async refreshSession(session: AuthSession): Promise<AuthSession> {
    // Basic auth doesn't expire — just return the same session
    return session;
  }

  async testConnection(credentials: OTACredentials): Promise<ConnectionTestResult> {
    const start = Date.now();
    try {
      const session = await this.authenticate(credentials);
      const baseUrl = credentials.api_endpoint || DEFAULT_BDC_JSON_BASE;

      const response = await fetch(`${baseUrl}/hotels/status`, {
        headers: session.headers,
      });

      return {
        success: response.ok || response.status === 401, // 401 means we reached BDC
        message: response.ok 
          ? 'Connected to Booking.com API successfully'
          : response.status === 401 
            ? 'Reached Booking.com but credentials invalid — check username/password'
            : `Connection returned HTTP ${response.status}`,
        latency_ms: Date.now() - start,
        ota_name: this.ota_name,
        details: { http_status: response.status },
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

    try {
      if (this.useJson) {
        return await this._pushRatesJson(session, rates, start);
      } else {
        return await this._pushRatesXml(session, rates, start);
      }
    } catch (error) {
      errors.push({
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      return { success: false, records_processed: 0, records_failed: rates.length, errors, duration_ms: Date.now() - start };
    }
  }

  private async _pushRatesJson(session: AuthSession, rates: RatePushPayload[], start: number): Promise<SyncResult> {
    const errors: SyncError[] = [];
    const payload = {
      hotel_rates: rates.map(r => ({
        room_id: r.ota_room_type_id,
        rate_plan_id: r.ota_rate_plan_id,
        date_from: r.date,
        date_to: r.date,
        price: r.rate,
        currency_code: r.currency || 'INR',
        extra_adult: r.extra_adult,
        extra_child: r.extra_child,
      })),
    };

    const response = await fetch(`${DEFAULT_BDC_JSON_BASE}/rates`, {
      method: 'PUT',
      headers: session.headers,
      body: JSON.stringify(payload),
    });

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      errors.push({
        code: `HTTP_${response.status}`,
        message: responseData.message || responseData.error || `HTTP ${response.status}`,
        details: responseData,
      });
    }

    return {
      success: response.ok,
      records_processed: response.ok ? rates.length : 0,
      records_failed: response.ok ? 0 : rates.length,
      errors,
      request_payload: payload,
      response_payload: responseData,
      http_status_code: response.status,
      duration_ms: Date.now() - start,
    };
  }

  private async _pushRatesXml(session: AuthSession, rates: RatePushPayload[], start: number): Promise<SyncResult> {
    const errors: SyncError[] = [];

    // Build OTA_HotelRateAmountNotifRQ XML (OpenTravel Alliance v2003B)
    const rateElements = rates.map(r => `
      <RateAmountMessage>
        <StatusApplicationControl Start="${r.date}" End="${r.date}" 
          InvTypeCode="${r.ota_room_type_id}" RatePlanCode="${r.ota_rate_plan_id}"/>
        <Rates>
          <Rate>
            <BaseByGuestAmts>
              <BaseByGuestAmt AmountAfterTax="${r.rate}" CurrencyCode="${r.currency || 'INR'}" NumberOfGuests="2"/>
            </BaseByGuestAmts>
          </Rate>
        </Rates>
      </RateAmountMessage>`
    ).join('\n');

    const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<OTA_HotelRateAmountNotifRQ xmlns="http://www.opentravel.org/OTA/2003/05" Version="1.0">
  <RateAmountMessages>${rateElements}
  </RateAmountMessages>
</OTA_HotelRateAmountNotifRQ>`;

    const response = await fetch(`${DEFAULT_BDC_API_BASE}/rateamount`, {
      method: 'POST',
      headers: { ...session.headers, 'Content-Type': 'application/xml' },
      body: xmlPayload,
    });

    const responseText = await response.text();

    if (!response.ok) {
      errors.push({ code: `HTTP_${response.status}`, message: responseText.substring(0, 500) });
    }

    return {
      success: response.ok,
      records_processed: response.ok ? rates.length : 0,
      records_failed: response.ok ? 0 : rates.length,
      errors,
      request_payload: { xml: xmlPayload },
      response_payload: { body: responseText.substring(0, 2000) },
      http_status_code: response.status,
      duration_ms: Date.now() - start,
    };
  }

  async pushAvailability(session: AuthSession, inventory: AvailabilityPayload[]): Promise<SyncResult> {
    const start = Date.now();
    const errors: SyncError[] = [];

    try {
      const payload = {
        availability: inventory.map(inv => ({
          room_id: inv.ota_room_type_id,
          date_from: inv.date,
          date_to: inv.date,
          rooms_to_sell: inv.available_count,
          closed: inv.stop_sell,
        })),
      };

      const response = await fetch(`${DEFAULT_BDC_JSON_BASE}/availability`, {
        method: 'PUT',
        headers: session.headers,
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        errors.push({
          code: `HTTP_${response.status}`,
          message: responseData.message || `HTTP ${response.status}`,
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
      errors.push({ code: 'NETWORK_ERROR', message: error instanceof Error ? error.message : 'Unknown error' });
      return { success: false, records_processed: 0, records_failed: inventory.length, errors, duration_ms: Date.now() - start };
    }
  }

  async pushRestrictions(session: AuthSession, restrictions: RestrictionPayload[]): Promise<SyncResult> {
    const start = Date.now();
    const errors: SyncError[] = [];

    try {
      const payload = {
        restrictions: restrictions.map(r => ({
          room_id: r.ota_room_type_id,
          rate_plan_id: r.ota_rate_plan_id,
          date_from: r.date,
          date_to: r.date,
          closed: r.restriction_type === 'stop_sell' ? r.value : undefined,
          closed_on_arrival: r.restriction_type === 'close_to_arrival' ? r.value : undefined,
          closed_on_departure: r.restriction_type === 'close_to_departure' ? r.value : undefined,
          min_length_of_stay: r.restriction_type === 'min_stay' ? r.value : undefined,
          max_length_of_stay: r.restriction_type === 'max_stay' ? r.value : undefined,
        })),
      };

      const response = await fetch(`${DEFAULT_BDC_JSON_BASE}/availability`, {
        method: 'PUT',
        headers: session.headers,
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        errors.push({ code: `HTTP_${response.status}`, message: responseData.message || `HTTP ${response.status}`, details: responseData });
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
        `${DEFAULT_BDC_JSON_BASE}/reservations?last_change=${since.toISOString()}&status=confirmed`,
        { headers: session.headers }
      );

      if (!response.ok) return [];

      const data = await response.json();
      const reservations = data.reservations || data.result || [];

      return reservations.map((r: any) => ({
        ota_booking_id: r.id || r.reservation_id,
        ota_name: this.ota_name,
        guest_name: r.booker?.name || r.guest_name || '',
        guest_email: r.booker?.email || r.guest_email,
        guest_phone: r.booker?.phone || r.guest_phone,
        check_in: r.checkin || r.check_in,
        check_out: r.checkout || r.check_out,
        room_type: r.room?.name || r.room_type || '',
        ota_room_type_id: r.room?.id || r.room_id || '',
        room_count: r.rooms?.length || r.room_count || 1,
        adults: r.adults || r.guest_count?.adults || 1,
        children: r.children || r.guest_count?.children || 0,
        total_amount: parseFloat(r.price?.total || r.total_amount || 0),
        commission_amount: parseFloat(r.commission?.amount || 0),
        net_amount: parseFloat(r.price?.net || r.net_amount || 0),
        currency: r.price?.currency || r.currency || 'INR',
        booking_status: 'confirmed' as const,
        payment_status: (r.payment_status || 'pending') as 'pending' | 'paid' | 'partial' | 'refunded',
        payment_mode: r.payment_collect === 'hotel' ? 'pay_at_hotel' as const : 'prepaid' as const,
        special_requests: r.remarks || r.special_requests,
        raw_payload: r,
      }));
    } catch (error) {
      console.error('[booking_com] Failed to pull reservations:', error);
      return [];
    }
  }

  async pullModifications(session: AuthSession, since: Date): Promise<OTAModification[]> {
    try {
      const response = await fetch(
        `${DEFAULT_BDC_JSON_BASE}/reservations?last_change=${since.toISOString()}&status=modified`,
        { headers: session.headers }
      );
      if (!response.ok) return [];
      const data = await response.json();
      return (data.reservations || []).map((m: any) => ({
        ota_booking_id: m.id || m.reservation_id,
        modification_type: 'date_change' as const,
        old_values: {},
        new_values: m,
        raw_payload: m,
      }));
    } catch { return []; }
  }

  async pullCancellations(session: AuthSession, since: Date): Promise<OTACancellation[]> {
    try {
      const response = await fetch(
        `${DEFAULT_BDC_JSON_BASE}/reservations?last_change=${since.toISOString()}&status=cancelled`,
        { headers: session.headers }
      );
      if (!response.ok) return [];
      const data = await response.json();
      return (data.reservations || []).map((c: any) => ({
        ota_booking_id: c.id || c.reservation_id,
        cancellation_reason: c.cancellation_reason,
        cancellation_charge: parseFloat(c.cancellation_fee || 0),
        raw_payload: c,
      }));
    } catch { return []; }
  }

  async confirmReservation(session: AuthSession, ota_booking_id: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${DEFAULT_BDC_JSON_BASE}/reservations/${ota_booking_id}/confirm`,
        { method: 'POST', headers: session.headers }
      );
      return response.ok;
    } catch { return false; }
  }
}

// ─── Register adapter ───────────────────────────────────────────

registerAdapter('booking_com', () => new BookingComAdapter(true));
registerAdapter('booking.com', () => new BookingComAdapter(true));
registerAdapter('bookingcom', () => new BookingComAdapter(true));

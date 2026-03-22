/**
 * OTA Webhooks — Incoming Booking Receiver
 * 
 * Receives booking notifications from OTAs (MMT, Goibibo, Booking.com).
 * Each OTA sends webhooks in different formats — this function normalizes 
 * them and stores in ota_bookings table, then triggers inventory sync.
 * 
 * JWT verification is DISABLED because OTAs send webhooks without Supabase auth.
 * Authentication is handled via webhook secret/signature validation per OTA.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret, x-booking-signature',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const url = new URL(req.url);
    const otaName = url.searchParams.get('ota') || 'unknown';
    const restaurantId = url.searchParams.get('restaurant_id');

    if (!restaurantId) {
      return jsonResponse({ error: 'Missing restaurant_id parameter' }, 400);
    }

    const rawBody = await req.text();
    let payload: any;

    // Parse body (JSON or XML)
    try {
      payload = JSON.parse(rawBody);
    } catch {
      // If not JSON, treat as XML string and store raw
      payload = { raw_xml: rawBody };
    }

    console.log(`[ota-webhooks] Received from ${otaName} for restaurant ${restaurantId}`);

    // Validate webhook secret (if configured)
    const webhookSecret = req.headers.get('x-webhook-secret') || req.headers.get('x-booking-signature');
    const { data: credential } = await supabase
      .from('ota_credentials')
      .select('extra_config')
      .eq('restaurant_id', restaurantId)
      .eq('ota_name', otaName)
      .eq('is_active', true)
      .single();

    if (credential?.extra_config?.webhook_secret && webhookSecret !== credential.extra_config.webhook_secret) {
      console.warn(`[ota-webhooks] Invalid webhook secret from ${otaName}`);
      return jsonResponse({ error: 'Invalid webhook secret' }, 401);
    }

    // Find the booking channel
    const { data: channel } = await supabase
      .from('booking_channels')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .ilike('channel_name', `%${otaName}%`)
      .eq('is_active', true)
      .single();

    if (!channel) {
      // Try matching by channel_type or settings
      const { data: altChannel } = await supabase
        .from('booking_channels')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .limit(1)
        .single();

      if (!altChannel) {
        return jsonResponse({ error: `No active channel found for OTA: ${otaName}` }, 404);
      }

      channel.id = altChannel.id;
    }

    // Normalize the booking data based on OTA
    const booking = normalizeBooking(otaName, payload, restaurantId, channel.id);

    // Log the incoming webhook
    await supabase.from('sync_logs').insert({
      restaurant_id: restaurantId,
      channel_id: channel.id,
      sync_type: 'booking_pull',
      direction: 'inbound',
      status: 'success',
      records_processed: 1,
      request_payload: { ota: otaName, raw: payload },
      response_payload: booking,
      triggered_by: 'webhook',
      completed_at: new Date().toISOString(),
    });

    // Upsert the booking (idempotent — handles duplicate webhooks)
    const { data: savedBooking, error: upsertError } = await supabase
      .from('ota_bookings')
      .upsert(booking, { onConflict: 'channel_id,ota_booking_id' })
      .select()
      .single();

    if (upsertError) {
      console.error('[ota-webhooks] Failed to save booking:', upsertError);
      return jsonResponse({ error: `Failed to save booking: ${upsertError.message}` }, 500);
    }

    // The DB trigger (trg_ota_booking_inventory) will automatically 
    // decrement pool_inventory when a new booking is inserted.

    // Queue availability push to all OTHER channels
    const { data: otherChannels } = await supabase
      .from('booking_channels')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .neq('id', channel.id)
      .eq('is_active', true);

    if (otherChannels && otherChannels.length > 0) {
      // Trigger sync for other channels to push updated availability
      for (const otherChannel of otherChannels) {
        await supabase.from('sync_retry_queue').insert({
          restaurant_id: restaurantId,
          channel_id: otherChannel.id,
          sync_type: 'availability_push',
          payload: {
            room_type: booking.room_type,
            trigger: 'new_booking_from_' + otaName,
            booking_id: savedBooking?.id,
          },
          status: 'pending',
          next_retry_at: new Date().toISOString(), // immediate
        });
      }

      // Also invoke sync-channels to handle the queue immediately
      try {
        await supabase.functions.invoke('sync-channels', {
          body: {
            restaurantId,
            syncType: 'availability',
            bulkSync: true,
            triggeredBy: 'webhook',
          },
        });
      } catch (e) {
        console.warn('[ota-webhooks] Failed to trigger immediate availability sync:', e);
        // Not fatal — the retry queue will handle it
      }
    }

    return jsonResponse({
      success: true,
      message: `Booking ${booking.ota_booking_id} received from ${otaName}`,
      booking_id: savedBooking?.id,
      inventory_sync_queued: (otherChannels || []).length,
    });

  } catch (error) {
    console.error('[ota-webhooks] Error:', error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      500
    );
  }
});

// ─── Normalize booking data from different OTA formats ──────────

function normalizeBooking(otaName: string, payload: any, restaurantId: string, channelId: string): any {
  const base = {
    restaurant_id: restaurantId,
    channel_id: channelId,
    ota_name: otaName,
    raw_payload: payload,
    booking_status: 'confirmed',
    payment_status: 'pending',
    currency: 'INR',
    room_count: 1,
    adults: 1,
    children: 0,
  };

  switch (otaName.toLowerCase()) {
    case 'mmt':
    case 'makemytrip':
      return {
        ...base,
        ota_booking_id: payload.booking_id || payload.reservation_id || payload.id || `MMT_${Date.now()}`,
        guest_name: payload.guest_name || payload.customer_name || `${payload.first_name || ''} ${payload.last_name || ''}`.trim(),
        guest_email: payload.guest_email || payload.email,
        guest_phone: payload.guest_phone || payload.mobile || payload.phone,
        check_in: payload.check_in || payload.checkin_date || payload.check_in_date,
        check_out: payload.check_out || payload.checkout_date || payload.check_out_date,
        room_type: payload.room_type || payload.room_category || 'Standard',
        room_count: payload.room_count || payload.rooms || 1,
        adults: payload.adults || payload.adult_count || 1,
        children: payload.children || payload.child_count || 0,
        total_amount: parseFloat(payload.total_amount || payload.amount || 0),
        commission_amount: parseFloat(payload.commission || 0),
        net_amount: parseFloat(payload.net_amount || payload.hotel_amount || 0),
        payment_mode: payload.payment_mode || payload.pay_mode,
        special_requests: payload.special_requests || payload.remarks,
        booking_status: mapStatus(payload.status),
      };

    case 'goibibo':
      return {
        ...base,
        ota_booking_id: payload.booking_id || payload.gib_booking_id || `GIB_${Date.now()}`,
        guest_name: payload.guest_name || payload.pax_name,
        guest_email: payload.guest_email || payload.email,
        guest_phone: payload.guest_phone || payload.mobile,
        check_in: payload.check_in || payload.checkin,
        check_out: payload.check_out || payload.checkout,
        room_type: payload.room_type || payload.room_name || 'Standard',
        room_count: payload.room_count || 1,
        adults: payload.adults || 1,
        children: payload.children || 0,
        total_amount: parseFloat(payload.total_price || payload.amount || 0),
        commission_amount: parseFloat(payload.commission || 0),
        net_amount: parseFloat(payload.net_price || 0),
        payment_mode: payload.payment_type,
        special_requests: payload.special_requests,
        booking_status: mapStatus(payload.status),
      };

    case 'booking_com':
    case 'bookingcom':
    case 'booking.com':
      return {
        ...base,
        ota_booking_id: payload.id || payload.reservation_id || `BDC_${Date.now()}`,
        guest_name: payload.booker?.name || payload.guest_name || '',
        guest_email: payload.booker?.email || payload.guest_email,
        guest_phone: payload.booker?.phone || payload.guest_phone,
        check_in: payload.checkin || payload.check_in,
        check_out: payload.checkout || payload.check_out,
        room_type: payload.room?.name || payload.room_type || 'Standard',
        room_count: payload.rooms?.length || payload.room_count || 1,
        adults: payload.adults || payload.guest_count?.adults || 1,
        children: payload.children || payload.guest_count?.children || 0,
        total_amount: parseFloat(payload.price?.total || payload.total_amount || 0),
        commission_amount: parseFloat(payload.commission?.amount || 0),
        net_amount: parseFloat(payload.price?.net || 0),
        payment_mode: payload.payment_collect === 'hotel' ? 'pay_at_hotel' : 'prepaid',
        special_requests: payload.remarks || payload.special_requests,
        booking_status: mapStatus(payload.status),
      };

    default:
      // Generic fallback for unknown OTAs
      return {
        ...base,
        ota_booking_id: payload.booking_id || payload.reservation_id || payload.id || `OTA_${Date.now()}`,
        guest_name: payload.guest_name || payload.name || 'Unknown Guest',
        guest_email: payload.email || payload.guest_email,
        guest_phone: payload.phone || payload.guest_phone,
        check_in: payload.check_in || payload.checkin || new Date().toISOString().split('T')[0],
        check_out: payload.check_out || payload.checkout || new Date(Date.now() + 86400000).toISOString().split('T')[0],
        room_type: payload.room_type || 'Standard',
        total_amount: parseFloat(payload.amount || payload.total || 0),
        special_requests: payload.remarks || payload.notes,
      };
  }
}

function mapStatus(status: string | undefined): string {
  if (!status) return 'confirmed';
  const s = status.toLowerCase();
  if (s.includes('cancel')) return 'cancelled';
  if (s.includes('modif')) return 'modified';
  if (s.includes('no_show') || s.includes('noshow')) return 'no_show';
  return 'confirmed';
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

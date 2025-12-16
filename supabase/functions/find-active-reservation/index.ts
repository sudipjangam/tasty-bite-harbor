import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { mobileNumber } = await req.json();

    if (!mobileNumber) {
      console.log('❌ No mobile number provided');
      return new Response(
        JSON.stringify({ error: 'Mobile number is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Sanitize input: extract last 10 digits
    const sanitizedInput = String(mobileNumber).replace(/\D/g, '').slice(-10);
    
    if (sanitizedInput.length !== 10) {
      console.log('❌ Invalid mobile number format after sanitization:', sanitizedInput);
      return new Response(
        JSON.stringify({ found: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Searching for active reservation with sanitized phone:', sanitizedInput);

    // Query the reservations table for an active reservation with this phone number
    // Check for multiple possible statuses: occupied, checked_in, or confirmed
    // We compare the last 10 digits of stored phone numbers with the sanitized input
    const { data: reservations, error } = await supabaseClient
      .from('reservations')
      .select(`
        id,
        room_id,
        customer_name,
        customer_phone,
        status,
        rooms:room_id (
          id,
          name
        )
      `)
      .in('status', ['occupied', 'checked_in', 'confirmed'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error querying reservations:', error);
      return new Response(
        JSON.stringify({ error: 'Database query failed', details: error }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Find reservation by comparing last 10 digits
    const reservation = reservations?.find((res: any) => {
      const storedPhone = String(res.customer_phone || '').replace(/\D/g, '').slice(-10);
      return storedPhone === sanitizedInput;
    });

    if (!reservation) {
      console.log('ℹ️ No active reservation found for this mobile number');
      return new Response(
        JSON.stringify({ found: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Found active reservation:', reservation.id);

    // Extract room information
    const room = Array.isArray(reservation.rooms) ? reservation.rooms[0] : reservation.rooms;
    const roomName = room?.name || `Room ${room?.id?.slice(0, 8)}`;

    return new Response(
      JSON.stringify({
        found: true,
        reservation_id: reservation.id,
        room_id: reservation.room_id,
        roomName: roomName,
        customerName: reservation.customer_name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

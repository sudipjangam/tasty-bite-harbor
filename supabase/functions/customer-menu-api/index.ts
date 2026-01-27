import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decode } from 'https://deno.land/std@0.168.0/encoding/base64.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client  (public access - no auth required)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get QR token from URL params
    const url = new URL(req.url);
    const qrToken = url.searchParams.get('token');

    if (!qrToken) {
      return new Response(
        JSON.stringify({ error: 'Missing QR token' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Decode and parse QR data
    let qrData;
    try {
      const decodedBytes = decode(qrToken);
      const decodedString = new TextDecoder().decode(decodedBytes);
      qrData = JSON.parse(decodedString);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid QR token' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const { restaurantId, entityType, entityId } = qrData;

    // Verify QR code exists and is active
    const { data: qrCode, error: qrError } = await supabaseClient
      .from('qr_codes')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('is_active', true)
      .single();

    if (qrError || !qrCode) {
      return new Response(
        JSON.stringify({ error: 'QR code not found or inactive' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // Get restaurant info and settings
    const { data: restaurant, error: restaurantError } = await supabaseClient
      .from('restaurants')
      .select('id, name, logo_url, qr_ordering_enabled, qr_service_charge_percent, qr_payment_required')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      return new Response(
        JSON.stringify({ error: 'Restaurant not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // Check if QR ordering is enabled
    if (!restaurant.qr_ordering_enabled) {
      return new Response(
        JSON.stringify({ error: 'QR ordering is currently disabled for this restaurant' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }

    // Get payment settings (UPI details)
    const { data: paymentSettings } = await supabaseClient
      .from('payment_settings')
      .select('upi_id, upi_name, is_active')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .maybeSingle();

    // Get menu items (only active items)
    const { data: menuItems, error: menuError } = await supabaseClient
      .from('menu_items')
      .select('id, name, description, price, category, image_url, is_vegetarian, is_available')
      .eq('restaurant_id', restaurantId)
      .eq('is_available', true)
      .order('category')
      .order('name');

    if (menuError) {
      console.error('Error fetching menu items:', menuError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch menu items' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Get entity details (table or room)
    const tableName = entityType === 'table' ? 'restaurant_tables' : 'restaurant_rooms';
    const { data: entity } = await supabaseClient
      .from(tableName)
      .select('id, name')
      .eq('id', entityId)
      .single();

    // Group menu items by category
    const categories = [...new Set(menuItems?.map(item => item.category) || [])];

    return new Response(
      JSON.stringify({
        success: true,
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          logo_url: restaurant.logo_url,
          qr_service_charge_percent: restaurant.qr_service_charge_percent || 0,
          payment_required: restaurant.qr_payment_required,
        },
        entity: {
          type: entityType,
          id: entityId,
          name: entity?.name || '',
        },
        payment: {
          upi_id: paymentSettings?.upi_id || null,
          upi_name: paymentSettings?.upi_name || null,
          is_available: !!paymentSettings?.upi_id,
        },
        menu: {
          categories,
          items: menuItems || [],
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in customer-menu-api function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode } from 'https://deno.land/std@0.168.0/encoding/base64.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateQRRequest {
  entityType: 'table' | 'room';
  entityId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Get request body
    const { entityType, entityId }: GenerateQRRequest = await req.json();

    if (!entityType || !entityId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: entityType, entityId' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Get user's restaurant_id
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('restaurant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.restaurant_id) {
      return new Response(
        JSON.stringify({ error: 'Restaurant not found for user' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    const restaurantId = profile.restaurant_id;

    // Verify entity exists and belongs to restaurant
    const tableName = entityType === 'table' ? 'restaurant_tables' : 'restaurant_rooms';
    const { data: entity, error: entityError } = await supabaseClient
      .from(tableName)
      .select('id, name')
      .eq('id', entityId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (entityError || !entity) {
      return new Response(
        JSON.stringify({ error: `${entityType} not found or doesn't belong to your restaurant` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // Generate unique token
    const token = crypto.randomUUID();
    const qrCodeData = JSON.stringify({
      restaurantId,
      entityType,
      entityId,
      entityName: entity.name,
      token,
      timestamp: Date.now(),
    });

    // Generate QR code URL (will be scanned to open customer ordering page)
    // Use the request origin to support both localhost and production
    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/').slice(0, 3).join('/') || 'http://localhost:8080';
    const baseUrl = Deno.env.get('APP_URL') || origin;
    const dataBytes = new TextEncoder().encode(qrCodeData);
    const base64String = encode(dataBytes); // encode() returns a base64 string directly
    const qrUrl = `${baseUrl}/order/${base64String}`;

    // Note: QR code image will be generated on the frontend using the qrUrl
    // Server-side QR generation doesn't work in Deno edge runtime (no canvas)

    // Upsert QR code in database
    const { data: qrCode, error: qrError } = await supabaseClient
      .from('qr_codes')
      .upsert(
        {
          restaurant_id: restaurantId,
          entity_type: entityType,
          entity_id: entityId,
          qr_code_data: qrCodeData,
          qr_code_url: qrUrl, // Store the URL to be encoded as QR on frontend
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'entity_type,entity_id',
        }
      )
      .select()
      .single();

    if (qrError) {
      console.error('Error saving QR code:', qrError);
      return new Response(
        JSON.stringify({ error: 'Failed to save QR code', details: qrError.message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        qrCode: {
          id: qrCode.id,
          entityType: qrCode.entity_type,
          entityId: qrCode.entity_id,
          qrCodeUrl: qrCode.qr_code_url,
          scanUrl: qrUrl,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in generate-qr-code function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

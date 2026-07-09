import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateOrderRequest {
  restaurantId: string;
  orderId: string;
  amount: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  returnUrl: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    );
  }

  try {
    // Create Supabase client with service role (to read payment settings safely)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    const body: CreateOrderRequest = await req.json();
    const {
      restaurantId,
      orderId,
      amount,
      customerName = 'Walk-in Customer',
      customerPhone = '9999999999',
      customerEmail = 'customer@swadeshisolutions.com',
      returnUrl,
    } = body;

    if (!restaurantId || !orderId || !amount || !returnUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: restaurantId, orderId, amount, returnUrl' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 1. Fetch the restaurant's payment settings from the DB
    const { data: paymentSettings, error: settingsError } = await supabaseClient
      .from('payment_settings')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .maybeSingle();

    if (settingsError || !paymentSettings) {
      console.error('Payment settings not found:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Online payments not configured for this restaurant' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Retrieve Cashfree API Credentials
    const cashfreeAppId = paymentSettings.cashfree_app_id;
    const cashfreeSecretKey = paymentSettings.cashfree_secret_key;
    const isTestMode = paymentSettings.cashfree_test_mode !== false; // Default to true (sandbox)

    if (!cashfreeAppId || !cashfreeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Cashfree API credentials not set up by the restaurant' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 2. Authoritatively verify the order total from the database to prevent client spoofing
    const { data: order, error: orderFetchError } = await supabaseClient
      .from('orders')
      .select('total, customer_name, customer_phone')
      .eq('id', orderId)
      .single();

    if (orderFetchError || !order) {
      console.error('Failed to verify order:', orderFetchError);
      return new Response(
        JSON.stringify({ error: 'Order not found in system' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Verify amount matches database
    const dbTotal = parseFloat(order.total);
    if (Math.abs(dbTotal - amount) > 0.01) {
      return new Response(
        JSON.stringify({ error: 'Security alert: Order amount mismatch' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Prepare Cashfree API target URL
    const baseUrl = isTestMode
      ? 'https://sandbox.cashfree.com/pg'
      : 'https://api.cashfree.com/pg';

    const cleanOrderId = orderId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);

    // Call Cashfree API to create order session
    const response = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': cashfreeAppId,
        'x-client-secret': cashfreeSecretKey,
        'x-api-version': '2023-08-01',
      },
      body: JSON.stringify({
        order_id: cleanOrderId,
        order_amount: parseFloat(amount.toFixed(2)),
        order_currency: 'INR',
        customer_details: {
          customer_id: order.customer_phone ? order.customer_phone.replace(/\D/g, '') : `guest_${Date.now()}`,
          customer_name: order.customer_name || customerName,
          customer_phone: (order.customer_phone || customerPhone).replace(/\D/g, '').slice(-10),
          customer_email: customerEmail,
        },
        order_meta: {
          return_url: `${returnUrl}?order_id=${orderId}`,
          notify_url: `https://clmsoetktmvhazctlans.supabase.co/functions/v1/cashfree-webhook`,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cashfree API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Cashfree API failed to create payment session', details: errorText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
      );
    }

    const data = await response.json();

    // 3. Upsert a payment transaction entry in our DB to track payment attempts
    const { error: insertError } = await supabaseClient
      .from('payment_transactions')
      .insert({
        restaurant_id: restaurantId,
        order_id: orderId,
        amount: amount,
        currency: 'INR',
        gateway_type: 'cashfree',
        cashfree_order_id: data.cf_order_id?.toString() || null,
        cashfree_payment_session_id: data.payment_session_id || null,
        status: 'pending',
      });

    if (insertError) {
      console.error('Failed to log payment transaction:', insertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentSessionId: data.payment_session_id,
        cfOrderId: data.cf_order_id,
        orderId: orderId,
        paymentLink: data.payment_link || null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 }
    );
  } catch (err: any) {
    console.error('Internal server error in create-cashfree-order:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    // Create Supabase client with service role to bypass RLS policies
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse the incoming body from Cashfree
    const payload = await req.json();
    console.log('Cashfree Webhook payload received:', JSON.stringify(payload));

    // Resolve order_id from different Cashfree version payloads:
    // v3 format: payload.data.order.order_id
    // v2 format: payload.orderId
    const rawOrderId = payload?.data?.order?.order_id || payload?.orderId;
    const eventType = payload?.type || payload?.event;

    if (!rawOrderId) {
      console.error('Webhook payload is missing order identifier');
      return new Response(
        JSON.stringify({ error: 'Missing order_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Processing Cashfree webhook for order ID: ${rawOrderId}, Event: ${eventType}`);

    // Clean orderId back to UUID (UUID format check)
    const uuidMatch = rawOrderId.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    const orderId = uuidMatch ? uuidMatch[0] : rawOrderId;

    // 1. Find the transaction log in our database
    const { data: transaction, error: txnError } = await supabaseClient
      .from('payment_transactions')
      .select('*, restaurant_id')
      .eq('order_id', orderId)
      .maybeSingle();

    if (txnError || !transaction) {
      console.error(`Transaction record not found in database for order: ${orderId}`, txnError);
      return new Response(
        JSON.stringify({ error: 'Transaction reference not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const restaurantId = transaction.restaurant_id;

    // 2. Fetch the restaurant's payment settings to get the API keys
    const { data: paymentSettings, error: settingsError } = await supabaseClient
      .from('payment_settings')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .maybeSingle();

    if (settingsError || !paymentSettings) {
      console.error(`Payment settings not found for restaurant: ${restaurantId}`, settingsError);
      return new Response(
        JSON.stringify({ error: 'Restaurant configuration missing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const cashfreeAppId = paymentSettings.cashfree_app_id;
    const cashfreeSecretKey = paymentSettings.cashfree_secret_key;
    const isTestMode = paymentSettings.cashfree_test_mode !== false;

    if (!cashfreeAppId || !cashfreeSecretKey) {
      console.error('Restaurant missing Cashfree API credentials in configuration');
      return new Response(
        JSON.stringify({ error: 'Cashfree credentials not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 3. Make direct authoritative API query to Cashfree to pull current status (Self-Healing Pull fallback)
    const baseUrl = isTestMode
      ? 'https://sandbox.cashfree.com/pg'
      : 'https://api.cashfree.com/pg';

    const cleanOrderId = orderId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);

    const checkResponse = await fetch(`${baseUrl}/orders/${cleanOrderId}`, {
      method: 'GET',
      headers: {
        'x-client-id': cashfreeAppId,
        'x-client-secret': cashfreeSecretKey,
        'x-api-version': '2023-08-01',
      },
    });

    if (!checkResponse.ok) {
      const checkError = await checkResponse.text();
      console.error('Failed to verify order status with Cashfree API:', checkError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify payment status with gateway', details: checkError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }

    const cfOrder = await checkResponse.json();
    const orderStatus = cfOrder.order_status; // PAID, ACTIVE, EXPIRED, etc.
    console.log(`Authoritative Cashfree order status check: ${orderStatus} (CF Order ID: ${cfOrder.cf_order_id})`);

    // 4. Handle success/failed state
    if (orderStatus === 'PAID') {
      // Payment Successful!
      
      // Update our payment_transactions status
      await supabaseClient
        .from('payment_transactions')
        .update({ status: 'success', completed_at: new Date().toISOString() })
        .eq('order_id', orderId);

      // Fetch the order total and check if it's already marked paid to avoid duplicate logs
      const { data: currentOrder } = await supabaseClient
        .from('orders')
        .select('payment_status, total, customer_name, customer_phone')
        .eq('id', orderId)
        .single();

      if (currentOrder && currentOrder.payment_status !== 'paid') {
        // Mark the main order as paid in the database
        const { error: orderUpdateErr } = await supabaseClient
          .from('orders')
          .update({
            payment_status: 'paid',
            payment_method: 'online',
            status: 'preparing', // Auto-move from pending → preparing once paid
          })
          .eq('id', orderId);

        if (orderUpdateErr) {
          console.error('Failed to update order state:', orderUpdateErr);
        }

        // Insert into POS transactions (for sales reporting/dashboard)
        const { error: posTxnErr } = await supabaseClient
          .from('pos_transactions')
          .insert({
            restaurant_id: restaurantId,
            order_id: orderId,
            amount: parseFloat(currentOrder.total),
            payment_method: 'online',
            status: 'completed',
            customer_name: currentOrder.customer_name || 'Online Customer',
            customer_phone: currentOrder.customer_phone || null,
          });

        if (posTxnErr) {
          console.error('Failed to insert POS transaction:', posTxnErr);
        }

        console.log(`Successfully completed order ${orderId} in system.`);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Payment successfully processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    } else {
      // Payment failed or is in different state
      console.log(`Order payment status not confirmed: ${orderStatus}`);
      
      if (orderStatus === 'FAILED') {
        await supabaseClient
          .from('payment_transactions')
          .update({ status: 'failed' })
          .eq('order_id', orderId);
      }

      return new Response(
        JSON.stringify({ success: true, message: `Webhook processed. Status: ${orderStatus}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
  } catch (err: any) {
    console.error('Internal server error in cashfree-webhook:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { generatePaytmChecksum } from '../_shared/paytm-checksum.ts';

/**
 * Check Paytm Transaction Status
 * 
 * Polling fallback — POS calls this every 5 seconds to check
 * if a payment has been made, in case the webhook is delayed.
 * 
 * Uses Paytm's Transaction Status API:
 * POST https://securegw.paytm.in/v3/order/status
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckStatusRequest {
  paytmOrderId: string;
  restaurantId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { paytmOrderId, restaurantId }: CheckStatusRequest = await req.json();

    if (!paytmOrderId || !restaurantId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: paytmOrderId, restaurantId' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Step 1: Check our local DB first (webhook may have already updated it)
    const { data: transaction } = await supabaseClient
      .from('payment_transactions')
      .select('*')
      .eq('paytm_order_id', paytmOrderId)
      .single();

    if (transaction && transaction.status !== 'pending') {
      // Already resolved — return cached status
      return new Response(
        JSON.stringify({
          status: transaction.status,
          paytmOrderId: paytmOrderId,
          paytmTxnId: transaction.paytm_txn_id,
          amount: transaction.amount,
          completedAt: transaction.completed_at,
          source: 'database',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Step 2: Check with Paytm API directly
    const { data: settings } = await supabaseClient
      .from('payment_settings')
      .select('paytm_mid, paytm_merchant_key, paytm_is_test_mode')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .maybeSingle();

    if (!settings?.paytm_mid || !settings?.paytm_merchant_key) {
      return new Response(
        JSON.stringify({ error: 'Paytm credentials not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      );
    }

    // Prepare Paytm Status API request
    const requestBody: Record<string, unknown> = {
      mid: settings.paytm_mid,
      orderId: paytmOrderId,
    };

    const signature = await generatePaytmChecksum(requestBody, settings.paytm_merchant_key);

    const paytmStatusRequest = {
      body: requestBody,
      head: {
        signature: signature,
      },
    };

    const baseUrl = settings.paytm_is_test_mode
      ? 'https://securegw-stage.paytm.in'
      : 'https://securegw.paytm.in';

    const paytmResponse = await fetch(`${baseUrl}/v3/order/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paytmStatusRequest),
    });

    const paytmResult = await paytmResponse.json();
    console.log('Paytm Status API Response:', JSON.stringify(paytmResult));

    const txnStatus = paytmResult?.body?.resultInfo?.resultStatus;
    const txnId = paytmResult?.body?.txnId;

    // Step 3: Map Paytm status to our status
    let newStatus = 'pending';
    if (txnStatus === 'TXN_SUCCESS') newStatus = 'success';
    else if (txnStatus === 'TXN_FAILURE') newStatus = 'failed';
    else if (txnStatus === 'PENDING') newStatus = 'pending';

    // Step 4: Update local transaction if status changed
    if (transaction && newStatus !== 'pending') {
      await supabaseClient
        .from('payment_transactions')
        .update({
          status: newStatus,
          paytm_txn_id: txnId || null,
          webhook_payload: paytmResult,
          completed_at: new Date().toISOString(),
        })
        .eq('id', transaction.id);

      // If success, also update order
      if (newStatus === 'success' && transaction.order_id) {
        await supabaseClient
          .from('orders')
          .update({
            payment_status: 'completed',
            payment_method: 'paytm_upi',
            updated_at: new Date().toISOString(),
          })
          .eq('id', transaction.order_id);

        await supabaseClient
          .from('kitchen_orders')
          .update({
            payment_status: 'completed',
            payment_method: 'upi',
          })
          .eq('order_id', transaction.order_id);
      }
    }

    return new Response(
      JSON.stringify({
        status: newStatus,
        paytmOrderId: paytmOrderId,
        paytmTxnId: txnId,
        amount: transaction?.amount || null,
        completedAt: newStatus !== 'pending' ? new Date().toISOString() : null,
        source: 'paytm_api',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in check-paytm-status function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

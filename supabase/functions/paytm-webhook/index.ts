import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyPaytmChecksum } from '../_shared/paytm-checksum.ts';

/**
 * Paytm Webhook Handler
 * 
 * Receives payment status callbacks from Paytm when a transaction completes.
 * 
 * Flow:
 * 1. Paytm sends POST with transaction result
 * 2. We verify checksum using merchant key
 * 3. If TXN_SUCCESS → update transaction + mark order completed
 * 4. If TXN_FAILURE → update transaction status
 * 5. Supabase Realtime automatically pushes change to POS
 * 
 * Configure this URL in Paytm Dashboard:
 * https://<project-ref>.supabase.co/functions/v1/paytm-webhook
 */

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
    // Create Supabase client with service role (bypass RLS for webhook)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse webhook payload
    const payload = await req.json();
    console.log('Paytm Webhook received:', JSON.stringify(payload));

    // Extract key fields from Paytm callback
    const body = payload?.body || payload;
    const head = payload?.head || {};
    
    const orderId = body?.orderId || body?.ORDERID;
    const txnId = body?.txnId || body?.TXNID;
    const txnAmount = body?.txnAmount || body?.TXNAMOUNT;
    const status = body?.resultInfo?.resultStatus || body?.STATUS;
    const resultCode = body?.resultInfo?.resultCode || body?.RESPCODE;
    const resultMsg = body?.resultInfo?.resultMsg || body?.RESPMSG;
    const mid = body?.mid || body?.MID;
    const receivedChecksum = head?.signature || body?.CHECKSUMHASH;

    console.log(`Webhook - Order: ${orderId}, Status: ${status}, TxnId: ${txnId}`);

    if (!orderId) {
      console.error('Webhook missing orderId');
      return new Response(
        JSON.stringify({ error: 'Missing orderId in webhook payload' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Step 1: Find the transaction in our database
    const { data: transaction, error: txnError } = await supabaseClient
      .from('payment_transactions')
      .select('*, restaurant_id')
      .eq('paytm_order_id', orderId)
      .single();

    if (txnError || !transaction) {
      console.error(`Transaction not found for orderId: ${orderId}`, txnError);
      return new Response(
        JSON.stringify({ error: 'Transaction not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Skip if already processed
    if (transaction.status === 'success' || transaction.status === 'failed') {
      console.log(`Transaction ${orderId} already processed (${transaction.status})`);
      return new Response(
        JSON.stringify({ status: 'already_processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Step 2: Verify checksum using merchant key
    if (!receivedChecksum || !mid) {
      console.error('Webhook missing checksum or MID for orderId:', orderId);
      return new Response(
        JSON.stringify({ error: 'Missing checksum or MID' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { data: settings } = await supabaseClient
      .from('payment_settings')
      .select('paytm_merchant_key')
      .eq('restaurant_id', transaction.restaurant_id)
      .maybeSingle();

    if (settings?.paytm_merchant_key) {
      // Remove checksum from body before verification
      const bodyForVerification = { ...body };
      delete bodyForVerification.CHECKSUMHASH;
      
      const isValid = await verifyPaytmChecksum(
        bodyForVerification,
        receivedChecksum,
        settings.paytm_merchant_key
      );

      if (!isValid) {
        console.error(`Checksum verification FAILED for orderId: ${orderId}`);
        return new Response(
          JSON.stringify({ error: 'Checksum verification failed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }
      console.log(`Checksum verified for orderId: ${orderId}`);
    } else {
      console.error(`Paytm merchant key not found for restaurant: ${transaction.restaurant_id}`);
      return new Response(
        JSON.stringify({ error: 'Payment gateway configuration missing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Step 3: Determine new status
    let newStatus: string;
    if (status === 'TXN_SUCCESS' || status === 'SUCCESS') {
      newStatus = 'success';
    } else if (status === 'TXN_FAILURE' || status === 'FAILURE') {
      newStatus = 'failed';
    } else if (status === 'PENDING') {
      newStatus = 'pending';
    } else {
      newStatus = 'failed';
    }

    // Step 4: Update payment_transactions
    const { error: updateError } = await supabaseClient
      .from('payment_transactions')
      .update({
        status: newStatus,
        paytm_txn_id: txnId || null,
        webhook_payload: payload,
        completed_at: newStatus !== 'pending' ? new Date().toISOString() : null,
      })
      .eq('id', transaction.id);

    if (updateError) {
      console.error('Error updating transaction:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update transaction' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Step 5: If payment successful, update order status
    if (newStatus === 'success' && transaction.order_id) {
      console.log(`Payment SUCCESS for order: ${transaction.order_id}`);

      // Update orders table if order_id exists
      const { error: orderError } = await supabaseClient
        .from('orders')
        .update({
          payment_status: 'completed',
          payment_method: 'paytm_upi',
          updated_at: new Date().toISOString(),
        })
        .eq('id', transaction.order_id);

      if (orderError) {
        console.error('Error updating order:', orderError);
        // Don't fail — transaction is already updated
      }

      // Also update kitchen_orders if applicable
      await supabaseClient
        .from('kitchen_orders')
        .update({
          payment_status: 'completed',
          payment_method: 'upi',
        })
        .eq('order_id', transaction.order_id);
    }

    console.log(`Webhook processed: orderId=${orderId}, status=${newStatus}`);
    return new Response(
      JSON.stringify({
        status: 'ok',
        orderId: orderId,
        transactionStatus: newStatus,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in paytm-webhook function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

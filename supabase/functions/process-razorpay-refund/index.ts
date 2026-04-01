import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RefundRequest {
  subscription_id: string;
  restaurant_id: string;
  amount?: number; // Optional for partial refund; omit for full refund
  reason?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { subscription_id, restaurant_id, amount, reason }: RefundRequest = await req.json();

    if (!subscription_id || !restaurant_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: subscription_id, restaurant_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 1. Fetch the subscription record
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('restaurant_subscriptions')
      .select('*')
      .eq('id', subscription_id)
      .eq('restaurant_id', restaurant_id)
      .single();

    if (subError || !subscription) {
      return new Response(
        JSON.stringify({ error: 'Subscription not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (!subscription.razorpay_payment_id) {
      return new Response(
        JSON.stringify({ error: 'No payment found for this subscription (may be a free trial)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (subscription.refund_status === 'full') {
      return new Response(
        JSON.stringify({ error: 'This subscription has already been fully refunded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 2. Calculate refund amount
    const refundAmountPaise = amount
      ? Math.round(amount * 100)
      : Math.round((Number(subscription.amount_paid) - Number(subscription.refund_amount || 0)) * 100);

    if (refundAmountPaise <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid refund amount' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 3. Update refund status to processing
    await supabaseAdmin
      .from('restaurant_subscriptions')
      .update({
        refund_status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription_id);

    // 4. Call Razorpay Refund API
    const refundResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${subscription.razorpay_payment_id}/refund`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
        },
        body: JSON.stringify({
          amount: refundAmountPaise,
          speed: 'normal',
          notes: {
            reason: reason || 'Subscription refund',
            restaurant_id: restaurant_id,
            subscription_id: subscription_id,
          },
          receipt: `refund_${subscription_id.slice(0, 8)}_${Date.now()}`,
        }),
      }
    );

    if (!refundResponse.ok) {
      const errorBody = await refundResponse.text();
      console.error('Razorpay refund failed:', errorBody);

      // Reset refund status
      await supabaseAdmin
        .from('restaurant_subscriptions')
        .update({
          refund_status: subscription.refund_status || 'none',
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription_id);

      return new Response(
        JSON.stringify({ error: 'Refund failed', details: errorBody }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }

    const refundData = await refundResponse.json();
    console.log('Refund processed:', refundData.id);

    // 5. Calculate total refund and determine status
    const totalRefunded = Number(subscription.refund_amount || 0) + (refundAmountPaise / 100);
    const isFullRefund = totalRefunded >= Number(subscription.amount_paid);

    // 6. Update subscription with refund details
    const { error: updateError } = await supabaseAdmin
      .from('restaurant_subscriptions')
      .update({
        refund_id: refundData.id,
        refund_status: isFullRefund ? 'full' : 'partial',
        refund_amount: totalRefunded,
        refunded_at: new Date().toISOString(),
        status: isFullRefund ? 'cancelled' : subscription.status,
        cancel_at_period_end: isFullRefund ? true : subscription.cancel_at_period_end,
        payment_notes: {
          ...((subscription.payment_notes as Record<string, unknown>) || {}),
          last_refund: {
            refund_id: refundData.id,
            amount: refundAmountPaise / 100,
            reason: reason || 'Subscription refund',
            processed_at: new Date().toISOString(),
          },
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription_id);

    if (updateError) {
      console.error('Error updating subscription after refund:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: isFullRefund ? 'Full refund processed' : 'Partial refund processed',
        refund: {
          id: refundData.id,
          amount: refundAmountPaise / 100,
          total_refunded: totalRefunded,
          status: isFullRefund ? 'full' : 'partial',
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in process-razorpay-refund:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

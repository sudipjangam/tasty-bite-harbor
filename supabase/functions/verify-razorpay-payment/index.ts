import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyPaymentRequest {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  plan_id: string;
  restaurant_id: string;
}

// HMAC SHA256 verification using Web Crypto API
async function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${orderId}|${paymentId}`);
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, data);
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return expectedSignature === signature;
}

// Calculate subscription end date based on interval
function calculateEndDate(startDate: Date, interval: string): Date {
  const endDate = new Date(startDate);
  switch (interval) {
    case 'monthly':
      endDate.setMonth(endDate.getMonth() + 1);
      break;
    case 'quarterly':
      endDate.setMonth(endDate.getMonth() + 3);
      break;
    case 'half_yearly':
      endDate.setMonth(endDate.getMonth() + 6);
      break;
    case 'yearly':
      endDate.setFullYear(endDate.getFullYear() + 1);
      break;
    default:
      endDate.setMonth(endDate.getMonth() + 1);
  }
  return endDate;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_Live_Key_Secret');

    if (!RAZORPAY_KEY_SECRET) {
      console.error('Razorpay secret not configured');
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      plan_id,
      restaurant_id,
    }: VerifyPaymentRequest = await req.json();

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return new Response(
        JSON.stringify({ error: 'Missing payment verification fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 1. Verify the payment signature
    const isValid = await verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      RAZORPAY_KEY_SECRET
    );

    if (!isValid) {
      console.error('Invalid payment signature for order:', razorpay_order_id);
      
      // Update subscription status to failed
      await supabaseAdmin
        .from('restaurant_subscriptions')
        .update({
          status: 'inactive',
          payment_notes: {
            error: 'Signature verification failed',
            razorpay_order_id,
            attempted_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('restaurant_id', restaurant_id)
        .eq('razorpay_order_id', razorpay_order_id);

      return new Response(
        JSON.stringify({ error: 'Payment verification failed. Signature mismatch.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Payment signature verified for order:', razorpay_order_id);

    // 2. Fetch plan details to calculate period
    const { data: plan, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('id, name, price, interval, components, features')
      .eq('id', plan_id)
      .single();

    if (planError || !plan) {
      console.error('Plan not found:', planError);
      return new Response(
        JSON.stringify({ error: 'Plan not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // 3. Fetch payment details from Razorpay for payment_method info
    let paymentMethod = 'unknown';
    try {
      const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_Live_Key_ID') ?? '';
      const paymentResponse = await fetch(
        `https://api.razorpay.com/v1/payments/${razorpay_payment_id}`,
        {
          headers: {
            'Authorization': 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
          },
        }
      );
      if (paymentResponse.ok) {
        const paymentData = await paymentResponse.json();
        paymentMethod = paymentData.method || 'unknown';
      }
    } catch (e) {
      console.warn('Could not fetch payment method:', e);
    }

    // 4. Calculate subscription period
    const now = new Date();
    const periodEnd = calculateEndDate(now, plan.interval);

    // 5. Update restaurant_subscriptions with verified payment details
    const { data: subscription, error: updateError } = await supabaseAdmin
      .from('restaurant_subscriptions')
      .upsert(
        {
          restaurant_id: restaurant_id,
          plan_id: plan_id,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
          razorpay_order_id: razorpay_order_id,
          razorpay_payment_id: razorpay_payment_id,
          razorpay_signature: razorpay_signature,
          amount_paid: Number(plan.price),
          currency: 'INR',
          payment_method: paymentMethod,
          paid_at: now.toISOString(),
          refund_status: 'none',
          refund_amount: 0,
          payment_notes: {
            plan_name: plan.name,
            billing_interval: plan.interval,
            verified_at: now.toISOString(),
            payment_method: paymentMethod,
          },
          updated_at: now.toISOString(),
        },
        { onConflict: 'restaurant_id' }
      )
      .select()
      .single();

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return new Response(
        JSON.stringify({ error: 'Payment verified but failed to update subscription', details: updateError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Subscription activated for restaurant:', restaurant_id);

    // ── Fire-and-forget: Send email + WhatsApp + invoice ──
    // This runs asynchronously — the payment response is NOT delayed
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    fetch(`${supabaseUrl}/functions/v1/send-subscription-confirmation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        restaurant_id,
        subscription_id: subscription.id,
        plan_id,
        razorpay_payment_id,
        razorpay_order_id,
        amount_paid: Number(plan.price),
        payment_method: paymentMethod,
        period_start: now.toISOString(),
        period_end: periodEnd.toISOString(),
      }),
    }).then(res => {
      console.log('Confirmation notification sent:', res.status);
    }).catch(err => {
      console.error('Confirmation notification failed (non-blocking):', err);
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment verified and subscription activated',
        subscription: {
          id: subscription.id,
          status: subscription.status,
          plan_name: plan.name,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          amount_paid: subscription.amount_paid,
          payment_method: paymentMethod,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in verify-razorpay-payment:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

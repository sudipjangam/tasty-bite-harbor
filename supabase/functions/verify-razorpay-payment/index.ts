import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
interface VerifyPaymentRequest {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature: string;
  razorpay_payment_link_id?: string;
  razorpay_payment_link_reference_id?: string;
  razorpay_payment_link_status?: string;
  plan_id?: string;
  restaurant_id?: string;
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

// HMAC SHA256 verification for Payment Links
async function verifyPaymentLinkSignature(
  linkId: string,
  referenceId: string,
  status: string,
  paymentId: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${linkId}|${referenceId}|${status}|${paymentId}`);
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
      razorpay_payment_link_id,
      razorpay_payment_link_reference_id,
      razorpay_payment_link_status,
      plan_id,
      restaurant_id,
    }: VerifyPaymentRequest = await req.json();

    const isPaymentLink = !!razorpay_payment_link_id;

    if (!razorpay_payment_id || !razorpay_signature) {
      return new Response(
        JSON.stringify({ error: 'Missing payment verification fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!isPaymentLink && (!razorpay_order_id || !plan_id || !restaurant_id)) {
      return new Response(
        JSON.stringify({ error: 'Missing order verification fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 1. Verify the payment signature
    let isValid = false;
    
    if (isPaymentLink) {
      isValid = await verifyPaymentLinkSignature(
        razorpay_payment_link_id!,
        razorpay_payment_link_reference_id!,
        razorpay_payment_link_status!,
        razorpay_payment_id,
        razorpay_signature,
        RAZORPAY_KEY_SECRET
      );
    } else {
      isValid = await verifySignature(
        razorpay_order_id!,
        razorpay_payment_id,
        razorpay_signature,
        RAZORPAY_KEY_SECRET
      );
    }

    if (!isValid) {
      console.error('Invalid payment signature for:', isPaymentLink ? razorpay_payment_link_id : razorpay_order_id);
      
      if (!isPaymentLink) {
        // Update subscription status to failed for standard orders
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
      }
      return new Response(
        JSON.stringify({ error: 'Payment verification failed. Signature mismatch.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    console.log('Payment signature verified for:', isPaymentLink ? razorpay_payment_link_id : razorpay_order_id);

    let activePlanId = plan_id;
    let activeRestaurantId = restaurant_id;
    let amountPaid = 0;
    
    if (isPaymentLink) {
      // Find the discount record
      const { data: discountRecord, error: discountError } = await supabaseAdmin
        .from('subscription_discounts')
        .select('*')
        .eq('razorpay_payment_link_id', razorpay_payment_link_id)
        .single();
        
      if (discountError || !discountRecord) {
        console.error('Discount record not found for payment link:', razorpay_payment_link_id);
        return new Response(
          JSON.stringify({ error: 'Subscription link data not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }
      
      activePlanId = discountRecord.plan_id;
      activeRestaurantId = discountRecord.restaurant_id;
      amountPaid = discountRecord.discounted_price;
      
      // Update discount record to 'used'
      await supabaseAdmin
        .from('subscription_discounts')
        .update({ status: 'used' })
        .eq('id', discountRecord.id);
    }
    
    // For standard checkout (not payment link), check if discount was applied via create-razorpay-order
    if (!isPaymentLink && activePlanId && activeRestaurantId) {
      const { data: checkoutDiscount } = await supabaseAdmin
        .from('subscription_discounts')
        .select('*')
        .eq('restaurant_id', activeRestaurantId)
        .eq('plan_id', activePlanId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (checkoutDiscount) {
        const isExpired = checkoutDiscount.expires_at && new Date(checkoutDiscount.expires_at) <= new Date();
        if (!isExpired) {
          amountPaid = checkoutDiscount.discounted_price;
          // Mark discount as used
          await supabaseAdmin
            .from('subscription_discounts')
            .update({ status: 'used' })
            .eq('id', checkoutDiscount.id);
          console.log('Standard checkout discount applied and marked used:', checkoutDiscount.id);
        }
      }
    }
    // 2. Fetch plan details to calculate period
    const { data: plan, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('id, name, price, interval, components, features')
      .eq('id', activePlanId)
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
          restaurant_id: activeRestaurantId,
          plan_id: activePlanId,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
          razorpay_order_id: isPaymentLink ? null : razorpay_order_id,
          razorpay_payment_id: razorpay_payment_id,
          razorpay_signature: razorpay_signature,
          amount_paid: isPaymentLink ? amountPaid : Number(plan.price),
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
            payment_link_id: isPaymentLink ? razorpay_payment_link_id : null,
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
    console.log('Subscription activated for restaurant:', activeRestaurantId);
    // ── Send email + WhatsApp + invoice ──
    // Await this to ensure the edge function doesn't terminate before the request completes
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    let notifyData = null;
    try {
      // Use the user's Authorization header so Kong API Gateway allows the request
      const authHeader = req.headers.get('Authorization') || `Bearer ${serviceRoleKey}`;
      const notifyRes = await fetch(`${supabaseUrl}/functions/v1/send-subscription-confirmation`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
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
      });
      notifyData = await notifyRes.json();
      console.log('Confirmation notification sent:', notifyRes.status, notifyData);
    } catch (err) {
      console.error('Confirmation notification failed (non-blocking):', err);
    }
      
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment verified and subscription activated',
        notification_info: notifyData,
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
      JSON.stringify({ error: 'Internal server error', details: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

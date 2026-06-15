import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateDiscountLinkRequest {
  restaurantId: string;
  planId: string;
  discountType: 'percentage' | 'cash' | 'fixed_price';
  discountValue: number;
  expiresAt?: string;
  notes?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_Live_Key_ID') || Deno.env.get('RAZORPAY_Test_Key_ID');
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_Live_Key_Secret') || Deno.env.get('RAZORPAY_Test_Key_Secret');

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error('Missing Razorpay environment variables');
      return new Response(
        JSON.stringify({ error: 'Payment gateway configuration is missing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { restaurantId, planId, discountType, discountValue, expiresAt, notes }: CreateDiscountLinkRequest = await req.json();

    if (!restaurantId || !planId || !discountType || discountValue === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 1. Fetch Plan
    const { data: plan, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('id, name, price, interval, is_active')
      .eq('id', planId)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ error: 'Subscription plan not found or inactive' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // 2. Fetch Restaurant
    const { data: restaurant } = await supabaseAdmin
      .from('restaurants')
      .select('name, email, phone, owner_name, owner_email, owner_phone')
      .eq('id', restaurantId)
      .single();

    if (!restaurant) {
      return new Response(
        JSON.stringify({ error: 'Restaurant not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // 3. Calculate Discount
    const originalPrice = Number(plan.price);
    let discountedPrice = originalPrice;
    let discountAmount = 0;
    let discountPercentage = 0;

    if (discountType === 'fixed_price') {
      discountedPrice = discountValue;
      discountAmount = originalPrice - discountedPrice;
      discountPercentage = (discountAmount / originalPrice) * 100;
    } else if (discountType === 'cash') {
      discountAmount = discountValue;
      discountedPrice = originalPrice - discountAmount;
      discountPercentage = (discountAmount / originalPrice) * 100;
    } else if (discountType === 'percentage') {
      discountPercentage = discountValue;
      discountAmount = (originalPrice * discountPercentage) / 100;
      discountedPrice = originalPrice - discountAmount;
    }

    // Ensure price doesn't go below zero
    discountedPrice = Math.max(0, discountedPrice);
    const priceInPaise = Math.round(discountedPrice * 100);

    // 4. Create Razorpay Payment Link
    const expireBy = expiresAt ? Math.floor(new Date(expiresAt).getTime() / 1000) : undefined;
    
    // We append current timestamp to ensure idempotency is handled correctly or use a receipt
    const referenceId = `sub_disc_${restaurantId.slice(0, 6)}_${Date.now()}`;

    const contactPhone = restaurant.owner_phone || restaurant.phone || "";
    const contactEmail = restaurant.owner_email || restaurant.email || "";

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
      },
      body: JSON.stringify({
        amount: priceInPaise,
        currency: 'INR',
        accept_partial: false,
        expire_by: expireBy,
        reference_id: referenceId,
        description: `Special Offer: ${plan.name} (${plan.interval})`,
        customer: {
          name: restaurant.owner_name || restaurant.name,
          contact: contactPhone,
          email: contactEmail,
        },
        notify: {
          sms: false,
          email: false, // We'll handle notifications manually or leave it false
        },
        reminder_enable: false,
        notes: {
          restaurant_id: restaurantId,
          plan_id: planId,
          discount_type: discountType,
          is_discounted_subscription: "true"
        },
        callback_url: req.headers.get('origin') ? `${req.headers.get('origin')}/subscription-success?link_id={payment_link_id}` : undefined,
        callback_method: "get"
      }),
    });

    if (!razorpayResponse.ok) {
      const errorBody = await razorpayResponse.text();
      console.error('Razorpay payment link creation failed:', errorBody);
      return new Response(
        JSON.stringify({ error: 'Failed to create payment link', details: errorBody }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }

    const paymentLink = await razorpayResponse.json();

    // 5. Invalidate existing active discounts for this plan/restaurant combo
    await supabaseAdmin
      .from('subscription_discounts')
      .update({ status: 'cancelled' })
      .eq('restaurant_id', restaurantId)
      .eq('plan_id', planId)
      .eq('status', 'active');

    // 6. Save discount info to DB
    const { data: discountRecord, error: insertError } = await supabaseAdmin
      .from('subscription_discounts')
      .insert({
        restaurant_id: restaurantId,
        restaurant_name: restaurant.name,
        plan_id: planId,
        discount_type: discountType,
        discount_value: discountValue,
        original_price: originalPrice,
        discounted_price: discountedPrice,
        discount_amount: discountAmount,
        discount_percentage: discountPercentage,
        razorpay_payment_link_id: paymentLink.id,
        razorpay_payment_link_url: paymentLink.short_url,
        razorpay_payment_link_status: paymentLink.status,
        expires_at: expiresAt || null,
        notes: notes || null,
        status: 'active'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to save discount record:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save discount record' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        paymentLink: paymentLink.short_url,
        discount: discountRecord
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating discounted payment link:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

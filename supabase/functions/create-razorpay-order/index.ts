import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateOrderRequest {
  planId: string;
  restaurantId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_Live_Key_ID');
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_Live_Key_Secret');

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error('Razorpay credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      );
    }

    // Create Supabase admin client (service role for writing)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { planId, restaurantId }: CreateOrderRequest = await req.json();

    if (!planId || !restaurantId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: planId, restaurantId' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 1. Fetch plan details
    const { data: plan, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('id, name, price, interval, is_active')
      .eq('id', planId)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      console.error('Plan not found:', planError);
      return new Response(
        JSON.stringify({ error: 'Subscription plan not found or inactive' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // 2. Verify plan has a price > 0 (free trials should bypass)
    const priceInPaise = Math.round(Number(plan.price) * 100);
    if (priceInPaise <= 0) {
      return new Response(
        JSON.stringify({ error: 'Free plans do not require payment. Use direct activation.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 3. Fetch restaurant details for prefill
    const { data: restaurant } = await supabaseAdmin
      .from('restaurants')
      .select('name, email, phone, owner_name, owner_email, owner_phone')
      .eq('id', restaurantId)
      .single();

    // 4. Create Razorpay order via API
    const receipt = `sub_${restaurantId.slice(0, 8)}_${Date.now()}`;
    
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
      },
      body: JSON.stringify({
        amount: priceInPaise,
        currency: 'INR',
        receipt: receipt,
        notes: {
          restaurant_id: restaurantId,
          plan_id: planId,
          plan_name: plan.name,
          billing_interval: plan.interval,
        },
      }),
    });

    if (!razorpayResponse.ok) {
      const errorBody = await razorpayResponse.text();
      console.error('Razorpay order creation failed:', errorBody);
      return new Response(
        JSON.stringify({ error: 'Failed to create payment order', details: errorBody }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }

    const razorpayOrder = await razorpayResponse.json();
    console.log('Razorpay order created:', razorpayOrder.id);

    // 5. Upsert restaurant_subscriptions with pending status
    const { error: upsertError } = await supabaseAdmin
      .from('restaurant_subscriptions')
      .upsert(
        {
          restaurant_id: restaurantId,
          plan_id: planId,
          status: 'pending',
          razorpay_order_id: razorpayOrder.id,
          amount_paid: Number(plan.price),
          currency: 'INR',
          receipt: receipt,
          payment_notes: {
            plan_name: plan.name,
            billing_interval: plan.interval,
            order_created_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'restaurant_id' }
      );

    if (upsertError) {
      console.error('Error updating subscription:', upsertError);
      // Don't fail — the Razorpay order was created, verification will handle DB update
    }

    // 6. Return order details to frontend
    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          receipt: receipt,
        },
        key_id: RAZORPAY_KEY_ID,
        prefill: {
          name: restaurant?.owner_name || restaurant?.name || '',
          email: restaurant?.owner_email || restaurant?.email || '',
          contact: restaurant?.owner_phone || restaurant?.phone || '',
        },
        plan: {
          name: plan.name,
          price: plan.price,
          interval: plan.interval,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in create-razorpay-order:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RechargeOrderRequest {
  restaurantId: string;
  amount: number; // in INR rupees
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

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { restaurantId, amount }: RechargeOrderRequest = await req.json();

    if (!restaurantId || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid fields: restaurantId, amount' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Fetch restaurant details for prefill
    const { data: restaurant, error: restError } = await supabaseAdmin
      .from('restaurants')
      .select('name, email, phone, owner_name, owner_email, owner_phone')
      .eq('id', restaurantId)
      .single();
      
    if (restError || !restaurant) {
      return new Response(
        JSON.stringify({ error: 'Restaurant not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Create Razorpay order via API
    // Convert rupees to paise
    const priceInPaise = Math.round(amount * 100);
    const receipt = `wal_${restaurantId.slice(0, 8)}_${Date.now()}`;
    
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
          type: 'wallet_recharge',
          restaurant_id: restaurantId,
          restaurant_name: restaurant.name,
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
    console.log('Razorpay wallet recharge order created:', razorpayOrder.id);

    // Return order details to frontend
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
          name: restaurant.owner_name || restaurant.name || '',
          email: restaurant.owner_email || restaurant.email || '',
          contact: restaurant.owner_phone || restaurant.phone || '',
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in create-wallet-recharge-order:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

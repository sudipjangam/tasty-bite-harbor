import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyRechargeRequest {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
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
      restaurant_id,
    }: VerifyRechargeRequest = await req.json();

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !restaurant_id) {
      return new Response(
        JSON.stringify({ error: 'Missing verification fields' }),
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
      console.error('Invalid payment signature for wallet recharge:', razorpay_order_id);
      return new Response(
        JSON.stringify({ error: 'Payment verification failed. Signature mismatch.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log('Payment signature verified for wallet recharge:', razorpay_order_id);

    // 2. Fetch payment details from Razorpay to get the amount actually paid
    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_Live_Key_ID') ?? '';
    const paymentResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${razorpay_payment_id}`,
      {
        headers: {
          'Authorization': 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
        },
      }
    );
    
    if (!paymentResponse.ok) {
        return new Response(
            JSON.stringify({ error: 'Could not fetch payment details from Razorpay' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }

    const paymentData = await paymentResponse.json();
    
    if (paymentData.status !== 'captured') {
        return new Response(
            JSON.stringify({ error: 'Payment has not been captured yet' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }

    const amountPaidRupees = paymentData.amount / 100; // Convert paise to rupees

    // 3. Fetch restaurant details
    const { data: restaurant } = await supabaseAdmin
        .from('restaurants')
        .select('name')
        .eq('id', restaurant_id)
        .single();

    // 4. Update the wallet balance (atomic addition using RPC or just read/write if low concurrency)
    // Since we don't have an RPC for increment, we can do an upsert or use raw SQL.
    // However, Supabase Edge Functions doesn't let us run raw SQL directly without RPC.
    // But since it's an admin client, we can fetch, then update, or better, create a transaction record
    // and a trigger could update the balance, OR just calculate it here.
    
    const { data: currentWallet } = await supabaseAdmin
        .from('restaurant_wallets')
        .select('balance')
        .eq('restaurant_id', restaurant_id)
        .single();
        
    const newBalance = (currentWallet?.balance || 0) + amountPaidRupees;

    const { error: walletError } = await supabaseAdmin
        .from('restaurant_wallets')
        .upsert({
            restaurant_id: restaurant_id,
            restaurant_name: restaurant?.name,
            balance: newBalance,
            updated_at: new Date().toISOString()
        });

    if (walletError) {
        console.error('Failed to update wallet balance:', walletError);
        return new Response(
            JSON.stringify({ error: 'Failed to update wallet balance' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }

    // 5. Log the transaction
    await supabaseAdmin
        .from('wallet_transactions')
        .insert({
            restaurant_id: restaurant_id,
            restaurant_name: restaurant?.name,
            amount: amountPaidRupees,
            transaction_type: 'deposit',
            reference_id: razorpay_payment_id,
            description: `Wallet recharge via Razorpay`
        });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Wallet recharge successful',
        new_balance: newBalance,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in verify-wallet-recharge:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

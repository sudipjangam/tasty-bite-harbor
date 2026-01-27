import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreatePaymentRequest {
  sessionId: string;
  amount: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client (public access)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    //Get request body
    const { sessionId, amount }: CreatePaymentRequest = await req.json();

    if (!sessionId || !amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: sessionId, amount' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Get session
    const { data: session, error: sessionError } = await supabaseClient
      .from('customer_order_sessions')
      .select('*, qr_codes!inner(restaurant_id)')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    const restaurantId = session.restaurant_id;

    // Get payment settings (UPI ID)
    const { data: paymentSettings, error: paymentError } = await supabaseClient
      .from('payment_settings')
      .select('upi_id, upi_name')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .maybeSingle();

    if (paymentError || !paymentSettings?.upi_id) {
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured for this restaurant' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 503, // Service Unavailable
        }
      );
    }

    // Generate payment intent ID (unique transaction ID)
    const paymentIntentId = `QR-${crypto.randomUUID()}`;

    // Generate UPI payment string
    // Format: upi://pay?pa=<UPI_ID>&pn=<PAYEE_NAME>&am=<AMOUNT>&cu=INR&tn=<TRANSACTION_NOTE>
    const upiString = `upi://pay?pa=${encodeURIComponent(paymentSettings.upi_id)}&pn=${encodeURIComponent(paymentSettings.upi_name || 'Restaurant')}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Order Payment - ${session.entity_type} ${session.entity_id}`)}`;

    // Generate QR code for UPI string
    const QRCode = await import('https://esm.sh/qrcode@1.5.3');
    const paymentQRCode = await QRCode.default.toDataURL(upiString, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 1,
    });

    // Update session with payment details
    const { error: updateError } = await supabaseClient
      .from('customer_order_sessions')
      .update({
        payment_status: 'processing',
        payment_intent_id: paymentIntentId,
        payment_amount: amount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating session:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update session' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment: {
          paymentIntentId,
          upiString,
          qrCodeImage: paymentQRCode,
          amount,
          merchantName: paymentSettings.upi_name,
          upiId: paymentSettings.upi_id,
        },
        message: 'Scan the QR code with any UPI app to complete payment',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in create-payment-qr function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

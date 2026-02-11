import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { generatePaytmChecksum, generatePaytmOrderId } from '../_shared/paytm-checksum.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreatePaytmQRRequest {
  restaurantId: string;
  orderId?: string;
  amount: number;
  tableNumber?: string;
  posId?: string;
  orderDescription?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role for DB operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request
    const {
      restaurantId,
      orderId,
      amount,
      tableNumber,
      posId,
      orderDescription,
    }: CreatePaytmQRRequest = await req.json();

    // Validate required fields
    if (!restaurantId || !amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: restaurantId, amount' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Step 1: Fetch Paytm credentials from payment_settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('payment_settings')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .maybeSingle();

    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ error: 'Payment settings not found for restaurant' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Check if Paytm is configured
    if (settings.gateway_type !== 'paytm' || !settings.paytm_mid || !settings.paytm_merchant_key) {
      // Fallback: If Paytm not configured, use static UPI QR (existing behavior)
      if (settings.upi_id) {
        return await generateStaticUPIQR(settings, amount, tableNumber, orderId);
      }
      return new Response(
        JSON.stringify({ error: 'Paytm credentials not configured. Please add MID and Merchant Key in Settings.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      );
    }

    // Step 2: Generate unique Paytm Order ID
    const paytmOrderId = generatePaytmOrderId(tableNumber);

    // Step 3: Prepare Paytm API request body
    const requestBody: Record<string, unknown> = {
      mid: settings.paytm_mid,
      orderId: paytmOrderId,
      amount: amount.toFixed(2),
      businessType: 'UPI_QR_CODE',
      posId: posId || `POS_${restaurantId.substring(0, 8)}`,
    };

    // Add optional fields
    if (orderDescription) {
      requestBody.orderDetail = orderDescription;
    }

    // Set expiry to 10 minutes from now
    const expiry = new Date(Date.now() + 10 * 60 * 1000);
    const expiryFormatted = expiry.toISOString().replace('T', ' ').substring(0, 19);
    requestBody.expiryDate = expiryFormatted;

    // Step 4: Generate checksum signature
    const signature = await generatePaytmChecksum(requestBody, settings.paytm_merchant_key);

    // Step 5: Build full Paytm API request
    const paytmRequest = {
      body: requestBody,
      head: {
        clientId: 'C11',
        version: 'v1',
        signature: signature,
      },
    };

    // Step 6: Determine API URL (staging vs production)
    const baseUrl = settings.paytm_is_test_mode
      ? 'https://securegw-stage.paytm.in'
      : 'https://securegw.paytm.in';

    // Step 7: Call Paytm Create QR Code API
    console.log(`Calling Paytm QR API: ${baseUrl}/paymentservices/qr/create`);
    const paytmResponse = await fetch(`${baseUrl}/paymentservices/qr/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paytmRequest),
    });

    const paytmResult = await paytmResponse.json();
    console.log('Paytm QR API Response:', JSON.stringify(paytmResult));

    // Step 8: Check for errors in Paytm response
    if (
      paytmResult?.body?.resultInfo?.resultStatus === 'FAILURE' ||
      paytmResult?.body?.resultInfo?.resultCode !== '0000'
    ) {
      console.error('Paytm QR creation failed:', paytmResult?.body?.resultInfo);
      return new Response(
        JSON.stringify({
          error: 'Failed to generate Paytm QR code',
          details: paytmResult?.body?.resultInfo?.resultMsg || 'Unknown error',
          resultCode: paytmResult?.body?.resultInfo?.resultCode,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }

    // Step 9: Store transaction in database
    const { data: transaction, error: txnError } = await supabaseClient
      .from('payment_transactions')
      .insert({
        restaurant_id: restaurantId,
        order_id: orderId || null,
        table_number: tableNumber || null,
        paytm_order_id: paytmOrderId,
        paytm_qr_id: paytmResult?.body?.qrCodeId || null,
        amount: amount,
        status: 'pending',
        qr_code_data: paytmResult?.body?.qrData || null,
        qr_image_base64: paytmResult?.body?.image || null,
        expires_at: expiry.toISOString(),
      })
      .select()
      .single();

    if (txnError) {
      console.error('Error storing transaction:', txnError);
      // Don't fail — QR was already generated, just log the error
    }

    // Step 10: Return QR code data to frontend
    return new Response(
      JSON.stringify({
        success: true,
        payment: {
          transactionId: transaction?.id || null,
          paytmOrderId: paytmOrderId,
          qrCodeId: paytmResult?.body?.qrCodeId,
          qrData: paytmResult?.body?.qrData,
          qrImage: paytmResult?.body?.image, // Base64 encoded QR image
          amount: amount,
          expiresAt: expiry.toISOString(),
          isPaytm: true,
        },
        message: 'Dynamic QR code generated. Customer can scan with any UPI app.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in create-paytm-qr function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

/**
 * Fallback: Generate static UPI QR (existing behavior)
 * Used when Paytm is not configured but UPI ID exists
 */
async function generateStaticUPIQR(
  settings: Record<string, unknown>,
  amount: number,
  tableNumber?: string,
  orderId?: string
) {
  const upiString = `upi://pay?pa=${encodeURIComponent(String(settings.upi_id))}&pn=${encodeURIComponent(String(settings.upi_name || 'Restaurant'))}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Order Payment${tableNumber ? ` - Table ${tableNumber}` : ''}`)}`;

  const QRCode = await import('https://esm.sh/qrcode@1.5.3');
  const qrImage = await QRCode.default.toDataURL(upiString, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    width: 300,
    margin: 1,
  });

  return new Response(
    JSON.stringify({
      success: true,
      payment: {
        transactionId: null,
        paytmOrderId: null,
        qrData: upiString,
        qrImage: qrImage,
        amount: amount,
        expiresAt: null,
        isPaytm: false,
      },
      message: 'Static UPI QR code generated.',
    }),
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Content-Type': 'application/json',
      },
      status: 200,
    }
  );
}

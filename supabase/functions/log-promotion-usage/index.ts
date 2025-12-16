import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LogPromotionRequest {
  orderId: string;
  promotionId: string;
  restaurantId: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  orderTotal: number;
  discountAmount: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get request body
    const { 
      orderId, 
      promotionId, 
      restaurantId,
      customerName,
      customerPhone,
      customerEmail,
      orderTotal,
      discountAmount
    }: LogPromotionRequest = await req.json();

    if (!orderId || !promotionId || !restaurantId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: orderId, promotionId, and restaurantId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Logging promotion usage:', { orderId, promotionId, restaurantId });

    // Insert into sent_promotions table to log the usage
    const { data, error } = await supabase
      .from('sent_promotions')
      .insert({
        promotion_campaign_id: promotionId,
        customer_name: customerName || 'Walk-in Customer',
        customer_phone: customerPhone || null,
        customer_email: customerEmail || null,
        sent_date: new Date().toISOString(),
        sent_status: 'used',
        sent_method: 'pos',
        restaurant_id: restaurantId,
        order_id: orderId,
        order_total: orderTotal,
        discount_amount: discountAmount
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging promotion usage:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Promotion usage logged successfully:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Promotion usage logged successfully',
        data 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in log-promotion-usage function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

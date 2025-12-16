import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidatePromoRequest {
  code: string;
  orderSubtotal: number;
  restaurantId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization') || ''
          }
        }
      }
    );

    // Get request body
    const { code, orderSubtotal, restaurantId }: ValidatePromoRequest = await req.json();

    if (!code || !restaurantId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: code and restaurantId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Validating promo code:', { code, orderSubtotal, restaurantId });

    // Get today's date for comparison (as ISO date string)
    const today = new Date().toISOString().split('T')[0];
    console.log('Today:', today);

    // Query promotion_campaigns table for matching code
    // First, let's get all matching promotions to debug
    const { data: allPromotions, error: debugError } = await supabase
      .from('promotion_campaigns')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .ilike('promotion_code', code.trim());

    console.log('All matching promotions:', allPromotions);

    // Now query with date filters
    const { data: promotion, error: promoError } = await supabase
      .from('promotion_campaigns')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .ilike('promotion_code', code.trim())
      .lte('start_date', today)
      .gte('end_date', today)
      .maybeSingle();

    if (promoError || !promotion) {
      console.log('Promo code not found or expired:', promoError);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Invalid or expired promotion code' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if promotion is active
    if (!promotion.is_active) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'This promotion is currently inactive' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (promotion.discount_percentage > 0) {
      discountAmount = (orderSubtotal * promotion.discount_percentage) / 100;
    } else if (promotion.discount_amount > 0) {
      discountAmount = promotion.discount_amount;
    }

    console.log('Promo code validated successfully:', {
      id: promotion.id,
      name: promotion.name,
      discountAmount
    });

    // Return valid promotion details
    return new Response(
      JSON.stringify({
        valid: true,
        promotion: {
          id: promotion.id,
          name: promotion.name,
          code: promotion.promotion_code,
          description: promotion.description,
          discount_percentage: promotion.discount_percentage,
          discount_amount: promotion.discount_amount,
          calculated_discount: discountAmount
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error validating promo code:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

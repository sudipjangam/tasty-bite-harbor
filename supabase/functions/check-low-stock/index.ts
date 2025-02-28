
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { restaurant_id } = await req.json();

    if (!restaurant_id) {
      throw new Error("Restaurant ID is required");
    }

    // Get low stock items that haven't had notifications sent
    const { data: lowStockItems, error: itemsError } = await supabase
      .from('inventory_items')
      .select('id, name, quantity, reorder_level, restaurant_id, category')
      .eq('restaurant_id', restaurant_id)
      .not('reorder_level', 'is', null)
      .lte('quantity', supabase.raw('reorder_level'))
      .eq('notification_sent', false);

    if (itemsError) {
      throw new Error(`Error fetching low stock items: ${itemsError.message}`);
    }

    if (!lowStockItems || lowStockItems.length === 0) {
      return new Response(
        JSON.stringify({ message: "No new low stock items" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get notification preferences
    const { data: preferences, error: preferencesError } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('restaurant_id', restaurant_id)
      .single();

    if (preferencesError && preferencesError.code !== 'PGRST116') {
      throw new Error(`Error fetching notification preferences: ${preferencesError.message}`);
    }

    if (!preferences || !preferences.notify_low_stock) {
      return new Response(
        JSON.stringify({ message: "Low stock notifications disabled" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark items as notified
    const updatePromises = lowStockItems.map(item => 
      supabase
        .from('inventory_items')
        .update({ notification_sent: true })
        .eq('id', item.id)
    );

    await Promise.all(updatePromises);

    // Here, you would typically send an email notification
    // For this implementation, we'll just return the data

    return new Response(
      JSON.stringify({
        message: "Low stock items detected",
        items: lowStockItems,
        recipients: preferences?.email_recipients || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-low-stock function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

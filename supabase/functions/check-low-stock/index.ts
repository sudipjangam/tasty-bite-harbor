
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  reorder_level: number;
  unit: string;
  restaurant_id: string;
  notification_sent: boolean;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    let restaurantId: string | null = null;
    try {
      const body = await req.json();
      restaurantId = body.restaurant_id;
      
      if (!restaurantId) {
        throw new Error('Restaurant ID is required');
      }
    } catch (e) {
      console.error('Error parsing request body:', e);
      throw new Error('Invalid request body');
    }

    console.log(`Checking low stock for restaurant: ${restaurantId}`);

    // Query for low stock items using proper comparison
    const { data: lowStockItems, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .not('reorder_level', 'is', null)
      .eq('notification_sent', false);

    if (error) {
      console.error('Error fetching inventory items:', error);
      throw error;
    }

    console.log(`Found ${lowStockItems?.length || 0} items to check`);

    // Filter items where quantity <= reorder_level
    const actualLowStockItems = (lowStockItems || []).filter(item => 
      item.quantity <= item.reorder_level
    );

    console.log(`Found ${actualLowStockItems.length} low stock items`);

    // Process low stock items
    const notifications = [];

    for (const item of actualLowStockItems) {
      console.log(`Processing low stock item: ${item.name}, quantity: ${item.quantity}, reorder_level: ${item.reorder_level}`);
      
      // Mark notification as sent
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ notification_sent: true })
        .eq('id', item.id)
        .eq('restaurant_id', restaurantId);

      if (updateError) {
        console.error(`Error updating item ${item.id}:`, updateError);
        continue;
      }

      // Create inventory alert
      const { error: alertError } = await supabase
        .from('inventory_alerts')
        .insert({
          restaurant_id: restaurantId,
          inventory_item_id: item.id,
          alert_type: 'low_stock',
          message: `Item "${item.name}" is running low. Current quantity: ${item.quantity} ${item.unit}, Reorder level: ${item.reorder_level} ${item.unit}`
        });

      if (alertError) {
        console.error(`Error creating alert for item ${item.id}:`, alertError);
        continue;
      }

      // Get notification preferences
      const { data: preferences, error: prefError } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .single();

      if (prefError || !preferences || !preferences.notify_low_stock) {
        console.log(`Skipping notification for restaurant ${restaurantId} - preferences not set or disabled`);
        continue;
      }

      notifications.push({
        item: item.name,
        quantity: item.quantity,
        reorder_level: item.reorder_level,
        unit: item.unit,
        recipients: preferences.email_recipients || []
      });
    }

    console.log(`Created ${notifications.length} notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notifications,
        items_checked: lowStockItems?.length || 0,
        low_stock_items: actualLowStockItems.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (err) {
    console.error('Error in check-low-stock:', err);
    return new Response(
      JSON.stringify({ 
        error: err.message || 'Internal server error',
        details: err.stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
})

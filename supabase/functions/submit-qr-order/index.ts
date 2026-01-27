import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderItem {
  menuItemId: string;
  quantity: number;
  price: number;
  modifiers?: string[];
}

interface SubmitOrderRequest {
  restaurantId: string;
  entityType: string;
  entityId: string;
  customerName: string;
  customerPhone: string;
  specialInstructions?: string;
  items: OrderItem[];
  totalAmount: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get request body
    const requestBody: SubmitOrderRequest = await req.json();
    const {
      restaurantId,
      entityType,
      entityId,
      customerName,
      customerPhone,
      specialInstructions,
      items,
      totalAmount,
    } = requestBody;

    // Validation
    if (!restaurantId || !entityType || !entityId || !items || items.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: restaurantId, entityType, entityId, items',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    if (!customerName || !customerPhone) {
      return new Response(
        JSON.stringify({
          error: 'Customer name and phone are required',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Get entity name for display
    let entityName = '';
    if (entityType === 'table') {
      const { data: table } = await supabaseClient
        .from('restaurant_tables')
        .select('table_number')
        .eq('id', entityId)
        .single();
      entityName = table?.table_number || 'Unknown Table';
    } else {
      const { data: room } = await supabaseClient
        .from('rooms')
        .select('room_number')
        .eq('id', entityId)
        .single();
      entityName = room?.room_number || 'Unknown Room';
    }

    // Fetch menu item details to build order items with names
    const menuItemIds = items.map((item) => item.menuItemId);
    const { data: menuItems } = await supabaseClient
      .from('menu_items')
      .select('id, name, price')
      .in('id', menuItemIds);

    const orderItems = items.map((item) => {
      const menuItem = menuItems?.find((mi) => mi.id === item.menuItemId);
      return {
        id: item.menuItemId,
        name: menuItem?.name || 'Unknown Item',
        quantity: item.quantity,
        price: item.price,
        modifiers: item.modifiers || [],
      };
    });

    // Create order in orders table
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        customer_name: customerName,
        customer_phone: customerPhone,
        items: JSON.stringify(orderItems),
        total: totalAmount,
        status: 'pending',
        source: 'qr',
        order_type: entityType === 'table' ? 'dine-in' : 'room_service',
        payment_status: 'pending', // Payment to be completed
        is_qr_order: true,
        special_instructions: specialInstructions,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return new Response(
        JSON.stringify({
          error: 'Failed to create order',
          details: orderError.message,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Create kitchen order entry
    const { error: kitchenOrderError } = await supabaseClient
      .from('kitchen_orders')
      .insert({
        order_id: order.id,
        restaurant_id: restaurantId,
        table_number: entityType === 'table' ? entityName : null,
        items: orderItems,
        status: 'new',
        special_instructions: specialInstructions,
        order_source: 'qr',
      });

    if (kitchenOrderError) {
      console.error('Error creating kitchen order:', kitchenOrderError);
      // Don't fail the entire request, just log
    }

    // Update table/room status
    if (entityType === 'table') {
      await supabaseClient
        .from('restaurant_tables')
        .update({ status: 'occupied' })
        .eq('id', entityId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId: order.id,
        orderNumber: order.id.substring(0, 8).toUpperCase(),
        message: 'Order placed successfully!',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      }
    );
  } catch (error) {
    console.error('Error in submit-qr-order function:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

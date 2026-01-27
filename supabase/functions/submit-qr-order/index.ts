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

    // Format items for display (matching POS format)
    const formattedItems = items.map((item) => {
      const menuItem = menuItems?.find((mi) => mi.id === item.menuItemId);
      const itemName = menuItem?.name || 'Unknown Item';
      const price = item.price;
      return `${item.quantity}x ${itemName} @${price}`;
    });

    // Keep detailed items for kitchen order
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
        items: formattedItems, // Use formatted strings like POS orders
        total: totalAmount,
        status: 'pending',
        source: 'qr',
        order_type: entityType === 'table' ? 'dine-in' : 'room_service',
        payment_status: 'pending', // Payment to be completed
        is_qr_order: true,
        // Add entity tracking
        table_id: entityType === 'table' ? entityId : null,
        room_id: entityType === 'room' ? entityId : null,
        entity_name: entityName, // Table number or room number for display
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
        table_number: entityName, // Use entity name directly (e.g., D1, S2, Room 101)
        customer_name: customerName,
        customer_phone: customerPhone,
        server_name: 'QR Order', // Mark as QR order
        items: orderItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          notes: item.modifiers || [], // Use modifiers as notes
        })),
        status: 'new',
        source: 'qr', // Column is 'source' not 'order_source'
        order_type: entityType === 'table' ? 'dine_in' : 'room_service',
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

    // Fetch payment settings for UPI details
    const { data: paymentSettings } = await supabaseClient
      .from('payment_settings')
      .select('upi_id, upi_name')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .maybeSingle();

    // Generate UPI payment link if UPI is configured
    let upiPaymentLink = null;
    if (paymentSettings?.upi_id) {
      const upiId = paymentSettings.upi_id;
      const businessName = paymentSettings.upi_name || 'Restaurant';
      const amount = totalAmount.toFixed(2);
      const orderRef = order.id.substring(0, 8).toUpperCase();
      
      // UPI deep link format: upi://pay?pa=UPI_ID&pn=NAME&am=AMOUNT&cu=INR&tn=NOTE
      upiPaymentLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(businessName)}&am=${amount}&cu=INR&tn=Order%20${orderRef}`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId: order.id,
        orderNumber: order.id.substring(0, 8).toUpperCase(),
        message: 'Order placed successfully!',
        payment: {
          required: true,
          method: paymentSettings?.upi_id ? 'upi' : 'pending',
          upi: paymentSettings ? {
            id: paymentSettings.upi_id,
            name: paymentSettings.upi_name,
            paymentLink: upiPaymentLink,
            amount: totalAmount,
          } : null,
        },
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

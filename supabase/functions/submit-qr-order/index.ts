import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  checkRateLimit,
  createRateLimitResponse,
  getRequestIdentifier,
  RATE_LIMITS,
} from '../_shared/rate-limit.ts';

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

  // Rate limiting — prevent DDoS / fake order flooding
  const identifier = getRequestIdentifier(req);
  const rateLimitResult = checkRateLimit(identifier, RATE_LIMITS.STANDARD);
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult, corsHeaders);
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

    // Validate the QR entity exists and is active — blocks table/room ID manipulation
    const { data: qrRecord } = await supabaseClient
      .from('qr_codes')
      .select('id, is_active')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .maybeSingle();

    if (!qrRecord) {
      return new Response(
        JSON.stringify({ error: 'Invalid or deactivated QR code' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Get entity name for display
    let entityName = '';
    if (entityType === 'table') {
      const { data: table } = await supabaseClient
        .from('restaurant_tables')
        .select('name')
        .eq('id', entityId)
        .single();
      entityName = table?.name || 'Unknown Table';
    } else {
      const { data: room } = await supabaseClient
        .from('rooms')
        .select('room_number')
        .eq('id', entityId)
        .single();
      entityName = room?.room_number || 'Unknown Room';
    }

    // Fetch menu item details to build order items with names and AUTHORITATIVE prices
    const menuItemIds = items.map((item) => item.menuItemId);
    const { data: menuItems, error: menuFetchError } = await supabaseClient
      .from('menu_items')
      .select('id, name, price')
      .in('id', menuItemIds)
      .eq('restaurant_id', restaurantId);  // Ensure items belong to this restaurant

    if (menuFetchError || !menuItems) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch menu item details' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Validate all requested items exist in this restaurant's menu
    for (const item of items) {
      const menuItem = menuItems.find((mi) => mi.id === item.menuItemId);
      if (!menuItem) {
        return new Response(
          JSON.stringify({ error: `Invalid menu item: ${item.menuItemId}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }

    // Server-side total calculation using DB prices (ignore client-provided prices)
    const calculatedTotal = items.reduce((sum, item) => {
      const menuItem = menuItems.find((mi) => mi.id === item.menuItemId)!;
      return sum + (menuItem.price * item.quantity);
    }, 0);

    // Format items for display (matching POS format) — use DB price
    const formattedItems = items.map((item) => {
      const menuItem = menuItems.find((mi) => mi.id === item.menuItemId)!;
      return `${item.quantity}x ${menuItem.name} @${menuItem.price}`;
    });

    // Keep detailed items for kitchen order — use DB price
    const orderItems = items.map((item) => {
      const menuItem = menuItems.find((mi) => mi.id === item.menuItemId)!;
      return {
        id: item.menuItemId,
        name: menuItem.name,
        quantity: item.quantity,
        price: menuItem.price,  // Server-authoritative price, NOT client-provided
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
        total: calculatedTotal,  // Server-recalculated total — never trust client
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

    // Send WhatsApp notification
    try {
      const { data: restaurant } = await supabaseClient
        .from('restaurants')
        .select('name')
        .eq('id', restaurantId)
        .single();

      const restaurantNameStr = restaurant?.name || 'Our Restaurant';
      const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0);
      const displayTotal = calculatedTotal;  // Use server-calculated total in notifications

      const whatsappPayload = {
        action: 'send_template',
        templateName: 'qr_order_created',
        recipientType: 'customer',
        customerPhone: customerPhone,
        restaurantId: restaurantId,
        orderId: order.id,
        templateParams: [
          customerName, // {{1}} Customer Name
          restaurantNameStr, // {{2}} Restaurant Name
          order.id.substring(0, 8).toUpperCase(), // {{3}} Order Number
          totalItemCount.toString(), // {{4}} Item count
          `₹${displayTotal.toFixed(2)}` // {{5}} Total Amount
        ],
        buttonValues: [order.id] // Dynamic URL button for tracking
      };

      await supabaseClient.functions.invoke('send-whatsapp-unified', {
        body: whatsappPayload
      });
    } catch (waError) {
      console.error('Error sending WhatsApp notification:', waError);
      // Don't fail the order creation if WA fails
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
            amount: calculatedTotal,  // Server-calculated amount for payment
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
      JSON.stringify({ error: 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

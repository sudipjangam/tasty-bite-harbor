import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-swiggy-signature, x-zomato-signature, x-urbanpiper-signature",
};

interface WebhookPayload {
  provider: "swiggy" | "zomato" | "magicpin" | "urbanpiper" | "ondc";
  store_id: string;
  event_type: "ORDER_PLACED" | "ORDER_CANCELLED" | "RIDER_ASSIGNED" | "RIDER_ARRIVED" | "RIDER_PICKED_UP";
  order: {
    aggregator_order_id: string;
    display_id?: string;
    customer_name?: string;
    customer_phone?: string;
    customer_notes?: string;
    items: Array<{
      id?: string;
      name: string;
      quantity: number;
      price: number;
      options?: string[];
      notes?: string;
    }>;
    gross_amount: number;
    discount_amount?: number;
    taxes?: number;
    packaging_charge?: number;
    rider?: {
      name?: string;
      phone?: string;
      status?: "assigned" | "at_restaurant" | "picked_up";
    };
    otp?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body: WebhookPayload = await req.json();
    const { provider, store_id, event_type, order } = body;

    if (!provider || !store_id || !order) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields (provider, store_id, order)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1. Resolve store and restaurant_id
    const { data: store, error: storeError } = await supabase
      .from("aggregator_stores")
      .select("restaurant_id, is_store_open, auto_accept_orders, default_prep_time_minutes, commission_percentage")
      .eq("provider", provider)
      .eq("store_id", store_id)
      .single();

    if (storeError || !store) {
      // Fallback: look up by restaurant_id directly if store_id matches UUID
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("id", store_id)
        .single();

      if (!restaurant) {
        return new Response(
          JSON.stringify({ success: false, error: `Store ${store_id} not registered for ${provider}` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const restaurantId = store?.restaurant_id || store_id;
    const defaultPrepTime = store?.default_prep_time_minutes || 15;
    const commissionRate = Number(store?.commission_percentage || 18);
    const grossAmount = Number(order.gross_amount || 0);
    const commissionAmount = (grossAmount * commissionRate) / 100;
    const netPayout = grossAmount - commissionAmount - Number(order.discount_amount || 0);
    const displayId = order.display_id || `${provider.slice(0, 3).toUpperCase()}-${order.aggregator_order_id.slice(-4)}`;

    // 2. Handle Event Types
    if (event_type === "ORDER_PLACED") {
      // Insert into core POS orders table
      const { data: insertedOrder, error: orderInsertError } = await supabase
        .from("orders")
        .insert([
          {
            restaurant_id: restaurantId,
            customer_name: `${order.customer_name || "Online Guest"} (${provider.toUpperCase()})`,
            customer_phone: order.customer_phone || null,
            order_type: "delivery",
            source: provider,
            status: store?.auto_accept_orders ? "preparing" : "pending",
            payment_status: "paid",
            payment_method: `${provider}_online`,
            total: grossAmount,
            notes: `[${provider.toUpperCase()} #${displayId}] ${order.customer_notes || ""}`,
            items: order.items.map((i) => ({
              name: i.name,
              quantity: i.quantity,
              price: i.price,
              notes: i.notes || "",
            })),
          },
        ])
        .select("id")
        .single();

      if (orderInsertError) throw orderInsertError;

      // Insert into Kitchen KOT orders table
      await supabase.from("kitchen_orders").insert([
        {
          restaurant_id: restaurantId,
          order_id: insertedOrder.id,
          source: provider.toUpperCase(),
          status: "preparing",
          priority: "high",
          items: order.items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            notes: i.notes || "",
          })),
        },
      ]);

      // Record in aggregator_orders log
      await supabase.from("aggregator_orders").insert([
        {
          restaurant_id: restaurantId,
          provider,
          order_id: insertedOrder.id,
          aggregator_order_id: order.aggregator_order_id,
          display_order_id: displayId,
          customer_name: order.customer_name || "Online Guest",
          customer_phone: order.customer_phone,
          channel_status: store?.auto_accept_orders ? "preparing" : "placed",
          items: order.items,
          gross_amount: grossAmount,
          discount_amount: Number(order.discount_amount || 0),
          packaging_charge: Number(order.packaging_charge || 0),
          taxes: Number(order.taxes || 0),
          commission_amount: commissionAmount,
          net_payout: netPayout,
          rider_name: order.rider?.name,
          rider_phone: order.rider?.phone,
          rider_status: order.rider?.status || "not_assigned",
          otp: order.otp,
          customer_notes: order.customer_notes,
          prep_time_minutes: defaultPrepTime,
          raw_payload: body,
        },
      ]);

      return new Response(
        JSON.stringify({
          success: true,
          action: "ORDER_ACCEPTED",
          order_id: insertedOrder.id,
          display_id: displayId,
          prep_time_minutes: defaultPrepTime,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (event_type === "RIDER_ASSIGNED" || event_type === "RIDER_ARRIVED" || event_type === "RIDER_PICKED_UP") {
      const channelStatus =
        event_type === "RIDER_ARRIVED"
          ? "rider_arrived"
          : event_type === "RIDER_PICKED_UP"
            ? "dispatched"
            : "rider_assigned";

      await supabase
        .from("aggregator_orders")
        .update({
          rider_name: order.rider?.name,
          rider_phone: order.rider?.phone,
          rider_status: order.rider?.status,
          channel_status: channelStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("aggregator_order_id", order.aggregator_order_id)
        .eq("provider", provider);

      return new Response(
        JSON.stringify({ success: true, message: `Rider status updated: ${channelStatus}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (event_type === "ORDER_CANCELLED") {
      await supabase
        .from("aggregator_orders")
        .update({ channel_status: "cancelled", updated_at: new Date().toISOString() })
        .eq("aggregator_order_id", order.aggregator_order_id)
        .eq("provider", provider);

      return new Response(
        JSON.stringify({ success: true, message: "Order cancelled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Event received" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("[Aggregator Webhook Error]:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

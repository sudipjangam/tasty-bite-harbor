import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { orderId } = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "Missing orderId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch order using service role (bypasses RLS)
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, status, total, restaurant_id, entity_name, order_type, created_at, customer_name, items")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      console.error("[get-order-status] Order query error:", JSON.stringify(error), "orderId:", orderId);
      return new Response(
        JSON.stringify({ success: false, error: "Order not found", detail: error?.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch restaurant info separately
    let restaurantName = "Restaurant";
    let restaurantPhone = "";
    if (order.restaurant_id) {
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("name, phone")
        .eq("id", order.restaurant_id)
        .single();
      restaurantName = restaurant?.name || "Restaurant";
      restaurantPhone = restaurant?.phone || "";
    }

    // Return only safe, non-sensitive fields
    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: order.id,
          status: order.status,
          total: order.total,
          table_number: order.entity_name,
          order_type: order.order_type,
          created_at: order.created_at,
          customer_name: order.customer_name,
          items: order.items || [],
          restaurant_name: restaurantName,
          restaurant_phone: restaurantPhone,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[get-order-status] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

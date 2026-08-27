import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ActionPayload {
  restaurant_id: string;
  provider: "swiggy" | "zomato" | "magicpin" | "urbanpiper" | "ondc" | "all";
  action: "accept_order" | "reject_order" | "mark_food_ready" | "toggle_store" | "toggle_rush" | "toggle_item_86";
  params?: {
    order_id?: string;
    aggregator_order_id?: string;
    prep_time_minutes?: number;
    rejection_reason?: string;
    is_open?: boolean;
    is_in_rush?: boolean;
    menu_item_id?: string;
    is_in_stock?: boolean;
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

    const body: ActionPayload = await req.json();
    const { restaurant_id, provider, action, params } = body;

    if (!restaurant_id || !action) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing restaurant_id or action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "accept_order") {
      if (params?.aggregator_order_id) {
        await supabase
          .from("aggregator_orders")
          .update({
            channel_status: "preparing",
            prep_time_minutes: params.prep_time_minutes || 15,
            updated_at: new Date().toISOString(),
          })
          .eq("aggregator_order_id", params.aggregator_order_id);
      }
      if (params?.order_id) {
        await supabase
          .from("orders")
          .update({ status: "preparing" })
          .eq("id", params.order_id);
      }
      return new Response(
        JSON.stringify({ success: true, message: "Order accepted and prep time updated" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "mark_food_ready") {
      if (params?.aggregator_order_id) {
        await supabase
          .from("aggregator_orders")
          .update({
            channel_status: "food_ready",
            updated_at: new Date().toISOString(),
          })
          .eq("aggregator_order_id", params.aggregator_order_id);
      }
      if (params?.order_id) {
        await supabase
          .from("orders")
          .update({ status: "ready" })
          .eq("id", params.order_id);
        
        await supabase
          .from("kitchen_orders")
          .update({ status: "ready" })
          .eq("order_id", params.order_id);
      }
      return new Response(
        JSON.stringify({ success: true, message: "Food marked ready for rider pickup" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "reject_order") {
      if (params?.aggregator_order_id) {
        await supabase
          .from("aggregator_orders")
          .update({
            channel_status: "cancelled",
            customer_notes: `Rejected: ${params.rejection_reason || "Restaurant unavailable"}`,
            updated_at: new Date().toISOString(),
          })
          .eq("aggregator_order_id", params.aggregator_order_id);
      }
      if (params?.order_id) {
        await supabase
          .from("orders")
          .update({ status: "cancelled" })
          .eq("id", params.order_id);
      }
      return new Response(
        JSON.stringify({ success: true, message: "Order rejected" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "toggle_store") {
      let query = supabase
        .from("aggregator_stores")
        .update({ is_store_open: params?.is_open ?? true, updated_at: new Date().toISOString() })
        .eq("restaurant_id", restaurant_id);

      if (provider !== "all") {
        query = query.eq("provider", provider);
      }
      await query;

      return new Response(
        JSON.stringify({ success: true, message: `Store status updated to ${params?.is_open ? "OPEN" : "CLOSED"}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "toggle_rush") {
      let query = supabase
        .from("aggregator_stores")
        .update({ is_in_rush: params?.is_in_rush ?? false, updated_at: new Date().toISOString() })
        .eq("restaurant_id", restaurant_id);

      if (provider !== "all") {
        query = query.eq("provider", provider);
      }
      await query;

      return new Response(
        JSON.stringify({ success: true, message: `Rush mode updated` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "toggle_item_86" && params?.menu_item_id) {
      // Upsert into aggregator_item_mappings
      const providersToUpdate = provider === "all" ? ["swiggy", "zomato", "magicpin"] : [provider];
      
      for (const p of providersToUpdate) {
        await supabase.from("aggregator_item_mappings").upsert(
          {
            restaurant_id,
            menu_item_id: params.menu_item_id,
            provider: p,
            is_in_stock: params.is_in_stock ?? true,
            is_available: params.is_in_stock ?? true,
            synced_at: new Date().toISOString(),
          },
          { onConflict: "restaurant_id,menu_item_id,provider" },
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: `Item 86 status updated across channels` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Unhandled action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("[Aggregator Action Error]:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

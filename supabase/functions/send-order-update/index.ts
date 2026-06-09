import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { record, old_record } = body;

    if (!record || !old_record) {
      return new Response(JSON.stringify({ error: "Missing records" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only proceed if status changed
    if (record.status === old_record.status) {
      return new Response(JSON.stringify({ success: true, message: "Status unchanged" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phone = record.customer_phone;
    const name = record.customer_name || "Guest";
    const status = record.status;
    const orderNum = record.id.substring(0, 8).toUpperCase();

    // If no phone, we can't send alert
    if (!phone) {
      return new Response(JSON.stringify({ success: true, message: "No phone number on order" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only send on key milestones to prevent spam
    const allowedStatuses = ["preparing", "ready", "completed"];
    if (!allowedStatuses.includes(status)) {
      return new Response(JSON.stringify({ success: true, message: `Skipping notification for status: ${status}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- FEATURE ACCESS CHECK ---
    // Check if restaurant has WhatsApp order status feature enabled
    const { data: subscription } = await supabase
      .from('restaurant_subscriptions')
      .select('plan_id')
      .eq('restaurant_id', record.restaurant_id)
      .eq('status', 'active')
      .maybeSingle();

    if (!subscription?.plan_id) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No active subscription — skipping notification' 
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('components')
      .eq('id', subscription.plan_id)
      .single();

    const allowedFeatures: string[] = Array.isArray(plan?.components) ? plan.components : [];
    const hasFeature = allowedFeatures.includes('orders.whatsapp_status_updates');

    if (!hasFeature) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'WhatsApp order status updates not enabled for this plan' 
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    // --- END FEATURE ACCESS CHECK ---



    // Get restaurant name for the message template variables
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("name, phone")
      .eq("id", record.restaurant_id)
      .single();

    const restaurantName = restaurant?.name || "Restaurant";
    const restaurantPhone = restaurant?.phone || "";

    // Map template name based on status. Fallback to default templates if not customized.
    const templateName = `order_${status}`;

    // Standard variables for templates
    const variables = {
      customer_name: name,
      restaurant_name: restaurantName,
      order_number: orderNum,
      status_label: status === "preparing" ? "Preparing" : status === "ready" ? "Ready" : "Served",
      contact_number: restaurantPhone,
      amount: String(record.total || record.total_amount || "0"),
    };

    console.log(`[order-update] Invoking unified whatsapp for Order ${orderNum}: status=${status}, phone=${phone}`);

    // Call unified whatsapp sender internal API
    const unifiedRes = await fetch(
      `${supabaseUrl}/functions/v1/send-whatsapp-unified`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurantId: record.restaurant_id,
          phoneNumber: phone,
          customerName: name,
          restaurantName: restaurantName,
          templateName: templateName, // order_preparing, order_ready, order_completed
          amount: variables.amount,
          contactNumber: restaurantPhone,
          variables: variables,
          buttons: [
            { type: "url", value: record.id }
          ]
        }),
      }
    );

    const result = await unifiedRes.json();

    if (!unifiedRes.ok) {
      console.error("[order-update] Unified sender error:", JSON.stringify(result));
      return new Response(JSON.stringify({ success: false, error: result.error || "Unified sender error" }), {
        status: unifiedRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[order-update] Exception:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

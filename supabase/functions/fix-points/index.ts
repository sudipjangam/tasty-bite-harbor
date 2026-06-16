import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("Hello from fix-points Function!");

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    const { restaurant_id } = await req.json();

    if (!restaurant_id) {
      return new Response(JSON.stringify({ error: "restaurant_id is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Initialize Supabase Admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch loyalty program for the restaurant
    const { data: program, error: programErr } = await supabaseAdmin
      .from("loyalty_programs")
      .select("*")
      .eq("restaurant_id", restaurant_id)
      .single();

    if (programErr || !program) {
      return new Response(JSON.stringify({ error: "Loyalty program not found", details: programErr }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    const spendThreshold = program.spend_threshold || 100;
    const pointsPerAmount = program.points_per_amount || 1;

    // 2. Fetch all customers for this restaurant
    const { data: customers, error: custErr } = await supabaseAdmin
      .from("customers")
      .select("id, name, total_spent, loyalty_points, loyalty_tier_id")
      .eq("restaurant_id", restaurant_id);

    if (custErr) throw custErr;

    // 3. Fetch all redeem transactions
    const { data: redeemTxs, error: redeemErr } = await supabaseAdmin
      .from("loyalty_transactions")
      .select("customer_id, points")
      .eq("restaurant_id", restaurant_id)
      .eq("transaction_type", "redeem");

    if (redeemErr) throw redeemErr;

    // Group redeemed points by customer
    const redeemedMap: Record<string, number> = {};
    for (const tx of redeemTxs || []) {
      redeemedMap[tx.customer_id] = (redeemedMap[tx.customer_id] || 0) + tx.points;
    }

    // Fetch tiers to get multipliers
    const { data: tiers, error: tiersErr } = await supabaseAdmin
      .from("loyalty_tiers")
      .select("id, points_multiplier")
      .eq("restaurant_id", restaurant_id);
      
    if (tiersErr) throw tiersErr;
    const tierMultipliers = (tiers || []).reduce((acc, tier) => {
      acc[tier.id] = tier.points_multiplier || 1;
      return acc;
    }, {} as Record<string, number>);

    const updates = [];
    const fixedCustomers = [];

    // 4. Recalculate for each customer
    for (const customer of customers || []) {
      const totalSpent = customer.total_spent || 0;
      const multiplier = customer.loyalty_tier_id ? (tierMultipliers[customer.loyalty_tier_id] || 1) : 1;
      
      // Calculate new earned points
      const earnedPoints = Math.floor((totalSpent / spendThreshold) * pointsPerAmount * multiplier);
      const redeemedPoints = redeemedMap[customer.id] || 0;
      
      const correctPoints = Math.max(0, earnedPoints - redeemedPoints);

      if (correctPoints !== customer.loyalty_points) {
        updates.push(
          supabaseAdmin
            .from("customers")
            .update({ loyalty_points: correctPoints })
            .eq("id", customer.id)
        );
        
        fixedCustomers.push({
          name: customer.name,
          old_points: customer.loyalty_points,
          new_points: correctPoints
        });
      }
    }

    await Promise.all(updates);

    return new Response(JSON.stringify({
      success: true,
      message: `Fixed loyalty points for ${updates.length} customers.`,
      fixed_customers: fixedCustomers
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/fix-points' \
    --header 'apiKey: sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH' \
    --data '{"name":"Functions"}'

*/

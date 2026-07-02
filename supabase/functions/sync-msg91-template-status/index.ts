import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing Authorization header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const MSG91_AUTH_KEY = Deno.env.get("MSG91_AUTH_KEY");
    const MSG91_INTEGRATED_NUMBER = Deno.env.get("MSG91_INTEGRATED_NUMBER") || "918329540398";

    if (!MSG91_AUTH_KEY) {
      throw new Error("Missing MSG91_AUTH_KEY");
    }

    // Optional: filter by specific template name
    const body = await req.json().catch(() => ({}));
    const { templateName, restaurantId } = body;

    // Fetch template statuses from MSG91
    let url = `https://control.msg91.com/api/v5/whatsapp/get-template-client/${MSG91_INTEGRATED_NUMBER}`;
    if (templateName) {
      url += `?template_name=${encodeURIComponent(templateName)}`;
    }

    console.log("Fetching MSG91 template statuses:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        authkey: MSG91_AUTH_KEY,
      },
    });

    const rawText = await response.text();
    console.log("MSG91 get-templates response:", response.status, rawText.substring(0, 500));

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error(`MSG91 returned non-JSON: ${rawText}`);
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: data, status: response.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Parse the templates and update status in our DB
    // MSG91 returns templates with status like "APPROVED", "PENDING", "REJECTED"
    const msg91Templates = Array.isArray(data) ? data : (data?.data || data?.templates || []);
    const updates: any[] = [];

    // Use service role to update any restaurant's templates
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    for (const mt of msg91Templates) {
      const msg91Status = (mt.status || "").toUpperCase();
      const templateSlug = mt.name || mt.template_name;
      
      if (!templateSlug) continue;

      // Map MSG91 status to our status
      let ourStatus: string | null = null;
      if (msg91Status === "APPROVED" || msg91Status === "ENABLED") {
        ourStatus = "meta_approved";
      } else if (msg91Status === "REJECTED" || msg91Status === "DISABLED") {
        ourStatus = "meta_rejected";
      } else if (msg91Status === "PENDING" || msg91Status === "IN_REVIEW") {
        ourStatus = "meta_pending";
      }

      if (!ourStatus) continue;

      // Check if template already exists in DB
      let existsQuery = supabaseAdmin
        .from("whatsapp_templates")
        .select("id")
        .eq("name", templateSlug);

      if (restaurantId) {
        existsQuery = existsQuery.eq("restaurant_id", restaurantId);
      }

      const { data: existingRows } = await existsQuery.limit(1);

      if (!existingRows || existingRows.length === 0) {
        // Template exists in Meta but NOT in our DB — insert it
        if (!restaurantId) {
          console.warn(`Skipping upsert for ${templateSlug}: no restaurantId provided`);
          continue;
        }

        // Build display name from slug: "order_ready" → "Order Ready"
        const displayName = templateSlug
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase());

        // Detect category from Meta data
        const metaCategory = (mt.category || "UTILITY").toUpperCase();

        // Extract body text from Meta template components
        let bodyText = "";
        const bodyComponent = (mt.components || []).find(
          (c: any) => c.type === "BODY"
        );
        if (bodyComponent) {
          bodyText = bodyComponent.text || "";
        }

        // Extract header text
        let headerText = null;
        const headerComponent = (mt.components || []).find(
          (c: any) => c.type === "HEADER" && c.format === "TEXT"
        );
        if (headerComponent) {
          headerText = headerComponent.text || null;
        }

        // Extract footer text
        let footerText = null;
        const footerComponent = (mt.components || []).find(
          (c: any) => c.type === "FOOTER"
        );
        if (footerComponent) {
          footerText = footerComponent.text || null;
        }

        // Extract buttons
        const buttonComponent = (mt.components || []).find(
          (c: any) => c.type === "BUTTONS"
        );
        const buttons = buttonComponent?.buttons || [];

        // Build variables from body placeholders {{1}}, {{2}}, etc
        const varMatches = bodyText.match(/\{\{(\d+)\}\}/g) || [];
        const variables = [...new Set(varMatches)].map((v: string) => {
          const pos = parseInt(v.replace(/[{}]/g, ""));
          return { position: pos, name: `var_${pos}`, sample: "" };
        });

        const { error: insertError } = await supabaseAdmin
          .from("whatsapp_templates")
          .insert({
            restaurant_id: restaurantId,
            name: templateSlug,
            display_name: displayName,
            category: metaCategory,
            language: mt.language || "en",
            body: bodyText,
            variables,
            header_text: headerText,
            footer_text: footerText,
            buttons,
            status: ourStatus,
            is_default: false,
            meta_response: mt,
            admin_notes: `Imported from Meta (synced ${new Date().toISOString()})`,
          });

        if (insertError) {
          console.error(`Error inserting template ${templateSlug}:`, insertError);
        } else {
          updates.push({ template: templateSlug, status: ourStatus, action: "inserted" });
        }
      } else {
        // Template exists — update its status
        const { error: updateError } = await supabaseAdmin
          .from("whatsapp_templates")
          .update({
            status: ourStatus,
            meta_response: mt,
            admin_notes: `Meta status: ${msg91Status} (synced ${new Date().toISOString()})`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingRows[0].id);

        if (updateError) {
          console.error(`Error updating template ${templateSlug}:`, updateError);
        } else {
          updates.push({ template: templateSlug, status: ourStatus, action: "updated" });
        }
      }
    }

    console.log(`Synced ${updates.length} template statuses`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: updates.length,
        updates,
        totalFromMsg91: msg91Templates.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in sync-msg91-template-status:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

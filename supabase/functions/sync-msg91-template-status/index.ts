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

    // Meta Cloud API credentials
    const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (!WHATSAPP_ACCESS_TOKEN) {
      throw new Error("Missing WHATSAPP_ACCESS_TOKEN secret");
    }

    // Read request body
    const body = await req.json().catch(() => ({}));
    const { restaurantId } = body;

    // Use service role for DB writes
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Resolve WABA ID from phone number ID if not directly available.
    // Meta Graph API: GET /{phone-number-id}?fields=whatsapp_business_account
    // Then GET /{waba-id}/message_templates to list templates.
    let wabaId: string | null = null;

    // Step 1: Get WABA ID from Phone Number ID
    const phoneInfoUrl = `https://graph.facebook.com/v23.0/${WHATSAPP_PHONE_NUMBER_ID}?fields=whatsapp_business_account`;
    console.log("Fetching WABA ID from:", phoneInfoUrl);

    const phoneInfoResp = await fetch(phoneInfoUrl, {
      headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` },
    });
    const phoneInfoText = await phoneInfoResp.text();
    console.log("Phone info response:", phoneInfoResp.status, phoneInfoText.substring(0, 300));

    let phoneInfo: any = {};
    try {
      phoneInfo = JSON.parse(phoneInfoText);
    } catch {
      console.error("Failed to parse phone info:", phoneInfoText);
    }

    wabaId = phoneInfo?.whatsapp_business_account?.id || null;

    if (!wabaId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Could not resolve WhatsApp Business Account ID from phone number ID",
          phoneInfo,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log("WABA ID:", wabaId);

    // Step 2: Fetch all templates from Meta
    const templatesUrl = `https://graph.facebook.com/v23.0/${wabaId}/message_templates?limit=100&fields=name,status,category,language,components`;
    console.log("Fetching templates from:", templatesUrl);

    const templatesResp = await fetch(templatesUrl, {
      headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` },
    });
    const templatesText = await templatesResp.text();
    console.log("Templates response:", templatesResp.status, templatesText.substring(0, 500));

    if (!templatesResp.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `Meta API error: ${templatesText}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    let templatesData: any = {};
    try {
      templatesData = JSON.parse(templatesText);
    } catch {
      throw new Error(`Meta API returned non-JSON: ${templatesText}`);
    }

    const metaTemplates: any[] = templatesData?.data || [];
    console.log(`Found ${metaTemplates.length} templates from Meta`);

    const updates: any[] = [];

    for (const mt of metaTemplates) {
      const templateSlug = mt.name;
      const metaStatus = (mt.status || "").toUpperCase();

      if (!templateSlug) continue;

      // Map Meta status to our status
      let ourStatus: string | null = null;
      if (metaStatus === "APPROVED") {
        ourStatus = "meta_approved";
      } else if (metaStatus === "REJECTED" || metaStatus === "DISABLED") {
        ourStatus = "meta_rejected";
      } else if (metaStatus === "PENDING" || metaStatus === "IN_APPEAL" || metaStatus === "PENDING_DELETION") {
        ourStatus = "meta_pending";
      } else if (metaStatus === "DRAFT") {
        ourStatus = "draft";
      }

      if (!ourStatus) {
        console.log(`Skipping template ${templateSlug} with unknown status ${metaStatus}`);
        continue;
      }

      // Check if template already exists in DB
      let existsQuery = supabaseAdmin
        .from("whatsapp_templates")
        .select("id, status")
        .eq("name", templateSlug);

      if (restaurantId) {
        existsQuery = existsQuery.eq("restaurant_id", restaurantId);
      }

      const { data: existingRows } = await existsQuery.limit(1);

      if (!existingRows || existingRows.length === 0) {
        // Template exists in Meta but NOT in our DB — insert it
        if (!restaurantId) {
          console.warn(`Skipping insert for ${templateSlug}: no restaurantId provided`);
          continue;
        }

        // Build display name from slug: "order_ready" → "Order Ready"
        const displayName = templateSlug
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase());

        const metaCategory = (mt.category || "UTILITY").toUpperCase();

        // Extract body text from Meta template components
        let bodyText = "";
        const bodyComponent = (mt.components || []).find(
          (c: any) => c.type === "BODY"
        );
        if (bodyComponent) bodyText = bodyComponent.text || "";

        // Extract header
        let headerText: string | null = null;
        const headerComponent = (mt.components || []).find(
          (c: any) => c.type === "HEADER" && c.format === "TEXT"
        );
        if (headerComponent) headerText = headerComponent.text || null;

        // Extract footer
        let footerText: string | null = null;
        const footerComponent = (mt.components || []).find(
          (c: any) => c.type === "FOOTER"
        );
        if (footerComponent) footerText = footerComponent.text || null;

        // Extract buttons
        const buttonComponent = (mt.components || []).find(
          (c: any) => c.type === "BUTTONS"
        );
        const buttons = buttonComponent?.buttons || [];

        // Build variables array from {{1}}, {{2}} placeholders in body
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
        // Template exists — update its status from Meta
        const { error: updateError } = await supabaseAdmin
          .from("whatsapp_templates")
          .update({
            status: ourStatus,
            meta_response: mt,
            admin_notes: `Meta status: ${metaStatus} (synced ${new Date().toISOString()})`,
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

    console.log(`Processed ${updates.length} templates`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: updates.length,
        updates,
        totalFromMeta: metaTemplates.length,
        wabaId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in sync-meta-templates:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

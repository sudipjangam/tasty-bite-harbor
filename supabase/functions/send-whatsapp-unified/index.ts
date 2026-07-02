import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Smart variable resolver: maps template name → ordered list of variable names
// When variables arrive as a named object { customer_name: "X" }, this mapping
// ensures they are converted to the correct positional order for {{1}}, {{2}}, etc.
const TEMPLATE_VAR_MAPS: Record<string, string[]> = {
  "invoice_with_contact": ["customer_name", "restaurant_name", "amount", "order_date", "contact_number"],
  "invoice_with_review": ["customer_name", "restaurant_name", "amount", "order_date", "contact_number"],
  "loyalty_points_earned_notification": ["customer_name", "restaurant_name", "order_date", "amount", "discount_code", "contact_number"],
  "subscription_confirmation": ["customer_name", "restaurant_name"],
  "subscription_special_offer": ["customer_name", "amount"],
  "order_completed": ["customer_name", "restaurant_name", "amount"],
  "order_preparing": ["customer_name", "restaurant_name"],
  "order_ready": ["customer_name", "restaurant_name"],
  "qr_order_created": ["customer_name", "restaurant_name", "amount"],
  "points_expiry_warning": ["customer_name", "amount", "order_date"],
  "welcome_message": ["customer_name", "restaurant_name"],
  "reservation_confirmed": ["customer_name", "restaurant_name", "order_date"],
  "reservation_reminder": ["customer_name", "restaurant_name", "order_date"],
  "hello_world": [],
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      restaurantId,
      phoneNumber,
      customerName,
      restaurantName,
      templateName,
      amount,
      billDate,
      googleReviewUrl,
      billUrl,
      variables,
      buttons,
    } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Read global platform config from platform_config table (key = 'whatsapp')
    let provider = "msg91";
    let metaConfig: any = {};

    const { data: platformConfig } = await supabase
      .from("platform_config")
      .select("value")
      .eq("key", "whatsapp")
      .maybeSingle();

    if (platformConfig?.value) {
      const cfg = platformConfig.value as any;
      provider = cfg.provider || "msg91";
      metaConfig = cfg.meta_config || {};
    }

    // Look up the template's language from DB (if available)
    let templateLanguage = "en"; // default
    const usedTemplateName = templateName || "invoice_with_review";

    if (restaurantId) {
      const { data: templateDef } = await supabase
        .from("whatsapp_templates")
        .select("language")
        .eq("name", usedTemplateName)
        .eq("restaurant_id", restaurantId)
        .maybeSingle();

      if (templateDef?.language) {
        templateLanguage = templateDef.language;
      }
    }

    console.log(`[unified] provider=${provider}, template=${usedTemplateName}, lang=${templateLanguage}, phone=${phoneNumber}, hasToken=${!!metaConfig.access_token}, phoneId=${metaConfig.phone_number_id}`);

    // --- META CLOUD API PATH ---
    if (provider === "meta_cloud") {
      const phoneNumberId = metaConfig.phone_number_id || Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
      const accessToken = metaConfig.access_token || Deno.env.get("WHATSAPP_ACCESS_TOKEN");

      if (!phoneNumberId || !accessToken) {
        return new Response(
          JSON.stringify({ success: false, error: "Meta Cloud API credentials not configured. Set them in Platform Admin > WhatsApp." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Smart variable resolution:
      // 1. If variables is an array of { position, value } → use directly (from new campaign hook)
      // 2. If variables is an object with positional keys ("1", "2", ...) → sort by key and use values
      // 3. If variables is a named object { customer_name: "X" } → use template mapping to order
      // 4. Fallback: legacy positional defaults
      let positionalValues: string[] = [];

      if (variables) {
        const varKeys = Object.keys(variables);
        const allNumericKeys = varKeys.length > 0 && varKeys.every(k => /^\d+$/.test(k));

        if (allNumericKeys) {
          // Case 2: Positional keys like { "1": "John", "2": "Restaurant" }
          positionalValues = varKeys
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map(k => String(variables[k] || "-"));
        } else {
          // Case 3: Named keys like { customer_name: "John" }
          // Look up template variable ordering from DB first, then fallback to hardcoded map
          let varOrder: string[] | null = null;

          // Try DB lookup
          if (restaurantId) {
            const { data: templateDef } = await supabase
              .from("whatsapp_templates")
              .select("variables")
              .eq("name", usedTemplateName)
              .eq("restaurant_id", restaurantId)
              .maybeSingle();
            if (templateDef?.variables && Array.isArray(templateDef.variables)) {
              varOrder = (templateDef.variables as any[])
                .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
                .map((v: any) => v.name);
            }
          }

          // Fallback to hardcoded map
          if (!varOrder) {
            varOrder = TEMPLATE_VAR_MAPS[usedTemplateName] || null;
          }

          if (varOrder) {
            positionalValues = varOrder.map(name => String(variables[name] || "-"));
          } else {
            // Last resort: just use values in insertion order
            console.warn(`[unified] No variable mapping found for template: ${usedTemplateName}, using insertion order`);
            positionalValues = Object.values(variables).map((v: any) => String(v || "-"));
          }
        }
      } else {
        // No variables provided — use legacy defaults
        positionalValues = [
          customerName || "Customer",
          restaurantName || "Restaurant",
          amount || "-",
          billDate || new Date().toLocaleDateString("en-IN"),
          googleReviewUrl || "-",
        ];
      }

      console.log(`[unified] Resolved ${positionalValues.length} positional values for template ${usedTemplateName}:`, positionalValues);

      const bodyParams = positionalValues.map((val) => ({
        type: "text",
        text: val,
      }));

      const metaComponents: any[] = bodyParams.length > 0
        ? [{ type: "body", parameters: bodyParams }]
        : [];

      // 2 URL buttons: View Bill (index 0) + Instagram (index 1)
      // Google Review is in body as {{5}} — tappable link
      if (buttons && buttons.length > 0) {
        // Take only first 2 buttons (Meta hard limit for URL type)
        buttons.slice(0, 2).forEach((btn: any, idx: number) => {
          const urlValue = btn.value || "";
          if (urlValue) {
            metaComponents.push({
              type: "button",
              sub_type: "url",
              index: idx,
              parameters: [{ type: "text", text: String(urlValue) }],
            });
          }
        });
      } else if (billUrl) {
        // Backward compat: single billUrl as button 0
        metaComponents.push({
          type: "button",
          sub_type: "url",
          index: 0,
          parameters: [{ type: "text", text: String(billUrl) }],
        });
      }

      // Clean phone number for Meta Cloud
      let cleanPhoneMeta = phoneNumber.replace(/[\+\-\s]/g, "");
      if (cleanPhoneMeta.length === 10) {
        cleanPhoneMeta = "91" + cleanPhoneMeta;
      }

      // Helper: build Meta payload for a given language code
      const buildMetaPayload = (langCode: string) => ({
        messaging_product: "whatsapp",
        to: cleanPhoneMeta,
        type: "template",
        template: {
          name: usedTemplateName,
          language: { code: langCode },
          components: metaComponents.length > 0 ? metaComponents : undefined,
        },
      });

      // Helper: send to Meta Cloud API
      const sendToMeta = async (langCode: string) => {
        const payload = buildMetaPayload(langCode);
        console.log(`[meta] Sending with lang=${langCode}:`, JSON.stringify(payload));
        const res = await fetch(
          `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
        const data = await res.json();
        return { res, data };
      };

      // Attempt 1: use the resolved language from DB
      let { res: metaRes, data: metaData } = await sendToMeta(templateLanguage);

      // If 132001 (template not found in translation), auto-retry with alternate language
      // This permanently handles en vs en_US mismatch regardless of how template was created
      if (!metaRes.ok && metaData?.error?.code === 132001) {
        const ALT_LANGS: Record<string, string> = { en: "en_US", en_US: "en" };
        const altLang = ALT_LANGS[templateLanguage];
        if (altLang) {
          console.log(`[meta] Template not found with lang=${templateLanguage}, retrying with lang=${altLang}`);
          const retry = await sendToMeta(altLang);
          metaRes = retry.res;
          metaData = retry.data;

          // If retry succeeded, update DB so future calls use the correct language directly
          if (metaRes.ok && restaurantId) {
            console.log(`[meta] Retry succeeded. Updating DB language to: ${altLang}`);
            await supabase
              .from("whatsapp_templates")
              .update({ language: altLang })
              .eq("name", usedTemplateName)
              .eq("restaurant_id", restaurantId);
          }
        }
      }

      if (!metaRes.ok) {
        console.error("[meta] Error:", JSON.stringify(metaData));
        return new Response(
          JSON.stringify({
            success: false,
            error: metaData.error?.message || "Meta API error",
            details: metaData,
            template: usedTemplateName,
            variableCount: positionalValues.length,
            language: templateLanguage,
          }),
          { status: metaRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, provider: "meta_cloud", data: metaData }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- MSG91 PATH (default) ---
    const msg91AuthKey = Deno.env.get("MSG91_AUTH_KEY");
    const msg91IntegratedNumber = Deno.env.get("MSG91_INTEGRATED_NUMBER") || "917834811114";

    if (!msg91AuthKey) {
      return new Response(
        JSON.stringify({ success: false, error: "MSG91_AUTH_KEY not set" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const usedTemplate = templateName || "invoice_with_review";
    const vars = variables || {};
    const components: Record<string, any> = {};

    // Positional numbered params:
    // {{1}}=customer_name, {{2}}=restaurant_name, {{3}}=amount,
    // {{4}}=order_date, {{5}}=google_review_url
    const positionalEntries = Object.keys(vars).length > 0
      ? Object.values(vars)
      : [
          customerName || "Customer",
          restaurantName || "Restaurant",
          amount || "0",
          billDate || new Date().toLocaleDateString("en-IN"),
          googleReviewUrl || "-",
        ];

    positionalEntries.forEach((val: any, idx: number) => {
      components[`body_${idx + 1}`] = {
        type: "text",
        value: String(val || "-"),
      };
    });

    // 2 URL buttons: View Bill (button_1) + Instagram (button_2)
    // Google Review is {{5}} in body — tappable link
    if (buttons && buttons.length > 0) {
      // Take only first 2 buttons (Meta limit)
      buttons.slice(0, 2).forEach((btn: any, idx: number) => {
        components[`button_${idx + 1}`] = {
          subtype: btn.type || "url",
          type: "text",
          value: btn.value || "",
        };
      });
    } else if (billUrl) {
      components.button_1 = {
        subtype: "url",
        type: "text",
        value: billUrl,
      };
    }

    // Clean phone number
    let cleanPhone = phoneNumber.replace(/[\+\-\s]/g, "");
    if (cleanPhone.length === 10) {
      cleanPhone = "91" + cleanPhone;
    }

    const msg91Payload = {
      integrated_number: msg91IntegratedNumber,
      content_type: "template",
      payload: {
        messaging_product: "whatsapp",
        type: "template",
        template: {
          name: usedTemplateName,
          language: {
            code: templateLanguage,
            policy: "deterministic",
          },
          namespace: "7991fb14_798f_46ac_86b2_b0c79f284695",
          to_and_components: [
            {
              to: [cleanPhone],
              components,
            },
          ],
        },
      },
    };

    const msg91Res = await fetch(
      "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
      {
        method: "POST",
        headers: {
          authkey: msg91AuthKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(msg91Payload),
      }
    );

    const msg91Data = await msg91Res.json();

    if (!msg91Res.ok || msg91Data?.message === "error") {
      console.error("[msg91] Error with template", usedTemplate, ":", JSON.stringify(msg91Data));

      // If the new template is pending approval, fall back to the old working template
      const FALLBACK_TEMPLATE = "invoice_with_contact";
      if (usedTemplate !== FALLBACK_TEMPLATE) {
        console.log(`[msg91] Retrying with fallback template: ${FALLBACK_TEMPLATE}`);
        const fallbackPayload = {
          ...msg91Payload,
          payload: {
            ...msg91Payload.payload,
            template: {
              ...msg91Payload.payload.template,
              name: FALLBACK_TEMPLATE,
              // Fallback uses 5 body params + 1 button (invoice_with_contact format)
              to_and_components: [
                {
                  to: [cleanPhone],
                  components: {
                    body_1: { type: "text", value: String(positionalEntries[0] || "Customer") },
                    body_2: { type: "text", value: String(positionalEntries[1] || "Restaurant") },
                    body_3: { type: "text", value: String(positionalEntries[2] || "-") },
                    body_4: { type: "text", value: String(positionalEntries[3] || "-") },
                    body_5: { type: "text", value: String(positionalEntries[4] || "-") },
                    ...(components.button_1 ? { button_1: components.button_1 } : {}),
                  },
                },
              ],
            },
          },
        };

        const fallbackRes = await fetch(
          "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
          {
            method: "POST",
            headers: { authkey: msg91AuthKey, "Content-Type": "application/json" },
            body: JSON.stringify(fallbackPayload),
          }
        );
        const fallbackData = await fallbackRes.json();
        console.log("[msg91] Fallback result:", JSON.stringify(fallbackData));

        if (fallbackRes.ok && fallbackData?.message !== "error") {
          return new Response(
            JSON.stringify({ success: true, provider: "msg91", data: fallbackData, usedFallback: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      return new Response(
        JSON.stringify({ success: false, error: msg91Data?.msg || msg91Data?.message || "MSG91 API error", details: msg91Data }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, provider: "msg91", data: msg91Data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[unified] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

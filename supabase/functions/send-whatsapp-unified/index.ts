import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
      contactNumber,
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

    console.log(`[unified] provider=${provider}, template=${templateName}, phone=${phoneNumber}, hasToken=${!!metaConfig.access_token}, phoneId=${metaConfig.phone_number_id}`);

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

      const usedTemplateName = templateName || "invoice_with_contact";

      const params = variables || {
        customer_name: customerName || "Customer",
        restaurant_name: restaurantName || "Restaurant",
        amount: amount || "-",
        order_date: billDate || new Date().toLocaleDateString("en-IN"),
        contact_number: contactNumber || "-",
      };

      // Meta Cloud API requires parameter_name for named template variables
      const bodyParams = Object.entries(params)
        .map(([key, val]: [string, any]) => ({
          type: "text",
          parameter_name: key,
          text: String(val || "-"),
        }));

      const components: any[] = bodyParams.length > 0
        ? [{ type: "body", parameters: bodyParams }]
        : [];

      if (billUrl || (buttons && buttons.length > 0)) {
        const urlValue = billUrl || buttons?.[0]?.value || "";
        if (urlValue) {
          components.push({
            type: "button",
            sub_type: "url",
            index: 0,
            parameters: [{ type: "text", text: String(urlValue) }],
          });
        }
      }

      // Clean phone number for Meta Cloud
      let cleanPhoneMeta = phoneNumber.replace(/[\+\-\s]/g, "");
      if (cleanPhoneMeta.length === 10) {
        cleanPhoneMeta = "91" + cleanPhoneMeta;
      }

      const metaPayload = {
        messaging_product: "whatsapp",
        to: cleanPhoneMeta,
        type: "template",
        template: {
          name: usedTemplateName,
          language: { code: "en" },
          components: components.length > 0 ? components : undefined,
        },
      };

      console.log("[meta] Sending payload:", JSON.stringify(metaPayload));

      const metaRes = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(metaPayload),
        }
      );

      const metaData = await metaRes.json();

      if (!metaRes.ok) {
        console.error("[meta] Error:", JSON.stringify(metaData));
        return new Response(
          JSON.stringify({ success: false, error: metaData.error?.message || "Meta API error", details: metaData }),
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

    const usedTemplate = templateName || "invoice_with_contact";
    const vars = variables || {};
    const components: Record<string, any> = {};

    // Build body components as structured objects (MSG91 requires type/value/parameter_name)
    if (Object.keys(vars).length > 0) {
      for (const [key, val] of Object.entries(vars)) {
        components[`body_${key}`] = {
          type: "text",
          value: String(val) || "-",
          parameter_name: key,
        };
      }
    } else {
      components.body_customer_name = {
        type: "text",
        value: customerName || "Customer",
        parameter_name: "customer_name",
      };
      components.body_restaurant_name = {
        type: "text",
        value: restaurantName || "Restaurant",
        parameter_name: "restaurant_name",
      };
      components.body_amount = {
        type: "text",
        value: amount || "0",
        parameter_name: "amount",
      };
      components.body_order_date = {
        type: "text",
        value: billDate || new Date().toLocaleDateString("en-IN"),
        parameter_name: "order_date",
      };
      components.body_contact_number = {
        type: "text",
        value: contactNumber || "-",
        parameter_name: "contact_number",
      };
    }

    // Ensure contact_number is always present
    if (!components.body_contact_number) {
      components.body_contact_number = {
        type: "text",
        value: contactNumber || "N/A",
        parameter_name: "contact_number",
      };
    }

    // Build button components as structured objects
    if (billUrl) {
      components.button_1 = {
        subtype: "url",
        type: "text",
        value: billUrl,
      };
    } else if (buttons && buttons.length > 0) {
      buttons.forEach((btn: any, idx: number) => {
        components[`button_${idx + 1}`] = {
          subtype: btn.type || "url",
          type: "text",
          value: btn.value || "",
        };
      });
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
          name: usedTemplate,
          language: {
            code: "en",
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
      console.error("[msg91] Error:", JSON.stringify(msg91Data));
      return new Response(
        JSON.stringify({ success: false, error: msg91Data?.msg || "MSG91 API error", details: msg91Data }),
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

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  checkRateLimit,
  createRateLimitResponse,
  RATE_LIMITS,
  getRequestIdentifier,
} from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Dynamic WhatsApp template sender.
 *
 * The caller sends:
 *   - phoneNumber:    recipient phone
 *   - templateName:   MSG91 template slug   (e.g. "invoice_with_contact", "welcome_offer")
 *   - variables:      key→value map of ONLY the variables that template uses
 *                     e.g. { "customer_name": "John", "amount": "₹500" }
 *   - buttons:        optional array of button params
 *                     e.g. [{ type: "url", value: "https://..." }]
 *
 * The function builds MSG91 components dynamically from whatever
 * variables are provided — no hardcoded param list.
 */

interface SendPayload {
  phoneNumber: string;
  templateName: string;
  variables?: Record<string, string>;   // named var → value
  buttons?: { type: string; value: string }[];
  // Legacy fields (backward compat with POS/QSR bill senders)
  customerName?: string;
  restaurantName?: string;
  amount?: string;
  billDate?: string;
  contactNumber?: string;
  billUrl?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
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
      console.error("Auth validation failed:", authError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized: Invalid or expired token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // ── Rate Limiting ────────────────────────────────────────────────────
    const identifier = getRequestIdentifier(req, authHeader);
    const rateLimitResult = checkRateLimit(identifier, RATE_LIMITS.WHATSAPP);
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    // ── Env ──────────────────────────────────────────────────────────────
    const MSG91_AUTH_KEY = Deno.env.get("MSG91_AUTH_KEY");
    const MSG91_INTEGRATED_NUMBER = Deno.env.get("MSG91_INTEGRATED_NUMBER") || "918329540398";
    if (!MSG91_AUTH_KEY) {
      throw new Error("Missing MSG91_AUTH_KEY in environment variables");
    }

    // ── Parse payload ────────────────────────────────────────────────────
    const payload = (await req.json()) as SendPayload;
    const {
      phoneNumber,
      templateName,
      variables: namedVars,
      buttons: buttonParams,
      // Legacy fields
      customerName,
      restaurantName,
      amount,
      billDate,
      contactNumber,
      billUrl,
    } = payload;

    if (!phoneNumber || !templateName) {
      throw new Error("Missing required fields: phoneNumber, templateName");
    }

    // Clean phone number
    let cleanPhone = phoneNumber.replace(/[\+\-\s]/g, "");
    if (cleanPhone.length === 10) {
      cleanPhone = "91" + cleanPhone;
    }

    console.log(`Sending template "${templateName}" to ${cleanPhone}`);

    // ── Build components dynamically ─────────────────────────────────────
    const components: Record<string, any> = {};

    // If caller sent the new `variables` map, use it directly
    if (namedVars && Object.keys(namedVars).length > 0) {
      for (const [varName, varValue] of Object.entries(namedVars)) {
        components[`body_${varName}`] = {
          type: "text",
          value: varValue,
          parameter_name: varName,
        };
      }
    } else {
      // Legacy mode: build from individual fields (POS/QSR bill senders)
      if (customerName) {
        components.body_customer_name = {
          type: "text",
          value: customerName,
          parameter_name: "customer_name",
        };
      }
      if (restaurantName) {
        components.body_restaurant_name = {
          type: "text",
          value: restaurantName,
          parameter_name: "restaurant_name",
        };
      }
      if (amount) {
        components.body_amount = {
          type: "text",
          value: amount,
          parameter_name: "amount",
        };
      }
      if (billDate) {
        components.body_order_date = {
          type: "text",
          value: billDate,
          parameter_name: "order_date",
        };
      }
      if (contactNumber) {
        components.body_contact_number = {
          type: "text",
          value: contactNumber,
          parameter_name: "contact_number",
        };
      }
    }

    // Buttons — new style array or legacy billUrl
    if (buttonParams && buttonParams.length > 0) {
      buttonParams.forEach((btn, idx) => {
        components[`button_${idx + 1}`] = {
          subtype: btn.type || "url",
          type: "text",
          value: btn.value,
        };
      });
    } else if (billUrl) {
      components.button_1 = {
        subtype: "url",
        type: "text",
        value: billUrl,
      };
    }

    console.log("Dynamic components:", JSON.stringify(components, null, 2));

    // ── MSG91 API call ───────────────────────────────────────────────────
    const msg91Payload = {
      integrated_number: MSG91_INTEGRATED_NUMBER,
      content_type: "template",
      payload: {
        messaging_product: "whatsapp",
        type: "template",
        template: {
          name: templateName,
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

    console.log("Full MSG91 payload:", JSON.stringify(msg91Payload, null, 2));

    const response = await fetch(
      "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          authkey: MSG91_AUTH_KEY,
          "content-type": "application/json",
        },
        body: JSON.stringify(msg91Payload),
      }
    );

    const rawText = await response.text();
    console.log("MSG91 response:", response.status, rawText);

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error(`MSG91 returned non-JSON: ${rawText}`);
    }

    if (!response.ok) {
      console.error("MSG91 API error:", data);
      throw new Error(
        `MSG91 API returned ${response.status}: ${JSON.stringify(data)}`
      );
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in send-msg91-whatsapp:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

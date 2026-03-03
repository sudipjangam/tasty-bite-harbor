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

interface Msg91WhatsAppPayload {
  phoneNumber: string;
  customerName?: string;
  restaurantName: string;
  templateName: string;
  amount: string;
  billDate: string;
  contactNumber?: string;
  billUrl?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── SECURITY: JWT Authentication ─────────────────────────────────────
    // Verify that the caller has a valid Supabase session.
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

    console.log(`Authenticated user: ${user.id}`);

    // ── SECURITY: Rate Limiting ──────────────────────────────────────────
    const identifier = getRequestIdentifier(req, authHeader);
    const rateLimitResult = checkRateLimit(identifier, RATE_LIMITS.WHATSAPP);

    if (!rateLimitResult.allowed) {
      console.log(`MSG91 rate limit exceeded for ${identifier}`);
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    // ── Business Logic ───────────────────────────────────────────────────
    const MSG91_AUTH_KEY = Deno.env.get("MSG91_AUTH_KEY");
    const MSG91_INTEGRATED_NUMBER = Deno.env.get("MSG91_INTEGRATED_NUMBER") || "918329540398";

    if (!MSG91_AUTH_KEY) {
      throw new Error("Missing MSG91_AUTH_KEY in environment variables");
    }

    const {
      phoneNumber,
      customerName = "Guest",
      restaurantName,
      templateName,
      amount,
      billDate,
      contactNumber,
      billUrl,
    } = (await req.json()) as Msg91WhatsAppPayload;

    if (!phoneNumber || !templateName) {
      throw new Error("Missing required payload fields: phoneNumber or templateName");
    }

    console.log(`Sending MSG91 WhatsApp to ${phoneNumber} using template: ${templateName}`);

    // Clean phone number (remove +, spaces, dashes) and ensure country code
    let cleanPhone = phoneNumber.replace(/[\+\-\s]/g, "");
    // Auto-prepend India country code if the number is 10 digits
    if (cleanPhone.length === 10) {
      cleanPhone = "91" + cleanPhone;
    }

    console.log(`Cleaned phone number for MSG91: ${cleanPhone}`);

    // Build components based on the template variables
    const components: Record<string, any> = {};

    // Body variables — using named parameters as required by MSG91
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

    // Add the URL button component if the bill URL was provided
    if (billUrl) {
      components.button_1 = {
        subtype: "url",
        type: "text",
        value: billUrl,
      };
    }

    // MSG91 API Payload matching the new invoice_with_contact template
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
    console.log("MSG91 raw response status:", response.status, "body:", rawText);
    
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

    console.log("MSG91 message sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in send-msg91-whatsapp function:", error);
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

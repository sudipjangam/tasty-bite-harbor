import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TemplatePayload {
  templateName: string;
  language: string;
  category: string;
  bodyText: string;
  headerText?: string;
  footerText?: string;
  variables: { position: number; name: string; sample: string }[];
  buttons?: any[];
}

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

    const {
      templateName,
      language = "en",
      category = "UTILITY",
      bodyText,
      headerText,
      footerText,
      variables = [],
      buttons = [],
    } = (await req.json()) as TemplatePayload;

    if (!templateName || !bodyText) {
      throw new Error("Missing required fields: templateName, bodyText");
    }

    // Build MSG91 components array
    const components: any[] = [];

    // Header (optional)
    if (headerText) {
      components.push({
        type: "HEADER",
        format: "TEXT",
        text: headerText,
        example: {
          header_text: [headerText],
        },
      });
    }

    // Body (required)
    const bodyComponent: any = {
      type: "BODY",
      text: bodyText,
    };

    // Add variable samples if present
    if (variables.length > 0) {
      bodyComponent.example = {
        body_text: [variables.map((v) => v.sample)],
      };
    }
    components.push(bodyComponent);

    // Footer (optional)
    if (footerText) {
      components.push({
        type: "FOOTER",
        text: footerText,
      });
    }

    // Buttons (optional)
    if (buttons.length > 0) {
      components.push({
        type: "BUTTONS",
        buttons: buttons,
      });
    }

    // MSG91 Create Template payload
    const msg91Payload = {
      integrated_number: MSG91_INTEGRATED_NUMBER,
      template_name: templateName,
      language: language,
      category: category,
      components: components,
    };

    console.log("Creating MSG91 template:", JSON.stringify(msg91Payload, null, 2));

    const response = await fetch(
      "https://api.msg91.com/api/v5/whatsapp/client-panel-template/",
      {
        method: "POST",
        headers: {
          authkey: MSG91_AUTH_KEY,
          "content-type": "application/json",
        },
        body: JSON.stringify(msg91Payload),
      }
    );

    const rawText = await response.text();
    console.log("MSG91 template response:", response.status, rawText);

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error(`MSG91 returned non-JSON: ${rawText}`);
    }

    if (!response.ok) {
      console.error("MSG91 template error:", data);
      return new Response(
        JSON.stringify({ success: false, error: data, status: response.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log("MSG91 template created:", data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in create-msg91-template:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

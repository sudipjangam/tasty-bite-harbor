import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Msg91WhatsAppPayload {
  phoneNumber: string;
  pdfUrl: string;
  customerName?: string;
  restaurantName: string;
  templateName: string;
  orderDetailsUrl?: string; // Optional URL for the "View Order" button
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const MSG91_AUTH_KEY = Deno.env.get("MSG91_AUTH_KEY");
    const MSG91_INTEGRATED_NUMBER = Deno.env.get("MSG91_INTEGRATED_NUMBER");

    if (!MSG91_AUTH_KEY || !MSG91_INTEGRATED_NUMBER) {
      throw new Error("Missing MSG91 credentials in environment variables");
    }

    const {
      phoneNumber,
      pdfUrl,
      customerName = "Guest",
      restaurantName,
      templateName,
      orderDetailsUrl,
    } = (await req.json()) as Msg91WhatsAppPayload;

    if (!phoneNumber || !pdfUrl || !templateName) {
      throw new Error("Missing required payload fields: phoneNumber, pdfUrl, or templateName");
    }

    console.log(`Sending MSG91 WhatsApp to ${phoneNumber} with PDF: ${pdfUrl}`);

    // Clean phone number (remove +, spaces, dashes) and ensure country code
    let cleanPhone = phoneNumber.replace(/[\+\-\s]/g, "");
    // Auto-prepend India country code if the number is 10 digits
    if (cleanPhone.length === 10) {
      cleanPhone = "91" + cleanPhone;
    }

    console.log(`Cleaned phone number for MSG91: ${cleanPhone}`);

    // MSG91 API Payload based on documentation
    const msg91Payload = {
      integrated_number: MSG91_INTEGRATED_NUMBER,
      content_type: "template",
      payload: {
        type: "template",
        template: {
          name: templateName,
          language: {
            code: "en",
            policy: "deterministic",
          },
          to_and_components: [
            {
              to: [cleanPhone],
              components: {
                // Header component expects the document URL
                header_1: {
                  type: "document",
                  value: pdfUrl,
                },
                // Standard MSG91 v5 API maps body_1 to the first variable, body_2 to the second
                body_1: {
                  type: "text",
                  value: customerName,
                },
                body_2: {
                  type: "text",
                  value: restaurantName,
                },
                // Add the URL button component if the URL was provided
                ...(orderDetailsUrl && {
                  button_1: {
                    type: "button",
                    sub_type: "url",
                    index: "0",
                    parameters: [
                      {
                        type: "text",
                        text: orderDetailsUrl,
                      },
                    ],
                  },
                }),
              },
            },
          ],
        },
        messaging_product: "whatsapp",
      },
    };

    console.log("Full MSG91 payload:", JSON.stringify(msg91Payload, null, 2));

    const response = await fetch(
      "https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
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

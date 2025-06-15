
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppBillRequest {
  billingId: string;
  phoneNumber: string;
  restaurantName: string;
  customerName: string;
  total: number;
  roomName: string;
  checkoutDate: string;
}

async function sendWhatsAppMessage(to: string, message: string) {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_WHATSAPP_FROM");

  console.log("Twilio Environment Check:", {
    accountSid: accountSid ? "✓ Present" : "✗ Missing",
    authToken: authToken ? "✓ Present" : "✗ Missing", 
    fromNumber: fromNumber ? `✓ Present: ${fromNumber}` : "✗ Missing"
  });

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error("Missing Twilio credentials");
  }

  // Format phone numbers for WhatsApp
  let cleanToNumber = to.trim().replace(/\s+/g, '');
  
  // Add country code if missing
  if (!cleanToNumber.startsWith('+')) {
    cleanToNumber = '+91' + cleanToNumber;
  }

  // Format for WhatsApp - Twilio sandbox uses whatsapp: prefix
  const whatsappFrom = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`;
  const whatsappTo = `whatsapp:${cleanToNumber}`;

  console.log("WhatsApp Message Details:", {
    from: whatsappFrom,
    to: whatsappTo,
    originalTo: to,
    messageLength: message.length
  });

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = btoa(`${accountSid}:${authToken}`);

  const formData = new URLSearchParams();
  formData.append('From', whatsappFrom);
  formData.append('To', whatsappTo);
  formData.append('Body', message);

  console.log("Sending to Twilio API...");

  try {
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const responseText = await response.text();
    
    console.log("Twilio Response:", {
      status: response.status,
      statusText: response.statusText,
      body: responseText
    });

    if (!response.ok) {
      throw new Error(`Twilio API error (${response.status}): ${responseText}`);
    }

    const result = JSON.parse(responseText);
    console.log("Message sent successfully:", {
      sid: result.sid,
      status: result.status,
      to: result.to,
      from: result.from
    });

    return result;
  } catch (error) {
    console.error("Twilio API call failed:", error);
    throw error;
  }
}

serve(async (req) => {
  console.log(`${req.method} request received at ${new Date().toISOString()}`);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    const requestBody = await req.json() as WhatsAppBillRequest;
    const { billingId, phoneNumber, restaurantName, customerName, total, roomName, checkoutDate } = requestBody;
    
    console.log("Processing WhatsApp bill request:", {
      billingId,
      phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 3)}***` : 'Missing',
      restaurantName,
      customerName,
      total,
      roomName,
      checkoutDate
    });
    
    // Validate required fields
    if (!billingId || !phoneNumber) {
      console.error("Missing required fields:", { billingId: !!billingId, phoneNumber: !!phoneNumber });
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Missing required parameters: billingId and phoneNumber are required' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 400 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create bill message
    const formattedAmount = total ? 
      new Intl.NumberFormat('en-IN', { 
        style: 'currency', 
        currency: 'INR' 
      }).format(total) : 
      "Amount not specified";

    const billMessage = `🏨 *${restaurantName || "Hotel"}*

Dear ${customerName || "Valued Guest"},

Thank you for staying with us! Here's your bill summary:

🏠 *Room:* ${roomName || "N/A"}
📅 *Checkout:* ${checkoutDate || "N/A"}  
💰 *Total Amount:* ${formattedAmount}

We hope you had a wonderful stay and look forward to welcoming you again soon!

Best regards,
${restaurantName || "Hotel"} Team`;

    console.log("Bill message prepared. Character count:", billMessage.length);

    // Send WhatsApp message
    let sendResult = null;
    let sendStatus = 'failed';
    let errorMessage = null;

    try {
      sendResult = await sendWhatsAppMessage(phoneNumber, billMessage);
      sendStatus = 'sent';
      console.log("✅ WhatsApp message sent successfully! SID:", sendResult.sid);
    } catch (error) {
      console.error("❌ Failed to send WhatsApp message:", error);
      errorMessage = error.message;
      sendStatus = 'failed';
    }

    // Update billing record
    try {
      const { error: updateError } = await supabase
        .from('room_billings')
        .update({ 
          whatsapp_sent: sendStatus === 'sent',
          updated_at: new Date().toISOString()
        })
        .eq('id', billingId);

      if (updateError) {
        console.error("Failed to update billing record:", updateError);
      } else {
        console.log("✅ Billing record updated successfully");
      }
    } catch (dbError) {
      console.error("Database error:", dbError);
    }

    // Return response
    const response = {
      success: sendStatus === 'sent',
      status: sendStatus,
      message: sendStatus === 'sent' 
        ? `✅ Bill sent successfully via WhatsApp to ${phoneNumber}` 
        : `❌ Failed to send bill: ${errorMessage}`,
      billingId,
      twilioResponse: sendResult,
      error: errorMessage
    };

    console.log("Request completed:", { 
      success: response.success, 
      status: sendStatus,
      phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 3)}***` : 'Missing'
    });

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: sendStatus === 'sent' ? 200 : 500
      }
    );

  } catch (error) {
    console.error("❌ Unexpected error in send-whatsapp-bill function:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: "Internal server error",
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});


import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create a Supabase client with the Admin key
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface SendWhatsAppRequest {
  phone: string;
  message: string;
  billingId?: string;
  promotionId?: string;
  recipientId?: string;
  recipientType?: string;
  restaurantId?: string;
}

async function sendWhatsAppViaTwilio(to: string, message: string) {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_WHATSAPP_FROM");

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error("Missing Twilio credentials. Please configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM in Supabase secrets.");
  }

  // Format phone number for WhatsApp
  const formattedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  
  const body = new URLSearchParams({
    From: fromNumber,
    To: formattedTo,
    Body: message,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twilio API error: ${response.status} ${errorText}`);
  }

  return await response.json();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone, message, billingId, promotionId, recipientId, recipientType, restaurantId } = await req.json() as SendWhatsAppRequest;
    
    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: "Phone number and message are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log the data we received
    console.log(`Sending WhatsApp message to ${phone}`);
    console.log(`Message content: ${message}`);
    console.log(`Additional parameters: billingId=${billingId}, promotionId=${promotionId}, recipientId=${recipientId}, recipientType=${recipientType}, restaurantId=${restaurantId}`);
    
    // Format phone number for WhatsApp (ensure it has country code)
    let formattedPhone = phone.replace(/\s+/g, '');
    if (!formattedPhone.startsWith('+')) {
      // Assume Indian number if no country code
      formattedPhone = '+91' + formattedPhone;
    }
    
    console.log(`Formatted phone for WhatsApp: ${formattedPhone}`);
    
    let sendStatus = 'sent';
    let errorDetails = null;
    let twilioResponse = null;
    
    try {
      // Send actual WhatsApp message via Twilio
      twilioResponse = await sendWhatsAppViaTwilio(formattedPhone, message);
      console.log("Twilio response:", twilioResponse);
      sendStatus = 'sent';
    } catch (twilioError) {
      console.error("Twilio error:", twilioError);
      errorDetails = twilioError.message;
      sendStatus = 'error';
    }
    
    // Update database records based on what type of message was sent
    try {
      if (billingId) {
        // Update room billing record
        const { error } = await supabase
          .from('room_billings')
          .update({ whatsapp_sent: true })
          .eq('id', billingId);
          
        if (error) {
          console.error("Error updating billing record:", error);
          if (!errorDetails) {
            errorDetails = error.message;
            sendStatus = 'error';
          }
        } else {
          console.log(`Successfully marked billing ${billingId} as sent via WhatsApp`);
        }
      }
      
      if (promotionId && recipientId) {
        // Record that a promotion was sent
        let restaurantId = null;
        
        // Get restaurant_id from promotion
        if (promotionId) {
          const { data: promotionData, error: promotionError } = await supabase
            .from('promotion_campaigns')
            .select('restaurant_id')
            .eq('id', promotionId)
            .single();
            
          if (promotionError) {
            console.error("Error getting promotion data:", promotionError);
          } else if (promotionData) {
            restaurantId = promotionData.restaurant_id;
          }
        }
        
        const { error } = await supabase
          .from('sent_promotions')
          .insert({
            promotion_id: promotionId,
            reservation_id: recipientType === 'reservation' ? recipientId : null,
            customer_phone: phone,
            sent_status: sendStatus,
            sent_method: 'whatsapp',
            restaurant_id: restaurantId,
            customer_name: "Guest"
          });
          
        if (error) {
          console.error("Error recording sent promotion:", error);
          if (!errorDetails) {
            errorDetails = error.message;
            sendStatus = 'error';
          }
        } else {
          console.log(`Successfully recorded sent promotion ${promotionId} to ${recipientId}`);
        }
      }
    } catch (dbError) {
      console.error("Database error:", dbError);
      if (!errorDetails) {
        errorDetails = dbError.message;
        sendStatus = 'error';
      }
    }
    
    // Return success response
    return new Response(
      JSON.stringify({ 
        success: sendStatus === 'sent', 
        phone: formattedPhone, 
        status: sendStatus,
        error: errorDetails,
        twilioResponse: twilioResponse
      }),
      {
        status: sendStatus === 'sent' ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
    
  } catch (error) {
    console.error("Error processing request:", error);
    
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

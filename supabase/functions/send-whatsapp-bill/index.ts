
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    const { billingId, phoneNumber, restaurantName, customerName, total, roomName, checkoutDate } = await req.json();
    
    if (!billingId || !phoneNumber) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Format phone number for WhatsApp (ensure it has country code)
    let formattedPhone = phoneNumber.replace(/\s+/g, '');
    if (!formattedPhone.startsWith('+')) {
      // Assume Indian number if no country code
      formattedPhone = '+91' + formattedPhone;
    }
    
    console.log(`Formatted phone for WhatsApp: ${formattedPhone}`);

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Construct a message that would be suitable for WhatsApp Business API template
    const formattedTotal = total ? total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : "N/A";
    const billMessage = `Dear ${customerName || "Guest"},\n\nThank you for staying at ${restaurantName}!\n\nBill Details:\n- Room: ${roomName || "N/A"}\n- Checkout: ${checkoutDate || "N/A"}\n- Total Amount: ${formattedTotal}\n\nWe hope you enjoyed your stay and look forward to serving you again soon.\n\nBest regards,\n${restaurantName} Team`;

    console.log(`Bill message to be sent:\n${billMessage}`);
    
    let sendStatus = 'sent';
    let errorDetails = null;
    let twilioResponse = null;
    
    try {
      // Send actual WhatsApp message via Twilio
      twilioResponse = await sendWhatsAppViaTwilio(formattedPhone, billMessage);
      console.log("Twilio response:", twilioResponse);
      sendStatus = 'sent';
    } catch (twilioError) {
      console.error("Twilio error:", twilioError);
      errorDetails = twilioError.message;
      sendStatus = 'error';
    }

    // Update the billing record to mark WhatsApp as sent
    const { error: updateError } = await supabase
      .from('room_billings')
      .update({ whatsapp_sent: sendStatus === 'sent' })
      .eq('id', billingId);

    if (updateError) {
      console.error("Error updating billing record:", updateError);
      if (!errorDetails) {
        errorDetails = updateError.message;
        sendStatus = 'error';
      }
    }

    // Get all the room_billings info to include in the response
    const { data: billingData, error: billingError } = await supabase
      .from('room_billings')
      .select('*')
      .eq('id', billingId)
      .single();
      
    if (billingError) {
      console.warn("Could not fetch billing details:", billingError);
    }

    const response = {
      success: sendStatus === 'sent',
      message: sendStatus === 'sent' 
        ? `WhatsApp bill successfully sent to ${formattedPhone}` 
        : `Failed to send WhatsApp bill: ${errorDetails}`,
      status: sendStatus,
      billingId,
      billingDetails: billingData || null,
      sentMessage: billMessage,
      twilioResponse: twilioResponse,
      error: errorDetails
    };

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: sendStatus === 'sent' ? 200 : 500
      }
    );
  } catch (error) {
    console.error("Error sending WhatsApp bill:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || "An error occurred while sending the WhatsApp bill" 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

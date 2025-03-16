
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
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone, message, billingId, promotionId, recipientId, recipientType } = await req.json() as SendWhatsAppRequest;
    
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
    console.log(`Additional parameters: billingId=${billingId}, promotionId=${promotionId}, recipientId=${recipientId}, recipientType=${recipientType}`);
    
    // In a real implementation, you would integrate with WhatsApp Business API
    // or a third-party service like Twilio, MessageBird, etc.
    // For now, this is a mock implementation for demonstration
    
    console.log(`Would send WhatsApp message to ${phone}: ${message}`);
    
    let sendStatus = 'sent';
    let errorDetails = null;
    
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
          errorDetails = error.message;
        }
      }
      
      if (promotionId && recipientId) {
        // Record that a promotion was sent
        const { error } = await supabase
          .from('sent_promotions')
          .insert({
            promotion_id: promotionId,
            reservation_id: recipientType === 'reservation' ? recipientId : null,
            customer_phone: phone,
            sent_status: 'sent',
            sent_method: 'whatsapp',
            restaurant_id: (await supabase.from('promotion_campaigns').select('restaurant_id').eq('id', promotionId).single()).data?.restaurant_id
          });
          
        if (error) {
          console.error("Error recording sent promotion:", error);
          errorDetails = error.message;
          sendStatus = 'error';
        }
      }
    } catch (dbError) {
      console.error("Database error:", dbError);
      errorDetails = dbError.message;
      sendStatus = 'error';
    }
    
    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        phone, 
        status: sendStatus,
        error: errorDetails
      }),
      {
        status: 200,
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

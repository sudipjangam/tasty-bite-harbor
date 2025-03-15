
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
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone, message, billingId } = await req.json() as SendWhatsAppRequest;
    
    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: "Phone number and message are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Note: In a real production environment, you would integrate with an actual WhatsApp API
    // such as Twilio, MessageBird, or Meta's WhatsApp Business API
    // This is a mock implementation for demonstration purposes
    
    console.log(`Would send WhatsApp message to ${phone}: ${message}`);
    
    // Mock successful sending
    // In a real implementation, you would await the API call to WhatsApp service
    
    // If billing ID was provided, update the sent status in the database
    if (billingId) {
      const { error } = await supabase
        .from('room_billings')
        .update({ whatsapp_sent: true })
        .eq('id', billingId);
        
      if (error) {
        console.error("Error updating billing record:", error);
      }
    }
    
    // Return success response
    return new Response(
      JSON.stringify({ success: true, phone, message }),
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

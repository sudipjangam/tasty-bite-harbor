
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    
    if (!billingId || !phoneNumber || !total) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // For now, this is a mock implementation
    // In a real implementation, you would integrate with WhatsApp API
    console.log(`Sending WhatsApp bill to ${phoneNumber} for ${customerName}`);
    console.log(`Bill details: Room ${roomName}, Total: ${total}, Checkout: ${checkoutDate}`);

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update the billing record to mark WhatsApp as sent
    const { error: updateError } = await supabase
      .from('room_billings')
      .update({ whatsapp_sent: true })
      .eq('id', billingId);

    if (updateError) {
      throw updateError;
    }

    const mockResponse = {
      success: true,
      message: `WhatsApp bill successfully sent to ${phoneNumber}`,
      status: "sent",
      billingId
    };

    return new Response(
      JSON.stringify(mockResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error sending WhatsApp bill:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "An error occurred while sending the WhatsApp bill" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

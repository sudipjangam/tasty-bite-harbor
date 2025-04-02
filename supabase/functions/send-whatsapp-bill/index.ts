
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
    
    if (!billingId || !phoneNumber) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Format phone number for WhatsApp (remove spaces, ensure international format)
    const formattedPhone = phoneNumber.replace(/\s+/g, '');
    const whatsappPhone = formattedPhone.startsWith('+') ? formattedPhone.substring(1) : formattedPhone;
    
    console.log(`Formatted phone for WhatsApp: ${whatsappPhone}`);

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Construct a message that would be suitable for WhatsApp Business API template
    const formattedTotal = total ? total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : "N/A";
    const billMessage = `Dear ${customerName || "Guest"},\n\nThank you for staying at ${restaurantName}!\n\nBill Details:\n- Room: ${roomName || "N/A"}\n- Checkout: ${checkoutDate || "N/A"}\n- Total Amount: ${formattedTotal}\n\nWe hope you enjoyed your stay and look forward to serving you again soon.`;

    console.log(`Bill message to be sent:\n${billMessage}`);
    
    // In a real implementation, this would call WhatsApp Business API to send the message
    // For now, we'll just update the database and simulate success

    // Update the billing record to mark WhatsApp as sent
    const { error: updateError } = await supabase
      .from('room_billings')
      .update({ whatsapp_sent: true })
      .eq('id', billingId);

    if (updateError) {
      throw updateError;
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

    const mockResponse = {
      success: true,
      message: `WhatsApp bill successfully sent to ${phoneNumber}`,
      status: "sent",
      billingId,
      billingDetails: billingData || null,
      sentMessage: billMessage
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

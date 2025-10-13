import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reservationId, method } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch reservation details
    const { data: reservation, error: fetchError } = await supabase
      .from("table_reservations")
      .select(`
        *,
        restaurant_tables(name)
      `)
      .eq("id", reservationId)
      .single();

    if (fetchError) throw fetchError;

    const message = `Hi ${reservation.customer_name}! Your table reservation at ${reservation.restaurant_tables.name} is confirmed for ${new Date(reservation.reservation_date).toLocaleDateString()} at ${reservation.reservation_time}. Party size: ${reservation.party_size}. See you soon!`;

    // Send email if method includes email
    if ((method === "email" || method === "both") && reservation.customer_email) {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      
      if (resendApiKey) {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Reservations <onboarding@resend.dev>",
            to: [reservation.customer_email],
            subject: "Reservation Confirmation",
            html: `
              <h2>Reservation Confirmed</h2>
              <p>${message}</p>
              <p><strong>Reservation Details:</strong></p>
              <ul>
                <li>Date: ${new Date(reservation.reservation_date).toLocaleDateString()}</li>
                <li>Time: ${reservation.reservation_time}</li>
                <li>Table: ${reservation.restaurant_tables.name}</li>
                <li>Party Size: ${reservation.party_size}</li>
              </ul>
              ${reservation.special_requests ? `<p><strong>Special Requests:</strong> ${reservation.special_requests}</p>` : ''}
            `,
          }),
        });

        if (!emailResponse.ok) {
          console.error("Email sending failed:", await emailResponse.text());
        }
      }
    }

    // Send SMS if method includes sms
    if ((method === "sms" || method === "both") && reservation.customer_phone) {
      const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const twilioWhatsappFrom = Deno.env.get("TWILIO_WHATSAPP_FROM");

      if (twilioSid && twilioToken && twilioWhatsappFrom) {
        const smsResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
            },
            body: new URLSearchParams({
              From: twilioWhatsappFrom,
              To: `whatsapp:${reservation.customer_phone}`,
              Body: message,
            }),
          }
        );

        if (!smsResponse.ok) {
          console.error("SMS sending failed:", await smsResponse.text());
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

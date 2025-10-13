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
    const { reservationId } = await req.json();

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

    const message = `Reminder: You have a reservation today at ${reservation.reservation_time} for ${reservation.party_size} ${reservation.party_size === 1 ? 'person' : 'people'}. We look forward to seeing you!`;

    // Send email reminder
    if (reservation.customer_email) {
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
            subject: "Reservation Reminder",
            html: `
              <h2>Reservation Reminder</h2>
              <p>Hi ${reservation.customer_name},</p>
              <p>${message}</p>
              <p><strong>Reservation Details:</strong></p>
              <ul>
                <li>Date: ${new Date(reservation.reservation_date).toLocaleDateString()}</li>
                <li>Time: ${reservation.reservation_time}</li>
                <li>Table: ${reservation.restaurant_tables.name}</li>
                <li>Party Size: ${reservation.party_size}</li>
              </ul>
            `,
          }),
        });

        if (!emailResponse.ok) {
          console.error("Email sending failed:", await emailResponse.text());
        }
      }
    }

    // Send SMS reminder
    if (reservation.customer_phone) {
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import {
  checkRateLimit,
  createRateLimitResponse,
  getRequestIdentifier,
} from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Strict rate limit for public inquiry endpoint to prevent abuse
const INQUIRY_RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 60 * 60 * 1000, // 5 per hour per IP
  keyPrefix: "inquiry",
};

const INQUIRY_RECIPIENT = "swadeshisolutionss@gmail.com";

interface InquiryRequest {
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
  businessName: string;
  businessType: string;
}

function generateInquiryHTML(data: InquiryRequest): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f7fafc;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">New Account Inquiry</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0;">Swadeshi Solutions - RMS Pro</p>
  </div>
  <div style="background: white; padding: 35px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
    <h2 style="color: #2d3748; margin: 0 0 20px 0; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Contact Details</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 12px 8px; color: #718096; font-weight: 600; width: 140px; vertical-align: top;">First Name</td>
        <td style="padding: 12px 8px; color: #2d3748;">${data.firstName}</td>
      </tr>
      <tr style="background: #f7fafc;">
        <td style="padding: 12px 8px; color: #718096; font-weight: 600; vertical-align: top;">Last Name</td>
        <td style="padding: 12px 8px; color: #2d3748;">${data.lastName}</td>
      </tr>
      <tr>
        <td style="padding: 12px 8px; color: #718096; font-weight: 600; vertical-align: top;">Mobile Number</td>
        <td style="padding: 12px 8px; color: #2d3748;">${data.mobile}</td>
      </tr>
      <tr style="background: #f7fafc;">
        <td style="padding: 12px 8px; color: #718096; font-weight: 600; vertical-align: top;">Email ID</td>
        <td style="padding: 12px 8px; color: #2d3748;"><a href="mailto:${data.email}" style="color: #667eea; text-decoration: none;">${data.email}</a></td>
      </tr>
      <tr>
        <td style="padding: 12px 8px; color: #718096; font-weight: 600; vertical-align: top;">Business Name</td>
        <td style="padding: 12px 8px; color: #2d3748; font-weight: 600;">${data.businessName}</td>
      </tr>
      <tr style="background: #f7fafc;">
        <td style="padding: 12px 8px; color: #718096; font-weight: 600; vertical-align: top;">Business Type</td>
        <td style="padding: 12px 8px; color: #2d3748;">${data.businessType}</td>
      </tr>
    </table>
    <div style="margin-top: 24px; padding: 16px; background: #f0f5ff; border-radius: 8px; border-left: 4px solid #667eea;">
      <p style="margin: 0; color: #4a5568; font-size: 14px;">This inquiry was submitted via the Swadeshi Solutions account creation page on ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}.</p>
    </div>
  </div>
  <div style="text-align: center; padding: 20px;">
    <p style="color: #a0aec0; font-size: 12px;">© ${new Date().getFullYear()} Swadeshi Solutions</p>
  </div>
</body>
</html>`;
}

// Send email via Gmail SMTP
async function sendEmailViaSMTP(
  to: string,
  subject: string,
  htmlContent: string,
  fromName: string
): Promise<{ success: boolean; error?: string }> {
  const smtpUser = Deno.env.get("SMTP_USER") || Deno.env.get("GMAIL_USER");
  const smtpPass = Deno.env.get("SMTP_PASS") || Deno.env.get("GMAIL_APP_PASSWORD");
  const smtpHost = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
  const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");

  if (!smtpUser || !smtpPass) {
    return { success: false, error: "SMTP credentials not configured" };
  }

  try {
    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: true,
        auth: {
          username: smtpUser,
          password: smtpPass,
        },
      },
    });

    await client.send({
      from: `${fromName} <${smtpUser}>`,
      to: to,
      subject: subject,
      html: htmlContent.replace(/\r?\n/g, '\r\n'),
    });

    await client.close();
    console.log("Inquiry email sent via SMTP");
    return { success: true };
  } catch (error) {
    console.error("SMTP error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Send email via Resend API
async function sendEmailViaResend(
  to: string,
  subject: string,
  htmlContent: string,
  fromName: string
): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!resendApiKey) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromName} <onboarding@resend.dev>`,
        to: [to],
        subject: subject,
        html: htmlContent,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", result);
      return {
        success: false,
        error: result.message || "Failed to send email",
      };
    }

    console.log("Inquiry email sent via Resend:", result);
    return { success: true };
  } catch (error) {
    console.error("Resend error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

serve(async (req: Request) => {
  console.log(
    `${req.method} request to send-inquiry at ${new Date().toISOString()}`
  );

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      }
    );
  }

  // Rate limit by IP since this is a public endpoint
  const identifier = getRequestIdentifier(req);
  const rateLimitResult = checkRateLimit(identifier, INQUIRY_RATE_LIMIT);

  if (!rateLimitResult.allowed) {
    console.log(`Inquiry rate limit exceeded for ${identifier}`);
    return createRateLimitResponse(rateLimitResult, corsHeaders);
  }

  try {
    const body = (await req.json()) as InquiryRequest;

    // Validate required fields
    const required: (keyof InquiryRequest)[] = [
      "firstName",
      "lastName",
      "mobile",
      "email",
      "businessName",
      "businessType",
    ];
    for (const field of required) {
      if (!body[field] || typeof body[field] !== "string" || !body[field].trim()) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Missing required field: ${field}`,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email format" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const subject = `New Account Inquiry from ${body.businessName}`;
    const htmlContent = generateInquiryHTML(body);

    // Try SMTP first, then Resend
    const smtpUser = Deno.env.get("SMTP_USER") || Deno.env.get("GMAIL_USER");
    const smtpPass = Deno.env.get("SMTP_PASS") || Deno.env.get("GMAIL_APP_PASSWORD");

    let result: { success: boolean; error?: string };

    if (smtpUser && smtpPass) {
      result = await sendEmailViaSMTP(
        INQUIRY_RECIPIENT,
        subject,
        htmlContent,
        "Swadeshi Solutions"
      );
      if (!result.success) {
        console.warn("SMTP failed, trying Resend:", result.error);
        result = await sendEmailViaResend(
          INQUIRY_RECIPIENT,
          subject,
          htmlContent,
          "Swadeshi Solutions"
        );
      }
    } else {
      result = await sendEmailViaResend(
        INQUIRY_RECIPIENT,
        subject,
        htmlContent,
        "Swadeshi Solutions"
      );
    }

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || "Failed to send inquiry email",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    console.log(`Inquiry email sent to ${INQUIRY_RECIPIENT} for ${body.businessName}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Inquiry submitted successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-inquiry function:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

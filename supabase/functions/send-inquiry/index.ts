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

const INQUIRY_RECIPIENT = "inquiry@swadeshisolutions.co.in";

interface InquiryRequest {
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
  businessName: string;
  businessType: string;
}

function generateInquiryHTML(data: InquiryRequest): string {
  const SITE_URL = "https://swadeshisolutions.co.in";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Account Inquiry - Swadeshi Solutions</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px 10px; background-color: #f4f6fb; color: #334155;">

  <div style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(46, 49, 146, 0.08); border: 1px solid #e2e8f0;">
    
    <div style="height: 6px; background: linear-gradient(90deg, #2E3192 0%, #4a4fcc 50%, #F26722 100%);"></div>

    <div style="padding: 32px 32px 24px 32px; text-align: center; background-color: #ffffff; border-bottom: 1px solid #f1f5f9;">
      <a href="${SITE_URL}" target="_blank" style="text-decoration: none;">
        <img src="${SITE_URL}/swadeshi-logo2.png" alt="Swadeshi Solutions Logo" width="80" height="80" style="display: block; width: 80px; height: 80px; object-fit: contain; margin: 0 auto 12px auto;" />
      </a>
      <h1 style="margin: 0; font-size: 26px; font-weight: 800;">
        <span style="color: #2E3192;">Swadeshi</span><span style="color: #F26722; margin-left: 6px;">Solutions</span>
      </h1>
      <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase;">
        RMS Pro &bull; New Account Inquiry Notification
      </p>
    </div>

    <div style="padding: 36px 32px; background-color: #ffffff;">
      <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0 0 20px 0; border-bottom: 2px solid #2E3192; padding-bottom: 8px;">
        Inquiry Details
      </h2>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="padding: 12px 10px; color: #64748b; font-weight: 600; width: 140px; border-bottom: 1px solid #f1f5f9;">First Name</td>
          <td style="padding: 12px 10px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${data.firstName}</td>
        </tr>
        <tr>
          <td style="padding: 12px 10px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Last Name</td>
          <td style="padding: 12px 10px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${data.lastName}</td>
        </tr>
        <tr>
          <td style="padding: 12px 10px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Mobile Number</td>
          <td style="padding: 12px 10px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #f1f5f9;">
            <a href="tel:${data.mobile}" style="color: #2E3192; text-decoration: none;">${data.mobile}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 10px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Email Address</td>
          <td style="padding: 12px 10px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #f1f5f9;">
            <a href="mailto:${data.email}" style="color: #F26722; text-decoration: none;">${data.email}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 10px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Business Name</td>
          <td style="padding: 12px 10px; color: #2E3192; font-weight: 700; border-bottom: 1px solid #f1f5f9;">${data.businessName}</td>
        </tr>
        <tr>
          <td style="padding: 12px 10px; color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Business Type</td>
          <td style="padding: 12px 10px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${data.businessType}</td>
        </tr>
      </table>

      <div style="padding: 14px 18px; background-color: #f8fafc; border-radius: 10px; border-left: 4px solid #2E3192;">
        <p style="margin: 0; color: #475569; font-size: 13px; line-height: 1.5;">
          Submitted via Swadeshi Solutions Registration Portal on <strong>${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</strong>.
        </p>
      </div>

      <div style="margin-top: 36px; padding-top: 24px; border-top: 1px solid #f1f5f9;">
        <p style="margin: 0 0 4px 0; color: #475569; font-size: 14px;">Automated Notification,</p>
        <p style="margin: 0 0 2px 0; color: #2E3192; font-size: 15px; font-weight: 700;">Swadeshi Solutions System</p>
        <p style="margin: 0; color: #64748b; font-size: 12px;">RMS Pro Platform &bull; <a href="mailto:inquiry@swadeshisolutions.co.in" style="color: #F26722; text-decoration: none;">inquiry@swadeshisolutions.co.in</a></p>
      </div>
    </div>

    <div style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
      <p style="margin: 0; color: #94a3b8; font-size: 12px;">
        &copy; ${new Date().getFullYear()} Swadeshi Solutions. All rights reserved.
      </p>
    </div>

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
  const smtpHost = Deno.env.get("SMTP_HOST") || "smtp.titan.email";
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
        from: `${fromName} <inquiry@swadeshisolutions.co.in>`,
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

    // Use Resend directly
    const result = await sendEmailViaResend(
      INQUIRY_RECIPIENT,
      subject,
      htmlContent,
      "Swadeshi Solutions"
    );

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

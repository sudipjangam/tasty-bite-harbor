import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const maxRequests = 5;
  const windowMs = 15 * 60 * 1000;
  const now = Date.now();
  const existing = rateLimitStore.get(ip);
  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= maxRequests) return false;
  existing.count++;
  return true;
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

const SITE_URL = "https://swadeshisolutions.co.in";
const TOKEN_EXPIRY_MINUTES = 20;

function generateResetEmailHTML(email: string, resetLink: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - Swadeshi Solutions</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px 10px; background-color: #f4f6fb; color: #334155;">

  <!-- Outer Wrapper Card -->
  <div style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(46, 49, 146, 0.08); border: 1px solid #e2e8f0;">
    
    <!-- Top Accent Bar (Brand Gradient) -->
    <div style="height: 6px; background: linear-gradient(90deg, #2E3192 0%, #4a4fcc 50%, #F26722 100%);"></div>

    <!-- Header Section with Logo -->
    <div style="padding: 32px 32px 24px 32px; text-align: center; background-color: #ffffff; border-bottom: 1px solid #f1f5f9;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="center">
            <a href="${SITE_URL}" target="_blank" style="text-decoration: none;">
              <img src="${SITE_URL}/swadeshi-logo2.png" alt="Swadeshi Solutions Logo" width="80" height="80" style="display: block; width: 80px; height: 80px; object-fit: contain; margin-bottom: 12px;" />
            </a>
          </td>
        </tr>
        <tr>
          <td align="center">
            <h1 style="margin: 0; font-size: 26px; font-weight: 800; tracking-tight: -0.5px;">
              <span style="color: #2E3192;">Swadeshi</span><span style="color: #F26722; margin-left: 6px;">Solutions</span>
            </h1>
            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase;">
              RMS Pro &bull; Restaurant Management System
            </p>
          </td>
        </tr>
      </table>
    </div>

    <!-- Main Content Body -->
    <div style="padding: 36px 32px; background-color: #ffffff;">
      <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0 0 16px 0;">
        Password Reset Request
      </h2>
      
      <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
        Hello,
      </p>
      
      <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
        We received a request to reset the password for your account linked to <strong style="color: #0f172a;">${email}</strong>. Click the button below to set a new secure password:
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #2E3192 0%, #1a1f6e 100%); color: #ffffff; padding: 16px 42px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(46, 49, 146, 0.35);">
          Reset Password &rarr;
        </a>
      </div>

      <!-- Expiry Alert Callout -->
      <div style="margin: 28px 0 20px 0; padding: 14px 18px; background-color: #fffbeb; border-radius: 10px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5; font-weight: 500;">
          ⏰ <strong>Security Notice:</strong> This reset link expires in <strong>${TOKEN_EXPIRY_MINUTES} minutes</strong>. If you need a new link after that, please submit another request.
        </p>
      </div>

      <!-- Security Notice -->
      <div style="margin: 0 0 24px 0; padding: 14px 18px; background-color: #f8fafc; border-radius: 10px; border-left: 4px solid #94a3b8;">
        <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">
          If you did not request this password reset, please ignore this email. Your account remains completely secure.
        </p>
      </div>

      <!-- Fallback Raw Link -->
      <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 24px 0 0 0; word-break: break-all;">
        If the button above does not work, copy and paste this link into your browser:<br>
        <a href="${resetLink}" style="color: #2E3192; text-decoration: underline;">${resetLink}</a>
      </p>

      <!-- Signature Section -->
      <div style="margin-top: 36px; padding-top: 24px; border-top: 1px solid #f1f5f9;">
        <p style="margin: 0 0 4px 0; color: #475569; font-size: 14px;">Warm regards,</p>
        <p style="margin: 0 0 2px 0; color: #2E3192; font-size: 15px; font-weight: 700;">Team Swadeshi Solutions</p>
        <p style="margin: 0; color: #64748b; font-size: 12px;">RMS Pro Support &bull; <a href="mailto:inquiry@swadeshisolutions.co.in" style="color: #F26722; text-decoration: none;">inquiry@swadeshisolutions.co.in</a></p>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
      <p style="margin: 0 0 6px 0; color: #94a3b8; font-size: 12px;">
        &copy; ${new Date().getFullYear()} Swadeshi Solutions. All rights reserved.
      </p>
      <p style="margin: 0; color: #cbd5e1; font-size: 11px;">
        <a href="${SITE_URL}" style="color: #64748b; text-decoration: none;">Website</a> &bull; 
        <a href="${SITE_URL}/auth" style="color: #64748b; text-decoration: none;">Sign In</a>
      </p>
    </div>

  </div>
</body>
</html>`;
}

function generateEncouragementHTML(email: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Inquiry - Swadeshi Solutions</title>
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
        RMS Pro &bull; Restaurant Management System
      </p>
    </div>

    <div style="padding: 36px 32px; background-color: #ffffff;">
      <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0 0 16px 0;">
        Account Notice
      </h2>
      
      <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
        Hello,
      </p>
      
      <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
        A password reset was requested for <strong style="color: #0f172a;">${email}</strong>, but we couldn't find an active account with this email address.
      </p>

      <div style="margin: 24px 0; padding: 24px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
        <h3 style="margin: 0 0 12px 0; color: #2E3192; font-size: 16px; font-weight: 700;">
          Grow your business with Swadeshi Solutions RMS Pro
        </h3>
        <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.8;">
          <li>Real-time Sales & Inventory Analytics</li>
          <li>Complete Multi-Branch & POS Operations</li>
          <li>Digital QR Code Menu & Ordering System</li>
          <li>Staff Attendance & Payroll Automation</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${SITE_URL}/auth?mode=inquiry" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #F26722 0%, #d9530f 100%); color: #ffffff; padding: 16px 42px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px; box-shadow: 0 4px 14px rgba(242, 103, 34, 0.35);">
          Register Your Business &rarr;
        </a>
      </div>

      <div style="margin-top: 36px; padding-top: 24px; border-top: 1px solid #f1f5f9;">
        <p style="margin: 0 0 4px 0; color: #475569; font-size: 14px;">Warm regards,</p>
        <p style="margin: 0 0 2px 0; color: #2E3192; font-size: 15px; font-weight: 700;">Team Swadeshi Solutions</p>
        <p style="margin: 0; color: #64748b; font-size: 12px;">RMS Pro Support &bull; <a href="mailto:inquiry@swadeshisolutions.co.in" style="color: #F26722; text-decoration: none;">inquiry@swadeshisolutions.co.in</a></p>
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

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");

  console.log(`Sending email via Resend to: ${to}`);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Swadeshi Solutions <inquiry@swadeshisolutions.co.in>",
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }

  console.log(`Email sent via Resend to ${to}`);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders, status: 204 });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 405 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 });
  }

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Please enter a valid email address" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Check if user exists
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw new Error("Failed to verify email");

    const user = users.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

    if (user) {
      // Invalidate existing tokens
      await supabaseAdmin.from('password_reset_tokens').delete().eq('email', email.toLowerCase());

      // Generate new token
      const token = generateToken();
      const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000).toISOString();

      const { error: insertError } = await supabaseAdmin.from('password_reset_tokens').insert({
        email: email.toLowerCase(),
        token,
        expires_at: expiresAt,
      });

      if (insertError) throw new Error("Failed to generate reset token");

      // Build reset link
      const resetLink = `${SITE_URL}/auth?mode=reset&token=${token}&email=${encodeURIComponent(email.toLowerCase())}`;

      // Send custom reset email via SMTP
      await sendEmail(email, "Reset Your Password - Swadeshi Solutions", generateResetEmailHTML(email, resetLink));
      console.log(`Custom reset email sent to ${email}`);

      return new Response(
        JSON.stringify({ exists: true, message: "Password reset email sent" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    } else {
      console.log(`User not found: ${email}`);
      sendEmail(email, "Register Your Business with Swadeshi Solutions", generateEncouragementHTML(email)).catch(console.error);

      return new Response(
        JSON.stringify({ exists: false, message: "Email not registered" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
  } catch (error) {
    console.error("Error in forgot-password:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

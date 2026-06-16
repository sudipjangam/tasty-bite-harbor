import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f7fafc;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Swadeshi Solutions</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0;">RMS Pro — Restaurant Management System</p>
  </div>
  <div style="background: white; padding: 35px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
    <h2 style="color: #2d3748; margin: 0 0 16px 0;">Reset Your Password</h2>
    <p style="color: #4a5568; line-height: 1.6;">
      Hi,<br><br>
      We received a request to reset the password for <strong>${email}</strong>.
      Click the button below to set a new password.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; letter-spacing: 0.5px;">
        Reset Password
      </a>
    </div>
    <div style="margin-top: 20px; padding: 16px; background: #fff8e1; border-radius: 8px; border-left: 4px solid #f6ad55;">
      <p style="margin: 0; color: #744210; font-size: 14px;">
        ⏰ This link expires in <strong>${TOKEN_EXPIRY_MINUTES} minutes</strong>. After that, you'll need to request a new one.
      </p>
    </div>
    <div style="margin-top: 16px; padding: 16px; background: #f0f5ff; border-radius: 8px; border-left: 4px solid #667eea;">
      <p style="margin: 0; color: #4a5568; font-size: 14px;">
        If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
      </p>
    </div>
    <p style="color: #a0aec0; font-size: 12px; margin-top: 20px;">If the button doesn't work, copy and paste this link into your browser:<br><a href="${resetLink}" style="color: #667eea; word-break: break-all;">${resetLink}</a></p>
  </div>
  <div style="text-align: center; padding: 20px;">
    <p style="color: #a0aec0; font-size: 12px;">&copy; ${new Date().getFullYear()} Swadeshi Solutions. All rights reserved.</p>
  </div>
</body></html>`;
}

function generateEncouragementHTML(email: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f7fafc;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Swadeshi Solutions</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0;">RMS Pro — Restaurant Management System</p>
  </div>
  <div style="background: white; padding: 35px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
    <h2 style="color: #2d3748; margin: 0 0 16px 0;">No Account Found</h2>
    <p style="color: #4a5568; line-height: 1.6;">
      Hi there,<br><br>
      Someone tried to reset the password for <strong>${email}</strong>, but no account was found.
    </p>
    <p style="color: #4a5568; line-height: 1.6;">Register your business with Swadeshi Solutions and unlock:</p>
    <ul style="color: #4a5568; line-height: 2;">
      <li>Real-time analytics and reporting</li>
      <li>Complete restaurant management</li>
      <li>Staff scheduling and management</li>
      <li>Inventory tracking and automation</li>
      <li>QR-based ordering system</li>
    </ul>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${SITE_URL}/auth" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px;">Register Your Business</a>
    </div>
    <div style="margin-top: 24px; padding: 16px; background: #f0f5ff; border-radius: 8px; border-left: 4px solid #667eea;">
      <p style="margin: 0; color: #4a5568; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
    </div>
  </div>
  <div style="text-align: center; padding: 20px;"><p style="color: #a0aec0; font-size: 12px;">&copy; ${new Date().getFullYear()} Swadeshi Solutions. All rights reserved.</p></div>
</body></html>`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const smtpUser = Deno.env.get("SMTP_USER") || Deno.env.get("GMAIL_USER");
  const smtpPass = Deno.env.get("SMTP_PASS") || Deno.env.get("GMAIL_APP_PASSWORD");
  const smtpHost = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
  const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");

  if (!smtpUser || !smtpPass) throw new Error("SMTP not configured");

  const client = new SMTPClient({
    connection: { hostname: smtpHost, port: smtpPort, tls: true, auth: { username: smtpUser, password: smtpPass } },
  });

  await client.send({
    from: `Swadeshi Solutions <${smtpUser}>`,
    to,
    subject,
    html: html.replace(/\r?\n/g, '\r\n'),
  });

  await client.close();
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

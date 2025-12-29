import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { 
  checkRateLimit, 
  createRateLimitResponse, 
  getRequestIdentifier 
} from "../_shared/rate-limit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EMAIL_RATE_LIMIT = {
  maxRequests: 100,
  windowMs: 60 * 60 * 1000,
  keyPrefix: 'send-email',
};

interface SendEmailRequest {
  to: string;
  subject?: string;
  html?: string;
  template?: 'loyalty_invitation' | 'welcome' | 'custom';
  templateData?: Record<string, any>;
  restaurantId?: string;
  fromName?: string;
}

// Send email via Gmail SMTP
async function sendEmailViaGmailSMTP(
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
      content: "Please view this email in an HTML-compatible client.",
      html: htmlContent,
    });

    await client.close();
    console.log("Email sent via Gmail SMTP");
    return { success: true };
  } catch (error) {
    console.error("Gmail SMTP error:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// Send email via Resend API
async function sendEmailViaResend(
  to: string,
  subject: string,
  htmlContent: string,
  fromName: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!resendApiKey) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
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
      return { success: false, error: result.message || "Failed to send email" };
    }

    console.log("Email sent via Resend:", result);
    return { success: true, id: result.id };
  } catch (error) {
    console.error("Resend error:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// Unified send email function - tries SMTP first, then Resend
async function sendEmailUnified(
  to: string,
  subject: string,
  htmlContent: string,
  fromName: string
): Promise<{ success: boolean; id?: string; error?: string; provider?: string }> {
  const smtpUser = Deno.env.get("SMTP_USER") || Deno.env.get("GMAIL_USER");
  const smtpPass = Deno.env.get("SMTP_PASS") || Deno.env.get("GMAIL_APP_PASSWORD");
  
  if (smtpUser && smtpPass) {
    console.log("Attempting to send via Gmail SMTP...");
    const smtpResult = await sendEmailViaGmailSMTP(to, subject, htmlContent, fromName);
    if (smtpResult.success) {
      return { ...smtpResult, provider: "gmail_smtp" };
    }
    console.warn("Gmail SMTP failed:", smtpResult.error);
  }
  
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (resendApiKey) {
    console.log("Attempting to send via Resend...");
    const resendResult = await sendEmailViaResend(to, subject, htmlContent, fromName);
    if (resendResult.success) {
      return { ...resendResult, provider: "resend" };
    }
    return resendResult;
  }
  
  return { 
    success: false, 
    error: "No email provider configured. Set SMTP_USER/SMTP_PASS or RESEND_API_KEY." 
  };
}

// Email templates
function getEmailTemplate(
  template: string, 
  data: Record<string, any>,
  restaurantName: string
): { subject: string; html: string } {
  switch (template) {
    case 'loyalty_invitation':
      return {
        subject: `You're Invited to Join ${restaurantName}'s Loyalty Program!`,
        html: generateLoyaltyInvitationHTML(data, restaurantName),
      };
    
    case 'welcome':
      return {
        subject: `Welcome to ${restaurantName}'s Loyalty Program!`,
        html: generateWelcomeHTML(data, restaurantName),
      };
    
    default:
      return {
        subject: data.subject || 'Message from ' + restaurantName,
        html: data.html || '<p>No content provided</p>',
      };
  }
}

function generateLoyaltyInvitationHTML(data: Record<string, any>, restaurantName: string): string {
  const customerName = data.customerName || 'Valued Guest';
  const enrollmentLink = data.enrollmentLink || '#';
  const benefits = data.benefits || [];

  const benefitsHTML = benefits.length > 0 
    ? benefits.map((b: string) => `<li style="padding: 8px 0; color: #4a5568;">✨ ${b}</li>`).join('')
    : `<li style="padding: 8px 0; color: #4a5568;">✨ Earn points on every order</li>
       <li style="padding: 8px 0; color: #4a5568;">✨ Exclusive member discounts</li>
       <li style="padding: 8px 0; color: #4a5568;">✨ Birthday rewards</li>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f7fafc;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited!</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0;">Join ${restaurantName}'s Loyalty Program</p>
  </div>
  <div style="background: white; padding: 35px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
    <h2 style="color: #2d3748; margin: 0 0 16px 0;">Hi ${customerName}!</h2>
    <p style="color: #4a5568; line-height: 1.7;">Thank you for dining with us! Join our <strong style="color: #667eea;">Loyalty Program</strong> and start earning rewards.</p>
    <div style="background: #f0f5ff; padding: 20px; border-radius: 12px; margin: 20px 0;">
      <h3 style="color: #2d3748; margin: 0 0 12px 0;">Member Benefits</h3>
      <ul style="margin: 0; padding-left: 0; list-style: none;">${benefitsHTML}</ul>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${enrollmentLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-size: 16px; font-weight: 600;">Join Now - It's Free!</a>
    </div>
    <p style="color: #718096; text-align: center; font-size: 14px;">Takes less than 30 seconds!</p>
  </div>
  <div style="text-align: center; padding: 20px;">
    <p style="color: #a0aec0; font-size: 12px;">© ${new Date().getFullYear()} ${restaurantName}</p>
  </div>
</body>
</html>`;
}

function generateWelcomeHTML(data: Record<string, any>, restaurantName: string): string {
  const customerName = data.customerName || 'Valued Guest';
  const loyaltyPoints = data.loyaltyPoints || 0;
  const tier = data.tier || 'Bronze';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f7fafc;">
  <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Welcome Aboard!</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0;">You're now a ${tier} member</p>
  </div>
  <div style="background: white; padding: 35px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
    <h2 style="color: #2d3748; margin: 0 0 16px 0;">Hi ${customerName}!</h2>
    <p style="color: #4a5568; line-height: 1.7;">Welcome to the <strong style="color: #48bb78;">${restaurantName}</strong> family! You've successfully enrolled in our loyalty program.</p>
    <div style="background: #f0fff4; padding: 25px; border-radius: 12px; text-align: center; margin: 20px 0;">
      <p style="margin: 0 0 8px 0; color: #2d3748; font-size: 14px; text-transform: uppercase;">Your Points</p>
      <p style="margin: 0; color: #38a169; font-size: 48px; font-weight: 700;">${loyaltyPoints}</p>
      <p style="margin: 8px 0 0 0; color: #68d391;">${tier} Member</p>
    </div>
    <p style="color: #718096; text-align: center;">Start earning points on your next visit!</p>
  </div>
  <div style="text-align: center; padding: 20px;">
    <p style="color: #a0aec0; font-size: 12px;">© ${new Date().getFullYear()} ${restaurantName}</p>
  </div>
</body>
</html>`;
}

serve(async (req: Request) => {
  console.log(`${req.method} request to send-email at ${new Date().toISOString()}`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  const authHeader = req.headers.get('authorization');
  const identifier = getRequestIdentifier(req, authHeader);
  const rateLimitResult = checkRateLimit(identifier, EMAIL_RATE_LIMIT);
  
  if (!rateLimitResult.allowed) {
    console.log(`Rate limit exceeded for ${identifier}`);
    return createRateLimitResponse(rateLimitResult, corsHeaders);
  }

  try {
    const requestBody = await req.json() as SendEmailRequest;
    const { to, subject, html, template, templateData, restaurantId, fromName } = requestBody;

    if (!to) {
      return new Response(
        JSON.stringify({ success: false, error: 'Recipient email (to) is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    let restaurantName = fromName || 'Our Restaurant';
    
    if (restaurantId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const { data: restaurant } = await supabase
            .from('restaurants')
            .select('name')
            .eq('id', restaurantId)
            .single();
          
          if (restaurant?.name) {
            restaurantName = restaurant.name;
          }
        }
      } catch (err) {
        console.warn('Could not fetch restaurant name:', err);
      }
    }

    let finalSubject = subject;
    let finalHtml = html;

    if (template && template !== 'custom') {
      const emailContent = getEmailTemplate(template, templateData || {}, restaurantName);
      finalSubject = emailContent.subject;
      finalHtml = emailContent.html;
    }

    if (!finalSubject || !finalHtml) {
      return new Response(
        JSON.stringify({ success: false, error: 'Subject and HTML content are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const result = await sendEmailUnified(to, finalSubject, finalHtml, restaurantName);

    if (!result.success) {
      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`Email sent to ${to} via ${result.provider}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email sent successfully to ${to}`,
        emailId: result.id,
        provider: result.provider,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error("Error in send-email function:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

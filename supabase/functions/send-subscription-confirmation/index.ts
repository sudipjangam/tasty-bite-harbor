import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
// ─── Swadeshi Solutions Logo (base64-encoded for email compatibility) ────────
// We'll fetch it from the deployed site for reliable rendering
const LOGO_URL = 'https://swadeshi-restaurant-managment.netlify.app/icons/swadeshi-icon-512.png';
const SITE_URL = 'https://swadeshisolutions.co.in';
const COMPANY_NAME = 'Swadeshi Solutions';
const COMPANY_EMAIL = 'support@swadeshisolutions.com';
const COMPANY_PHONE = '+91 83295 40398';
interface ConfirmationRequest {
  restaurant_id: string;
  subscription_id: string;
  plan_id: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  amount_paid: number;
  payment_method: string;
  period_start: string;
  period_end: string;
}
// ─── Send Email via Gmail SMTP ──────────────────────────────────────────────
async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ success: boolean; error?: string }> {
  const smtpUser = Deno.env.get('SMTP_USER') || Deno.env.get('GMAIL_USER');
  const smtpPass = Deno.env.get('SMTP_PASS') || Deno.env.get('GMAIL_APP_PASSWORD');
  if (!smtpUser || !smtpPass) {
    return { success: false, error: 'SMTP not configured' };
  }
  try {
    const client = new SMTPClient({
      connection: {
        hostname: Deno.env.get('SMTP_HOST') || 'smtp.gmail.com',
        port: parseInt(Deno.env.get('SMTP_PORT') || '465'),
        tls: true,
        auth: { username: smtpUser, password: smtpPass },
      },
    });
    await client.send({
      from: `${COMPANY_NAME} <${smtpUser}>`,
      to,
      subject,
      content: 'Please view this email in an HTML-capable client.',
      html,
    });
    await client.close();
    console.log('✅ Email sent to', to);
    return { success: true };
  } catch (error) {
    console.error('❌ Email error:', error);
    return { success: false, error: String(error) };
  }
}
// ─── Send WhatsApp via MSG91 ────────────────────────────────────────────────
// NOTE: This is a SEPARATE WhatsApp sender — does NOT use the shared
// send-msg91-whatsapp edge function. Zero risk to other templates.
async function sendWhatsApp(
  phone: string,
  variables: Record<string, string>,
  invoicePath: string,  // Just the path suffix for the dynamic URL button (e.g. "restaurantId/INV-SUB-XXX.html")
  restaurantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabaseAdmin.functions.invoke("send-whatsapp-unified", {
      body: {
        phoneNumber: phone,
        restaurantId: restaurantId,
        templateName: "subscription_confirmation",
        variables: variables,
        buttons: [
          { type: "url", value: invoicePath }
        ]
      }
    });

    if (error) {
      console.error('Unified WhatsApp edge function error:', error);
      return { success: false, error: String(error) };
    }
    
    if (data && data.success === false) {
       console.error('Unified WhatsApp failed:', data);
       return { success: false, error: data.error };
    }

    return { success: true };
  } catch (error) {
    console.error('WhatsApp error:', error);
    return { success: false, error: String(error) };
  }
}
// ─── Format Date ────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}
function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
// ─── Generate Premium Invoice HTML ──────────────────────────────────────────
function generateInvoiceHTML(data: {
  invoiceNumber: string;
  restaurant: { name: string; address: string; phone: string; email: string; gstin: string; owner_name: string };
  plan: { name: string; price: string; interval: string; features: string[] };
  payment: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    amount_paid: number;
    payment_method: string;
    period_start: string;
    period_end: string;
    paid_at: string;
  };
}): string {
  const { invoiceNumber, restaurant, plan, payment } = data;
  const formattedAmount = `₹${payment.amount_paid.toLocaleString('en-IN')}`;
  const intervalLabel: Record<string, string> = {
    monthly: 'Monthly',
    quarterly: 'Quarterly (3 months)',
    half_yearly: 'Half-Yearly (6 months)',
    yearly: 'Yearly (12 months)',
  };
  const featuresHTML = (plan.features || [])
    .slice(0, 8)
    .map((f: string) => `<li style="padding:4px 0;color:#4a5568;font-size:13px">✓ ${f}</li>`)
    .join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Invoice - ${invoiceNumber}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .no-print { display: none !important; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif; background: #f0f2f5; color: #1a202c; }
    .wrapper { max-width: 700px; margin: 0 auto; padding: 24px; }
    .card { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.12); }
    
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #f97316 100%); padding: 32px 40px; display: flex; align-items: center; justify-content: space-between; gap: 20px; }
    .header-logo-group { display: flex; align-items: center; gap: 16px; }
    .header-text h1 { color: #fff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
    .header-badge { background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; padding: 8px 16px; display: inline-block; }
    
    .meta-row { padding: 28px 40px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; gap: 20px; }
    .meta-col { flex: 1; }
    .meta-col.center { text-align: center; }
    .meta-col.right { text-align: right; }
    
    .address-row { padding: 28px 40px; display: flex; gap: 40px; border-bottom: 1px solid #e2e8f0; }
    .address-col { flex: 1; }
    
    .section { padding: 28px 40px; }
    .table-container { border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; overflow-x: auto; }
    th { color: #fff; font-weight: 600; font-size: 12px; text-transform: uppercase; padding: 14px 20px; letter-spacing: 0.5px; white-space: nowrap; }
    td { padding: 18px 20px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    
    .payment-grid { background: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; display: flex; flex-wrap: wrap; gap: 20px; }
    .payment-item { flex: 1; min-width: 120px; }
    
    .features-box { background: #f0fdf4; border-radius: 12px; padding: 16px 20px; border: 1px solid #bbf7d0; }
    .features-list { list-style: none; margin: 0; padding: 0; columns: 2; column-gap: 20px; }
    
    @media (max-width: 600px) {
      .wrapper { padding: 12px; }
      .header { flex-direction: column; align-items: flex-start; padding: 24px 20px; }
      .meta-row { flex-direction: column; padding: 20px; gap: 16px; }
      .meta-col.center, .meta-col.right { text-align: left; }
      .address-row { flex-direction: column; padding: 20px; gap: 24px; }
      .section { padding: 20px; }
      th, td { padding: 12px 14px; }
      .features-list { columns: 1; }
      .header-logo-group { flex-direction: column; align-items: flex-start; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <!-- ═══════ HEADER ═══════ -->
      <div class="header">
        <div class="header-logo-group">
          <img src="${LOGO_URL}" alt="Swadeshi Solutions" style="width:72px;height:72px;border-radius:14px;background:#fff;padding:4px;object-fit:contain" />
          <div class="header-text">
            <h1>${COMPANY_NAME}</h1>
            <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:4px 0 0 0">Restaurant Management Platform</p>
          </div>
        </div>
        <div>
          <div class="header-badge">
            <span style="color:#fff;font-size:18px;font-weight:700;letter-spacing:1px">INVOICE</span>
          </div>
        </div>
      </div>
      <!-- ═══════ INVOICE META ═══════ -->
      <div class="meta-row">
        <div class="meta-col">
          <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:6px">Invoice Number</p>
          <p style="color:#1e3a8a;font-size:16px;font-weight:700">${invoiceNumber}</p>
        </div>
        <div class="meta-col center">
          <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:6px">Date of Issue</p>
          <p style="color:#1a202c;font-size:16px;font-weight:600">${formatDate(payment.paid_at)}</p>
        </div>
        <div class="meta-col right">
          <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:6px">Status</p>
          <span style="background:#dcfce7;color:#166534;padding:4px 14px;border-radius:20px;font-size:13px;font-weight:700;display:inline-block">✓ PAID</span>
        </div>
      </div>
      <!-- ═══════ FROM / BILL TO ═══════ -->
      <div class="address-row">
        <div class="address-col">
          <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:10px">From</p>
          <p style="font-weight:700;font-size:15px;color:#1a202c">${COMPANY_NAME}</p>
          <p style="color:#64748b;font-size:13px;line-height:1.8;margin-top:4px">
            ${COMPANY_EMAIL}<br>
            ${COMPANY_PHONE}
          </p>
        </div>
        <div class="address-col">
          <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:10px">Bill To</p>
          <p style="font-weight:700;font-size:15px;color:#1a202c">${restaurant.name}</p>
          <p style="color:#64748b;font-size:13px;line-height:1.8;margin-top:4px;word-break:break-word">
            ${restaurant.owner_name ? restaurant.owner_name + '<br>' : ''}
            ${restaurant.address ? restaurant.address + '<br>' : ''}
            ${restaurant.phone ? '📞 ' + restaurant.phone : ''}
            ${restaurant.gstin ? '<br>GSTIN: ' + restaurant.gstin : ''}
          </p>
        </div>
      </div>
      <!-- ═══════ SUBSCRIPTION DETAILS TABLE ═══════ -->
      <div class="section">
        <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:16px">Subscription Details</p>
        <div class="table-container">
          <table style="width:100%;border-collapse:collapse;min-width:400px">
            <thead>
              <tr style="background:linear-gradient(135deg,#1e3a8a,#3b82f6)">
                <th style="text-align:left">Description</th>
                <th style="text-align:center">Period</th>
                <th style="text-align:right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <p style="font-weight:700;color:#1a202c;font-size:15px;margin-bottom:4px">${plan.name}</p>
                  <p style="color:#64748b;font-size:12px">${intervalLabel[plan.interval] || plan.interval} billing</p>
                </td>
                <td style="text-align:center">
                  <p style="color:#1a202c;font-size:14px;font-weight:500">${formatShortDate(payment.period_start)}</p>
                  <p style="color:#64748b;font-size:11px">to</p>
                  <p style="color:#1a202c;font-size:14px;font-weight:500">${formatShortDate(payment.period_end)}</p>
                </td>
                <td style="text-align:right">
                  <p style="font-weight:800;color:#1e3a8a;font-size:20px">${formattedAmount}</p>
                </td>
              </tr>
            </tbody>
          </table>
          <!-- Total row -->
          <div style="background:#f0f5ff;padding:16px 20px;display:flex;justify-content:space-between;align-items:center">
            <span style="font-weight:700;color:#1a202c;font-size:16px">Total Paid</span>
            <span style="font-weight:800;color:#1e3a8a;font-size:22px">${formattedAmount}</span>
          </div>
        </div>
      </div>
      <!-- ═══════ PAYMENT INFORMATION ═══════ -->
      <div class="section" style="padding-top:0">
        <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:16px">Payment Information</p>
        <div class="payment-grid">
          <div class="payment-item">
            <p style="color:#94a3b8;font-size:11px;text-transform:uppercase;margin-bottom:4px">Payment ID</p>
            <p style="color:#1a202c;font-size:13px;font-weight:600;font-family:monospace;word-break:break-all">${payment.razorpay_payment_id}</p>
          </div>
          <div class="payment-item">
            <p style="color:#94a3b8;font-size:11px;text-transform:uppercase;margin-bottom:4px">Order ID</p>
            <p style="color:#1a202c;font-size:13px;font-weight:600;font-family:monospace;word-break:break-all">${payment.razorpay_order_id}</p>
          </div>
          <div class="payment-item">
            <p style="color:#94a3b8;font-size:11px;text-transform:uppercase;margin-bottom:4px">Method</p>
            <p style="color:#1a202c;font-size:13px;font-weight:600;text-transform:capitalize">${payment.payment_method}</p>
          </div>
          <div class="payment-item">
            <p style="color:#94a3b8;font-size:11px;text-transform:uppercase;margin-bottom:4px">Paid On</p>
            <p style="color:#1a202c;font-size:13px;font-weight:600">${formatDate(payment.paid_at)}</p>
          </div>
        </div>
      </div>
      <!-- ═══════ PLAN FEATURES ═══════ -->
      ${featuresHTML ? `
      <div class="section" style="padding-top:0">
        <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:12px">What's Included</p>
        <div class="features-box">
          <ul class="features-list">${featuresHTML}</ul>
        </div>
      </div>` : ''}
      <!-- ═══════ FOOTER ═══════ -->
      <div style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center">
        <p style="color:#64748b;font-size:13px;margin-bottom:6px">Thank you for choosing <strong style="color:#1e3a8a">${COMPANY_NAME}</strong>!</p>
        <p style="color:#94a3b8;font-size:12px;margin-bottom:12px">Questions? Contact us at ${COMPANY_EMAIL} or ${COMPANY_PHONE}</p>
        <p style="color:#cbd5e1;font-size:11px">This is a computer-generated invoice and does not require a signature.</p>
      </div>
    </div>
    <!-- Copyright -->
    <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:16px">© ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.</p>
  </div>
</body>
</html>`;
}
// ─── Generate Email HTML (wraps invoice + greeting) ─────────────────────────
function generateEmailHTML(
  ownerName: string,
  planName: string,
  amount: string,
  invoiceHTML: string,
  invoiceUrl: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',-apple-system,sans-serif;background:#f0f2f5">
  <div style="max-width:700px;margin:0 auto;padding:24px">
    <!-- Greeting Banner -->
    <div style="background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 50%,#f97316 100%);border-radius:16px;padding:32px 40px;text-align:center;margin-bottom:24px">
      <div style="font-size:48px;margin-bottom:12px">🎉</div>
      <h1 style="color:#fff;font-size:24px;font-weight:800;margin:0 0 8px 0">Subscription Activated!</h1>
      <p style="color:rgba(255,255,255,0.9);font-size:15px;margin:0">
        Hi <strong>${ownerName}</strong>, your <strong>${planName}</strong> plan is now active.
      </p>
      <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:12px 0 0 0">Amount paid: <strong style="font-size:18px">${amount}</strong></p>
    </div>
    <!-- Invoice (embedded) -->
    ${invoiceHTML}
    <!-- CTA -->
    <div style="text-align:center;margin:24px 0">
      <a href="${invoiceUrl}" style="display:inline-block;background:linear-gradient(135deg,#1e3a8a,#3b82f6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:700;font-size:15px">View Invoice Online →</a>
    </div>
    <div style="text-align:center;margin:24px 0">
      <a href="${SITE_URL}/dashboard" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;padding:12px 32px;border-radius:10px;font-weight:600;font-size:14px">Go to Dashboard →</a>
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:20px">
      You're receiving this email because you subscribed to ${COMPANY_NAME}.<br>
      © ${new Date().getFullYear()} ${COMPANY_NAME}
    </p>
  </div>
</body>
</html>`;
}
// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════════
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const body: ConfirmationRequest = await req.json();
    const {
      restaurant_id,
      plan_id,
      razorpay_payment_id,
      razorpay_order_id,
      amount_paid,
      payment_method,
      period_start,
      period_end,
    } = body;
    console.log('📨 Processing subscription confirmation for restaurant:', restaurant_id);
    // 1. Fetch restaurant details
    const { data: restaurant, error: restError } = await supabaseAdmin
      .from('restaurants')
      .select('name, address, phone, email, gstin, owner_name, owner_email, owner_phone, logo_url')
      .eq('id', restaurant_id)
      .single();
    if (restError || !restaurant) {
      console.error('Restaurant not found:', restError);
      return new Response(
        JSON.stringify({ success: false, error: 'Restaurant not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 },
      );
    }
    // 2. Fetch plan details
    const { data: plan, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('name, price, interval, features')
      .eq('id', plan_id)
      .single();
    if (planError || !plan) {
      console.error('Plan not found:', planError);
      return new Response(
        JSON.stringify({ success: false, error: 'Plan not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 },
      );
    }
    // 3. Generate invoice number
    const timestamp = Date.now().toString(36).toUpperCase();
    const invoiceNumber = `INV-SUB-${timestamp}`;
    const invoiceFileName = `${restaurant_id}/${invoiceNumber}.html`;
    // 4. Generate invoice HTML
    const invoiceHTML = generateInvoiceHTML({
      invoiceNumber,
      restaurant: {
        name: restaurant.name || 'Restaurant',
        address: restaurant.address || '',
        phone: restaurant.phone || '',
        email: restaurant.email || '',
        gstin: restaurant.gstin || '',
        owner_name: restaurant.owner_name || '',
      },
      plan: {
        name: plan.name,
        price: plan.price,
        interval: plan.interval,
        features: plan.features || [],
      },
      payment: {
        razorpay_payment_id,
        razorpay_order_id,
        amount_paid,
        payment_method,
        period_start,
        period_end,
        paid_at: new Date().toISOString(),
      },
    });
    // 5. Store invoice in Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('subscription-invoices')
      .upload(invoiceFileName, new Blob([invoiceHTML], { type: 'text/html' }), {
        contentType: 'text/html',
        upsert: true,
      });
    if (uploadError) {
      console.error('Invoice upload failed:', uploadError);
    } else {
      console.log('✅ Invoice stored:', invoiceFileName);
    }
    // Get public URL for the invoice
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('subscription-invoices')
      .getPublicUrl(invoiceFileName);
    const invoiceStorageUrl = publicUrlData?.publicUrl || '';
    // Frontend-friendly invoice URL (the React page that wraps the invoice with download button)
    const invoicePageUrl = `${SITE_URL}/invoice/${encodeURIComponent(invoiceFileName)}`;
    console.log('📄 Invoice URL:', invoicePageUrl);
    // 6. Send Email
    const ownerEmail = restaurant.owner_email || restaurant.email;
    const ownerName = restaurant.owner_name || 'Restaurant Owner';
    const formattedAmount = `₹${amount_paid.toLocaleString('en-IN')}`;
    if (ownerEmail) {
      const emailHTML = generateEmailHTML(
        ownerName,
        plan.name,
        formattedAmount,
        invoiceHTML,
        invoicePageUrl,
      );
      const emailResult = await sendEmail(
        ownerEmail,
        `✅ Subscription Activated - ${plan.name} | ${COMPANY_NAME}`,
        emailHTML,
      );
      console.log('Email result:', emailResult);
    } else {
      console.warn('No owner email found — skipping email notification');
    }
    // 7. Send WhatsApp
    const ownerPhone = restaurant.owner_phone || restaurant.phone;
    let whatsappResult = null;
    if (ownerPhone) {
      // Pass just the dynamic path for the button URL suffix
      // Template base: https://swadeshisolutions.co.in/invoice/{{1}}
      // We send: "a89cea4a.../INV-SUB-XXX.html" → final URL = base + suffix
      whatsappResult = await sendWhatsApp(
        ownerPhone,
        {
          owner_name: ownerName,
          restaurant_name: restaurant.name,
          plan_name: plan.name,
          amount: formattedAmount,
          valid_till: formatShortDate(period_end),
          payment_id: razorpay_payment_id,
        },
        encodeURIComponent(invoiceFileName),
        restaurant_id
      );
      console.log('WhatsApp result:', whatsappResult);
    } else {
      console.warn('No owner phone found — skipping WhatsApp notification');
    }
    return new Response(
      JSON.stringify({
        success: true,
        invoice_url: invoicePageUrl,
        invoice_storage_url: invoiceStorageUrl,
        invoice_number: invoiceNumber,
        whatsapp_result: ownerPhone ? whatsappResult : null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error) {
    console.error('❌ Error in send-subscription-confirmation:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
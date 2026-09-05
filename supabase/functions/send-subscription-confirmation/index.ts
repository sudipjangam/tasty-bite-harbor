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
      html: html.replace(/\r?\n/g, '\r\n'),
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
    razorpay_payment_id?: string;
    razorpay_order_id?: string;
    amount_paid: number;
    payment_method: string;
    period_start: string;
    period_end: string;
    paid_at: string;
  };
}): string {
  const { invoiceNumber, restaurant, plan, payment } = data;
  const totalAmount = Number(payment.amount_paid) || 0;
  const subtotal = Math.round((totalAmount / 1.18) * 100) / 100;
  const totalTax = Math.round((totalAmount - subtotal) * 100) / 100;
  const cgst = Math.round((totalTax / 2) * 100) / 100;
  const sgst = Math.round((totalTax - cgst) * 100) / 100;

  const formattedAmount = `₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formattedSubtotal = `₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formattedCGST = `₹${cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formattedSGST = `₹${sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const intervalLabel: Record<string, string> = {
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    half_yearly: 'Half-Yearly',
    yearly: 'Yearly',
  };

  const featuresHTML = (plan.features || [])
    .slice(0, 6)
    .map((f: string) => `<li style="margin-bottom:3px;font-size:12px;color:#475569;">• ${f}</li>`)
    .join('');

  const upiId = '8329540398@hdfcbank';
  const upiPayLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(COMPANY_NAME)}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(`Invoice ${invoiceNumber}`)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiPayLink)}&color=0f2b5c`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tax Invoice - ${invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: #f1f5f9; color: #0f172a; padding: 24px 12px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .invoice-container { max-width: 820px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0; }
    .top-accent-bar { height: 6px; background: linear-gradient(90deg, #0f2b5c 0%, #2563eb 60%, #f97316 100%); }
    .header-section { padding: 32px 36px 24px 36px; display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; border-bottom: 1px solid #f1f5f9; }
    .brand-group { display: flex; align-items: center; gap: 14px; }
    .brand-logo { width: 54px; height: 54px; border-radius: 12px; object-fit: contain; background: #f8fafc; padding: 4px; border: 1px solid #e2e8f0; }
    .brand-name { font-size: 24px; font-weight: 800; color: #0f2b5c; letter-spacing: -0.5px; }
    .brand-sub { font-size: 13px; color: #64748b; font-weight: 500; margin-top: 2px; }
    .meta-line { font-size: 12px; color: #64748b; margin-top: 4px; }
    .meta-line strong { color: #1e293b; }
    .invoice-title-block { text-align: right; }
    .invoice-title { font-size: 22px; font-weight: 800; color: #0f2b5c; letter-spacing: -0.3px; text-transform: uppercase; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; margin-top: 6px; background: #dcfce7; color: #16a34a; }
    .info-grid { padding: 24px 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; background: #fafafa; border-bottom: 1px solid #e2e8f0; }
    .info-col-title { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.8px; margin-bottom: 8px; }
    .info-entity-name { font-size: 16px; font-weight: 700; color: #0f2b5c; margin-bottom: 4px; }
    .info-text { font-size: 12.5px; color: #475569; line-height: 1.6; }
    .table-section { padding: 28px 36px 12px 36px; }
    .items-table { width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden; }
    .items-table thead tr { background: #0f2b5c; color: #ffffff; }
    .items-table th { padding: 12px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; text-align: left; }
    .items-table th.text-right, .items-table td.text-right { text-align: right; }
    .items-table th.text-center, .items-table td.text-center { text-align: center; }
    .items-table tbody tr { border-bottom: 1px solid #e2e8f0; }
    .items-table td { padding: 14px; font-size: 13px; color: #1e293b; vertical-align: top; }
    .item-desc-title { font-weight: 700; color: #0f2b5c; margin-bottom: 4px; }
    .item-features-list { list-style: none; margin-top: 4px; padding-left: 0; }
    .summary-wrapper { display: flex; justify-content: flex-end; padding: 12px 36px 24px 36px; }
    .summary-table { width: 320px; border-collapse: collapse; }
    .summary-table td { padding: 6px 10px; font-size: 12.5px; color: #475569; }
    .summary-table td.num { text-align: right; font-weight: 600; color: #1e293b; }
    .total-row td { background: #0f2b5c; color: #ffffff !important; padding: 10px 12px; font-size: 15px; font-weight: 800; border-radius: 6px; }
    .total-row td.num { font-size: 18px; color: #ffffff !important; }
    .payment-box { margin: 12px 36px 28px 36px; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; }
    .payment-heading { font-size: 14px; font-weight: 800; color: #0f2b5c; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    .payment-columns { display: grid; grid-template-columns: 1.4fr 1fr; gap: 24px; align-items: center; }
    .bank-details-grid { display: grid; grid-template-columns: 110px 1fr; gap: 6px 12px; font-size: 12.5px; }
    .bank-label { color: #64748b; font-weight: 500; }
    .bank-val { color: #0f172a; font-weight: 700; font-family: monospace; font-size: 12.5px; }
    .qr-container { display: flex; align-items: center; gap: 14px; background: #ffffff; padding: 12px 14px; border-radius: 10px; border: 1px solid #e2e8f0; }
    .qr-code-img { width: 90px; height: 90px; object-fit: contain; border-radius: 6px; }
    .qr-text-block { font-size: 11.5px; color: #475569; line-height: 1.4; }
    .qr-text-block strong { color: #0f2b5c; font-size: 12.5px; display: block; margin-bottom: 2px; }
    .upi-badge { background: #ffedd5; color: #c2410c; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 800; margin-top: 4px; display: inline-block; }
    .txn-info-row { margin-top: 14px; padding-top: 12px; border-top: 1px dashed #cbd5e1; font-size: 12px; color: #64748b; display: flex; flex-wrap: wrap; gap: 16px; }
    .txn-info-item strong { color: #0f172a; font-weight: 600; }
    .terms-section { padding: 0 36px 24px 36px; font-size: 11.5px; color: #64748b; line-height: 1.5; }
    .terms-title { font-weight: 700; color: #334155; margin-bottom: 4px; }
    .terms-list { padding-left: 16px; }
    .footer-bar { background: #0f2b5c; color: #94a3b8; padding: 14px 36px; display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; }
    .footer-bar a { color: #60a5fa; text-decoration: none; font-weight: 600; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .invoice-container { box-shadow: none; border: none; max-width: 100%; border-radius: 0; }
      .no-print { display: none !important; }
    }
    @media (max-width: 640px) {
      .header-section { flex-direction: column; }
      .invoice-title-block { text-align: left; margin-top: 12px; }
      .info-grid { grid-template-columns: 1fr; gap: 16px; }
      .payment-columns { grid-template-columns: 1fr; }
      .summary-wrapper { justify-content: stretch; }
      .summary-table { width: 100%; }
      .footer-bar { flex-direction: column; gap: 6px; text-align: center; }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="top-accent-bar"></div>
    <div class="header-section">
      <div class="brand-group">
        <img src="${LOGO_URL}" alt="${COMPANY_NAME}" class="brand-logo" onerror="this.style.display='none'" />
        <div>
          <h1 class="brand-name">${COMPANY_NAME}</h1>
          <p class="brand-sub">Restaurant & Hospitality Management Platform</p>
          <p class="meta-line" style="margin-top:4px;">GSTIN: <strong>27AABCS1429B1Z2</strong> | PAN: <strong>AABCS1429B</strong></p>
        </div>
      </div>
      <div class="invoice-title-block">
        <div class="invoice-title">Tax Invoice / Bill</div>
        <p class="meta-line">Invoice Number: <strong>${invoiceNumber}</strong></p>
        <p class="meta-line">Invoice Date: <strong>${formatDate(payment.paid_at)}</strong></p>
        <p class="meta-line">Payment Date: <strong>${formatDate(payment.paid_at)}</strong></p>
        <span class="status-badge">✓ PAID</span>
      </div>
    </div>

    <div class="info-grid">
      <div>
        <div class="info-col-title">Bill To (Subscriber)</div>
        <div class="info-entity-name">${restaurant.name}</div>
        <div class="info-text">
          ${restaurant.owner_name ? `Attention: <strong>${restaurant.owner_name}</strong><br>` : ''}
          ${restaurant.address ? `${restaurant.address}<br>` : ''}
          ${restaurant.phone ? `Phone: ${restaurant.phone}<br>` : ''}
          ${restaurant.email ? `Email: ${restaurant.email}<br>` : ''}
          ${restaurant.gstin ? `GSTIN: <strong>${restaurant.gstin}</strong>` : ''}
        </div>
      </div>
      <div>
        <div class="info-col-title">Service Details</div>
        <div class="info-entity-name">${plan.name}</div>
        <div class="info-text">
          Billing Cycle: <strong>${(intervalLabel[plan.interval] || plan.interval).toUpperCase()}</strong><br>
          Service Period: <strong>${formatShortDate(payment.period_start)}</strong> to <strong>${formatShortDate(payment.period_end)}</strong><br>
          SAC Code: <strong>997331 (Software as a Service)</strong><br>
          Supply Place: <strong>Maharashtra (27)</strong>
        </div>
      </div>
    </div>

    <div class="table-section">
      <table class="items-table">
        <thead>
          <tr>
            <th style="width:48%;">Description</th>
            <th class="text-center" style="width:10%;">Qty</th>
            <th class="text-right" style="width:14%;">Unit Price</th>
            <th class="text-right" style="width:14%;">Amount</th>
            <th class="text-center" style="width:7%;">GST</th>
            <th class="text-right" style="width:14%;">Tax</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div class="item-desc-title">${plan.name} License</div>
              <ul class="item-features-list">
                ${featuresHTML || '<li>• Full Restaurant POS & Cloud Sync</li>'}
              </ul>
            </td>
            <td class="text-center">1</td>
            <td class="text-right">${formattedSubtotal}</td>
            <td class="text-right">${formattedSubtotal}</td>
            <td class="text-center">18%</td>
            <td class="text-right">₹${totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="summary-wrapper">
      <table class="summary-table">
        <tr>
          <td>Sub Total</td>
          <td class="num">${formattedSubtotal}</td>
        </tr>
        <tr>
          <td>Central GST (CGST 9%)</td>
          <td class="num">${formattedCGST}</td>
        </tr>
        <tr>
          <td>State GST (SGST 9%)</td>
          <td class="num">${formattedSGST}</td>
        </tr>
        <tr class="total-row">
          <td>Total Amount Paid</td>
          <td class="num">${formattedAmount}</td>
        </tr>
      </table>
    </div>

    <div class="payment-box">
      <div class="payment-heading">
        <span>Payment Information</span>
        <span style="font-size:11px;font-weight:600;color:#16a34a;">Status: Verified & Paid</span>
      </div>
      <div class="payment-columns">
        <div>
          <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:8px;">Bank Transfer (NEFT / RTGS / IMPS)</div>
          <div class="bank-details-grid">
            <span class="bank-label">Bank Name</span>
            <span class="bank-val">HDFC Bank</span>
            <span class="bank-label">Account Name</span>
            <span class="bank-val">${COMPANY_NAME}</span>
            <span class="bank-label">Account Number</span>
            <span class="bank-val" style="color:#0f2b5c;font-size:13px;">50200084729103</span>
            <span class="bank-label">IFSC Code</span>
            <span class="bank-val">HDFC0000180</span>
            <span class="bank-label">Branch & Type</span>
            <span class="bank-val">Kothrud, Pune (Current)</span>
          </div>
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:8px;">Scan & Pay with UPI</div>
          <div class="qr-container">
            <img src="${qrCodeUrl}" alt="UPI QR Code" class="qr-code-img" />
            <div class="qr-text-block">
              <strong>Scan any UPI App</strong>
              GPay, PhonePe, Paytm, BHIM<br>
              <div class="upi-badge">UPI: ${upiId}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="txn-info-row">
        ${payment.razorpay_payment_id ? `<div class="txn-info-item">Razorpay Payment ID: <strong>${payment.razorpay_payment_id}</strong></div>` : ''}
        ${payment.razorpay_order_id ? `<div class="txn-info-item">Order ID: <strong>${payment.razorpay_order_id}</strong></div>` : ''}
        <div class="txn-info-item">Payment Method: <strong style="text-transform:capitalize;">${payment.payment_method || 'Online'}</strong></div>
        <div class="txn-info-item">Payment Date: <strong>${formatDate(payment.paid_at)}</strong></div>
      </div>
    </div>

    <div class="terms-section">
      <div class="terms-title">Terms & Conditions</div>
      <ol class="terms-list">
        <li>Software license is non-transferable and valid for the specified subscription duration.</li>
        <li>Payments are non-refundable once the subscription period begins.</li>
        <li>For invoice corrections or tax credits, notify support within 7 days of generation.</li>
      </ol>
      <p style="margin-top:8px;">For support or inquiries: <strong>${COMPANY_EMAIL}</strong> | <strong>${COMPANY_PHONE}</strong></p>
    </div>

    <div class="footer-bar">
      <div>🌐 <a href="${SITE_URL}" target="_blank">${SITE_URL}</a></div>
      <div>© ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.</div>
    </div>
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
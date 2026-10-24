// ─── Subscriber Invoice Generator (Swadeshi Solutions / Tasty Bite Harbor) ──────
// Generates pixel-perfect, modern, aesthetic Invoice & Bill HTML and Email HTML.

export interface InvoiceRestaurantDetails {
  id?: string;
  name: string;
  legal_name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  owner_name?: string;
}

export interface InvoicePlanDetails {
  name: string;
  interval?: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly' | string;
  price: number | string;
  features?: string[];
  hsn_sac?: string;
}

export interface InvoicePaymentDetails {
  invoice_number?: string;
  issue_date?: string;
  due_date?: string;
  status: 'PAID' | 'DUE' | 'PARTIALLY_PAID';
  payment_method?: 'razorpay' | 'upi' | 'bank_transfer' | 'cash' | 'card' | 'net_banking' | string;
  razorpay_payment_id?: string | null;
  razorpay_order_id?: string | null;
  transaction_ref?: string | null;
  period_start?: string;
  period_end?: string;
  amount_paid: number;
  subtotal?: number;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
  discount_amount?: number;
  discount_reason?: string;
  gst_rate?: number; // e.g. 18 for 18%
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
  is_interstate?: boolean;
}

export interface CompanyInvoiceConfig {
  name: string;
  tagline: string;
  address: string;
  cityStatePin: string;
  phone: string;
  email: string;
  website: string;
  gstin?: string;
  pan?: string;
  logoUrl: string;
  bank: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    ifsc: string;
    branch: string;
    accountType: string;
  };
  upi: {
    upiId: string;
    merchantName: string;
  };
}

export const DEFAULT_COMPANY_CONFIG: CompanyInvoiceConfig = {
  name: 'Swadeshi Solutions',
  tagline: 'Restaurant & Hospitality Management Platform',
  address: 'Office 402, Supreme IT Park, Kothrud',
  cityStatePin: 'Pune, Maharashtra 411038',
  phone: '+91 83295 40398',
  email: 'support@swadeshisolutions.com',
  website: 'https://swadeshisolutions.co.in',
  gstin: '', // Skipped per requirements: No GST number currently
  pan: '',   // Skipped per requirements: No PAN number currently
  logoUrl: 'https://clmsoetktmvhazctlans.supabase.co/storage/v1/object/public/images/90bfb05e-129b-45ea-b5e3-519cbd00cfab.png',
  bank: {
    bankName: 'HDFC Bank',
    accountName: 'Swadeshi Solutions',
    accountNumber: '50200084729103',
    ifsc: 'HDFC0000180',
    branch: 'Kothrud, Pune',
    accountType: 'Current Account',
  },
  upi: {
    upiId: '8329540398@hdfcbank',
    merchantName: 'Swadeshi Solutions',
  },
};

export function escapeHtml(str: string | number | undefined | null): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatInr(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(val || 0);
}

export function formatDateString(isoOrDate?: string | Date): string {
  if (!isoOrDate) return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (isNaN(d.getTime())) return String(isoOrDate);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export interface GenerateInvoiceParams {
  restaurant: InvoiceRestaurantDetails;
  plan: InvoicePlanDetails;
  payment: InvoicePaymentDetails;
  company?: Partial<CompanyInvoiceConfig>;
  includeGst?: boolean;
}

export function generateSubscriberInvoiceHTML(params: GenerateInvoiceParams): string {
  const company: CompanyInvoiceConfig = {
    ...DEFAULT_COMPANY_CONFIG,
    ...(params.company || {}),
    bank: { ...DEFAULT_COMPANY_CONFIG.bank, ...(params.company?.bank || {}) },
    upi: { ...DEFAULT_COMPANY_CONFIG.upi, ...(params.company?.upi || {}) },
  };

  const { restaurant, plan, payment } = params;

  // Determine GST application:
  // If company doesn't have a GSTIN, do not charge or show GST by default unless explicitly forced
  const hasCompanyGst = Boolean(company.gstin && company.gstin.trim().length > 0);
  const applyGst = params.includeGst !== undefined ? params.includeGst : hasCompanyGst;
  const gstRate = applyGst ? (payment.gst_rate ?? 18) : 0;
  const isInterstate = !!payment.is_interstate;

  // Gross base subtotal (before discount)
  let grossSubtotal = payment.subtotal;
  const rawPrice = Number(plan.price) || Number(payment.amount_paid) || 0;

  if (!grossSubtotal) {
    if (applyGst && gstRate > 0) {
      grossSubtotal = Math.round((rawPrice / (1 + gstRate / 100)) * 100) / 100;
    } else {
      grossSubtotal = rawPrice;
    }
  }

  // Calculate discount amount
  let discountAmount = 0;
  let discountLabel = payment.discount_reason || 'Special Discount';
  if (payment.discount_type === 'percentage' && payment.discount_value && payment.discount_value > 0) {
    discountAmount = Math.round(((grossSubtotal * payment.discount_value) / 100) * 100) / 100;
    discountLabel = `${discountLabel} (${payment.discount_value}%)`;
  } else if (payment.discount_type === 'fixed' && payment.discount_value && payment.discount_value > 0) {
    discountAmount = Math.min(grossSubtotal, Math.round(payment.discount_value * 100) / 100);
    discountLabel = `${discountLabel} (Flat Cash Off)`;
  } else if (payment.discount_amount && payment.discount_amount > 0) {
    discountAmount = Math.min(grossSubtotal, Math.round(payment.discount_amount * 100) / 100);
  }

  // Taxable subtotal after discount
  const taxableSubtotal = Math.max(0, Math.round((grossSubtotal - discountAmount) * 100) / 100);
  const totalTax = applyGst ? Math.round(taxableSubtotal * (gstRate / 100) * 100) / 100 : 0;
  const totalAmount = Math.round((taxableSubtotal + totalTax) * 100) / 100;

  const cgstAmount = isInterstate ? 0 : Math.round((totalTax / 2) * 100) / 100;
  const sgstAmount = isInterstate ? 0 : Math.round((totalTax - cgstAmount) * 100) / 100;
  const igstAmount = isInterstate ? totalTax : 0;

  const invoiceNo = payment.invoice_number || `INV-SUB-${Date.now().toString(36).toUpperCase()}`;
  const issueDate = formatDateString(payment.issue_date || new Date());
  const dueDate = formatDateString(payment.due_date || payment.period_start || new Date());
  const periodStart = formatDateString(payment.period_start);
  const periodEnd = formatDateString(payment.period_end);

  const isPaid = payment.status === 'PAID';
  const statusColor = isPaid ? '#059669' : '#d97706';
  const statusBg = isPaid ? '#ecfdf5' : '#fffbeb';
  const statusBorder = isPaid ? '#a7f3d0' : '#fde68a';
  const statusLabel = isPaid ? '✓ PAID & ACTIVE' : '⚠ PAYMENT DUE';

  // Invoice Title
  const invoiceDocTitle = applyGst ? 'Tax Invoice / Bill' : 'Subscription Invoice & Bill';

  // Generate UPI QR Code URL
  const upiPayLink = `upi://pay?pa=${encodeURIComponent(company.upi.upiId)}&pn=${encodeURIComponent(company.upi.merchantName)}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(`Invoice ${invoiceNo}`)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiPayLink)}&color=0f2b5c`;

  // Feature list
  const defaultFeatures = [
    'Full POS, Kitchen & Billing Suite',
    'Inventory & Realtime Analytics',
    'Cloud Sync & Unlimited Staff Accounts',
  ];
  const activeFeatures = (plan.features && plan.features.length > 0) ? plan.features.slice(0, 5) : defaultFeatures;
  const featuresList = activeFeatures.map((f) => `
    <li style="margin-bottom:4px;font-size:12px;color:#475569;display:flex;align-items:center;gap:6px;">
      <span style="color:#0284c7;font-weight:700;">✓</span> ${escapeHtml(f)}
    </li>
  `).join('');

  // Tax/GST Header block string (only if GSTIN or PAN exists)
  const taxIdElements: string[] = [];
  if (company.gstin && company.gstin.trim()) taxIdElements.push(`GSTIN: <strong>${escapeHtml(company.gstin)}</strong>`);
  if (company.pan && company.pan.trim()) taxIdElements.push(`PAN: <strong>${escapeHtml(company.pan)}</strong>`);
  const taxIdHtml = taxIdElements.length > 0
    ? `<div class="tax-id-strip">${taxIdElements.join(' &nbsp;|&nbsp; ')}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(invoiceDocTitle)} - ${escapeHtml(invoiceNo)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', Helvetica, Arial, sans-serif; }
    body { background-color: #f1f5f9; color: #0f172a; padding: 24px 12px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    
    .invoice-card {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 12px 40px -10px rgba(15, 23, 42, 0.08), 0 0 1px 1px rgba(15, 23, 42, 0.05);
      border: 1px solid #e2e8f0;
    }
    
    /* Top sleek ambient gradient bar */
    .top-accent-bar {
      height: 6px;
      background: linear-gradient(90deg, #1e3a8a 0%, #2563eb 45%, #f97316 100%);
    }
    
    /* Header */
    .header-section {
      padding: 32px 36px 26px 36px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      background: #ffffff;
      border-bottom: 1px solid #f1f5f9;
    }
    .brand-group {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .brand-logo-frame {
      width: 58px;
      height: 58px;
      border-radius: 14px;
      background: #f8fafc;
      padding: 4px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 10px rgba(15, 23, 42, 0.04);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
    }
    .brand-logo {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 10px;
    }
    .brand-name {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .brand-name span { color: #f97316; }
    .verified-pill {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 10.5px;
      font-weight: 700;
      color: #0284c7;
      background: #e0f2fe;
      padding: 2px 7px;
      border-radius: 999px;
      letter-spacing: 0.2px;
    }
    .brand-sub {
      font-size: 12.5px;
      color: #64748b;
      font-weight: 500;
      margin-top: 3px;
    }
    .brand-contact-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 6px;
      font-size: 11.5px;
      color: #64748b;
    }
    .brand-contact-pills span {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .tax-id-strip {
      margin-top: 6px;
      font-size: 11px;
      color: #475569;
      background: #f1f5f9;
      padding: 2px 8px;
      border-radius: 4px;
      display: inline-block;
    }

    .invoice-title-block {
      text-align: right;
    }
    .invoice-title {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.3px;
      text-transform: uppercase;
    }
    .invoice-number-tag {
      display: inline-block;
      margin-top: 6px;
      background: #f1f5f9;
      color: #0f172a;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      font-weight: 700;
      padding: 3px 9px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .meta-line {
      font-size: 12px;
      color: #64748b;
      margin-top: 4px;
    }
    .meta-line strong {
      color: #1e293b;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.4px;
      margin-top: 8px;
      border: 1px solid;
    }

    /* 2-Column Info Grid */
    .info-grid {
      padding: 22px 36px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      background: #fafafa;
      border-bottom: 1px solid #f1f5f9;
    }
    .info-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 16px 18px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.02);
    }
    .info-col-title {
      font-size: 10.5px;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.8px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .info-col-title span {
      display: inline-block;
      width: 6px;
      height: 6px;
      background: #3b82f6;
      border-radius: 50%;
    }
    .info-entity-name {
      font-size: 15.5px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .info-text {
      font-size: 12.5px;
      color: #475569;
      line-height: 1.6;
    }
    .plan-cycle-pill {
      display: inline-block;
      background: #f0fdf4;
      color: #166534;
      font-size: 10.5px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      border: 1px solid #bbf7d0;
      margin-top: 2px;
    }

    /* Table */
    .table-section {
      padding: 26px 36px 12px 36px;
    }
    .items-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }
    .items-table thead tr {
      background: #0f172a;
      color: #ffffff;
    }
    .items-table th {
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      text-align: left;
    }
    .items-table th.text-right, .items-table td.text-right { text-align: right; }
    .items-table th.text-center, .items-table td.text-center { text-align: center; }
    .items-table tbody tr {
      background: #ffffff;
    }
    .items-table td {
      padding: 16px;
      font-size: 13px;
      color: #1e293b;
      vertical-align: top;
      border-bottom: 1px solid #f1f5f9;
    }
    .item-desc-title {
      font-weight: 700;
      color: #0f172a;
      font-size: 14px;
      margin-bottom: 6px;
    }
    .item-features-list {
      list-style: none;
      margin-top: 6px;
      padding-left: 0;
    }
    .discount-pill {
      margin-top: 8px;
      font-size: 11.5px;
      color: #15803d;
      font-weight: 600;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 9px;
      border-radius: 6px;
    }

    /* Summary Block */
    .summary-wrapper {
      display: flex;
      justify-content: flex-end;
      padding: 8px 36px 24px 36px;
    }
    .summary-table {
      width: 340px;
      border-collapse: collapse;
      border-radius: 12px;
      overflow: hidden;
    }
    .summary-table td {
      padding: 7px 12px;
      font-size: 12.5px;
      color: #475569;
    }
    .summary-table td.num {
      text-align: right;
      font-weight: 600;
      color: #0f172a;
    }
    .total-row td {
      background: #0f172a;
      color: #ffffff !important;
      padding: 12px 14px;
      font-size: 14px;
      font-weight: 700;
      border-radius: 8px;
    }
    .total-row td.num {
      font-size: 18px;
      font-weight: 800;
      color: #ffffff !important;
    }

    /* Payment Information Card */
    .payment-box {
      margin: 8px 36px 24px 36px;
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 16px;
      padding: 20px 24px;
    }
    .payment-heading {
      font-size: 13.5px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 10px;
    }
    .payment-columns {
      display: grid;
      grid-template-columns: 1.35fr 1fr;
      gap: 24px;
      align-items: center;
    }
    
    .bank-details-grid {
      display: grid;
      grid-template-columns: 110px 1fr;
      gap: 6px 12px;
      font-size: 12.5px;
    }
    .bank-label {
      color: #64748b;
      font-weight: 500;
    }
    .bank-val {
      color: #0f172a;
      font-weight: 700;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12.5px;
    }
    
    .qr-container {
      display: flex;
      align-items: center;
      gap: 14px;
      background: #ffffff;
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
    }
    .qr-code-img {
      width: 90px;
      height: 90px;
      object-fit: contain;
      border-radius: 8px;
    }
    .qr-text-block {
      font-size: 11.5px;
      color: #475569;
      line-height: 1.45;
    }
    .qr-text-block strong {
      color: #0f172a;
      font-size: 12.5px;
      display: block;
      margin-bottom: 2px;
    }
    .upi-badge {
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 10.5px;
      font-weight: 700;
      margin-top: 5px;
      display: inline-block;
      font-family: monospace;
    }

    .txn-info-row {
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px dashed #cbd5e1;
      font-size: 12px;
      color: #64748b;
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }
    .txn-info-item strong {
      color: #0f172a;
      font-weight: 600;
    }

    /* Terms */
    .terms-section {
      padding: 0 36px 22px 36px;
      font-size: 11.5px;
      color: #64748b;
      line-height: 1.55;
    }
    .terms-title {
      font-weight: 700;
      color: #334155;
      margin-bottom: 4px;
    }
    .terms-list {
      padding-left: 16px;
    }
    
    /* Footer */
    .footer-bar {
      background: #0f172a;
      color: #94a3b8;
      padding: 14px 36px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11.5px;
    }
    .footer-bar a {
      color: #60a5fa;
      text-decoration: none;
      font-weight: 600;
    }

    @media print {
      body { background: #ffffff; padding: 0; }
      .invoice-card { box-shadow: none; border: none; max-width: 100%; border-radius: 0; }
      .no-print { display: none !important; }
    }

    @media (max-width: 640px) {
      .header-section { flex-direction: column; }
      .invoice-title-block { text-align: left; margin-top: 12px; }
      .info-grid { grid-template-columns: 1fr; gap: 14px; padding: 18px; }
      .table-section { padding: 18px; }
      .summary-wrapper { padding: 8px 18px 18px 18px; justify-content: stretch; }
      .summary-table { width: 100%; }
      .payment-box { margin: 8px 18px 18px 18px; }
      .payment-columns { grid-template-columns: 1fr; }
      .terms-section { padding: 0 18px 18px 18px; }
      .footer-bar { flex-direction: column; gap: 6px; text-align: center; padding: 14px 18px; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <!-- Top Gradient Bar -->
    <div class="top-accent-bar"></div>

    <!-- Header Section -->
    <div class="header-section">
      <div class="brand-group">
        <div class="brand-logo-frame">
          <img
            src="${company.logoUrl}"
            alt="${escapeHtml(company.name)}"
            class="brand-logo"
            onerror="this.onerror=null;this.src='/swadeshi-logo2.png';"
          />
        </div>
        <div>
          <h1 class="brand-name">
            ${escapeHtml(company.name.split(' ')[0])} <span>${escapeHtml(company.name.split(' ').slice(1).join(' ') || '')}</span>
            <span class="verified-pill">✓ Verified Platform</span>
          </h1>
          <p class="brand-sub">${escapeHtml(company.tagline)}</p>
          <div class="brand-contact-pills">
            <span>📍 ${escapeHtml(company.address)}, ${escapeHtml(company.cityStatePin)}</span>
            <span>📞 ${escapeHtml(company.phone)}</span>
            <span>✉️ ${escapeHtml(company.email)}</span>
          </div>
          ${taxIdHtml}
        </div>
      </div>
      <div class="invoice-title-block">
        <div class="invoice-title">${escapeHtml(invoiceDocTitle)}</div>
        <div class="invoice-number-tag">${escapeHtml(invoiceNo)}</div>
        <p class="meta-line">Issue Date: <strong>${escapeHtml(issueDate)}</strong></p>
        <p class="meta-line">Due Date: <strong>${escapeHtml(dueDate)}</strong></p>
        <div class="status-badge" style="background:${statusBg};color:${statusColor};border-color:${statusBorder};">
          ${statusLabel}
        </div>
      </div>
    </div>

    <!-- 2-Column Info Grid -->
    <div class="info-grid">
      <div class="info-card">
        <div class="info-col-title"><span></span> BILL TO (SUBSCRIBER)</div>
        <div class="info-entity-name">${escapeHtml(restaurant.name || 'Subscriber Restaurant')}</div>
        <div class="info-text">
          ${restaurant.owner_name ? `Attention: <strong>${escapeHtml(restaurant.owner_name)}</strong><br>` : ''}
          ${restaurant.address ? `${escapeHtml(restaurant.address)}<br>` : ''}
          ${restaurant.city ? `${escapeHtml(restaurant.city)}, ` : ''}${restaurant.state ? `${escapeHtml(restaurant.state)} ` : ''}${escapeHtml(restaurant.pincode || '')}<br>
          ${restaurant.phone ? `Phone: <strong>${escapeHtml(restaurant.phone)}</strong><br>` : ''}
          ${restaurant.email ? `Email: <strong>${escapeHtml(restaurant.email)}</strong><br>` : ''}
          ${restaurant.gstin ? `Subscriber GSTIN: <strong>${escapeHtml(restaurant.gstin)}</strong>` : ''}
        </div>
      </div>

      <div class="info-card">
        <div class="info-col-title"><span></span> SUBSCRIPTION DETAILS</div>
        <div class="info-entity-name">${escapeHtml(plan.name)}</div>
        <div class="info-text">
          Billing Cycle: <span class="plan-cycle-pill">${escapeHtml(plan.interval ? plan.interval.toUpperCase() : 'SUBSCRIPTION')}</span><br>
          Service Period: <strong>${escapeHtml(periodStart)}</strong> to <strong>${escapeHtml(periodEnd)}</strong><br>
          SAC Code: <strong>${escapeHtml(plan.hsn_sac || '997331 (Software as a Service)')}</strong><br>
          Place of Supply: <strong>${escapeHtml(restaurant.state || 'Maharashtra (27)')}</strong>
        </div>
      </div>
    </div>

    <!-- Pricing Table -->
    <div class="table-section">
      <table class="items-table">
        <thead>
          <tr>
            <th style="width:${applyGst ? '46%' : '60%'};">Description</th>
            <th class="text-center" style="width:10%;">Qty</th>
            <th class="text-right" style="width:15%;">Unit Price</th>
            <th class="text-right" style="width:15%;">Amount</th>
            ${applyGst ? `
            <th class="text-center" style="width:7%;">GST</th>
            <th class="text-right" style="width:14%;">Tax</th>
            ` : ''}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div class="item-desc-title">${escapeHtml(plan.name)} License</div>
              <ul class="item-features-list">
                ${featuresList}
              </ul>
              ${discountAmount > 0 ? `
              <div class="discount-pill">
                🏷️ ${escapeHtml(discountLabel)}: -${formatInr(discountAmount)}
              </div>` : ''}
            </td>
            <td class="text-center" style="font-weight:600;">1</td>
            <td class="text-right" style="font-weight:600;">${formatInr(grossSubtotal)}</td>
            <td class="text-right" style="font-weight:700;">${formatInr(taxableSubtotal)}</td>
            ${applyGst ? `
            <td class="text-center">${gstRate}%</td>
            <td class="text-right" style="font-weight:600;">${formatInr(totalTax)}</td>
            ` : ''}
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Summary Box -->
    <div class="summary-wrapper">
      <table class="summary-table">
        ${discountAmount > 0 ? `
        <tr>
          <td>Base Price</td>
          <td class="num">${formatInr(grossSubtotal)}</td>
        </tr>
        <tr>
          <td style="color:#15803d;font-weight:600;">${escapeHtml(discountLabel)}</td>
          <td class="num" style="color:#15803d;font-weight:700;">-${formatInr(discountAmount)}</td>
        </tr>
        <tr>
          <td style="font-weight:600;color:#0f172a;">${applyGst ? 'Taxable Amount' : 'Net Amount'}</td>
          <td class="num" style="font-weight:700;color:#0f172a;">${formatInr(taxableSubtotal)}</td>
        </tr>
        ` : `
        <tr>
          <td>Sub Total</td>
          <td class="num">${formatInr(taxableSubtotal)}</td>
        </tr>
        `}
        ${applyGst ? (
          !isInterstate ? `
          <tr>
            <td>Central GST (CGST 9%)</td>
            <td class="num">${formatInr(cgstAmount)}</td>
          </tr>
          <tr>
            <td>State GST (SGST 9%)</td>
            <td class="num">${formatInr(sgstAmount)}</td>
          </tr>
          ` : `
          <tr>
            <td>Integrated GST (IGST 18%)</td>
            <td class="num">${formatInr(igstAmount)}</td>
          </tr>
          `
        ) : ''}
        <tr class="total-row">
          <td>${isPaid ? 'Total Amount Paid' : 'Total Amount Due'}</td>
          <td class="num">${formatInr(totalAmount)}</td>
        </tr>
      </table>
    </div>

    <!-- Payment Information Box -->
    <div class="payment-box">
      <div class="payment-heading">
        <span>Payment & Banking Details</span>
        <span style="font-size:11px;font-weight:600;color:#64748b;">
          ${isPaid ? 'Status: ' + escapeHtml((payment.payment_method || 'Online').toUpperCase()) : 'Instant Payment Verification'}
        </span>
      </div>

      <div class="payment-columns">
        <!-- Bank Transfer Details -->
        <div>
          <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:8px;letter-spacing:0.4px;">
            Bank Transfer (NEFT / RTGS / IMPS)
          </div>
          <div class="bank-details-grid">
            <span class="bank-label">Bank Name</span>
            <span class="bank-val">${escapeHtml(company.bank.bankName)}</span>
            
            <span class="bank-label">Account Name</span>
            <span class="bank-val">${escapeHtml(company.bank.accountName)}</span>
            
            <span class="bank-label">Account Number</span>
            <span class="bank-val" style="color:#1d4ed8;font-size:13px;letter-spacing:0.5px;">${escapeHtml(company.bank.accountNumber)}</span>
            
            <span class="bank-label">IFSC Code</span>
            <span class="bank-val">${escapeHtml(company.bank.ifsc)}</span>
            
            <span class="bank-label">Branch & Type</span>
            <span class="bank-val">${escapeHtml(company.bank.branch)} (${escapeHtml(company.bank.accountType)})</span>
          </div>
        </div>

        <!-- Scan & Pay UPI -->
        <div>
          <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:8px;letter-spacing:0.4px;">
            Scan & Pay with UPI
          </div>
          <div class="qr-container">
            <img src="${qrCodeUrl}" alt="UPI QR Code" class="qr-code-img" />
            <div class="qr-text-block">
              <strong>Scan using any UPI App</strong>
              GPay, PhonePe, Paytm, BHIM<br>
              <div class="upi-badge">UPI: ${escapeHtml(company.upi.upiId)}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Transaction details if paid or verification instructions -->
      ${isPaid && (payment.razorpay_payment_id || payment.transaction_ref) ? `
      <div class="txn-info-row">
        ${payment.razorpay_payment_id ? `<div class="txn-info-item">Payment Ref: <strong>${escapeHtml(payment.razorpay_payment_id)}</strong></div>` : ''}
        ${payment.razorpay_order_id ? `<div class="txn-info-item">Order ID: <strong>${escapeHtml(payment.razorpay_order_id)}</strong></div>` : ''}
        ${payment.transaction_ref ? `<div class="txn-info-item">Ref No: <strong>${escapeHtml(payment.transaction_ref)}</strong></div>` : ''}
        <div class="txn-info-item">Payment Verification: <strong style="color:#059669;">Verified & Authenticated</strong></div>
      </div>
      ` : `
      <div class="txn-info-row">
        <div class="txn-info-item">💡 After payment, send transaction screenshot & UTR to <strong>${escapeHtml(company.phone)}</strong> or <strong>${escapeHtml(company.email)}</strong> for instant license activation.</div>
      </div>
      `}
    </div>

    <!-- Terms & Conditions -->
    <div class="terms-section">
      <div class="terms-title">Terms & Conditions:</div>
      <ol class="terms-list">
        <li>Software subscription is valid for the specified period and includes updates and cloud support.</li>
        <li>Payments once processed are non-refundable once the subscription active cycle commences.</li>
        <li>This document is a computer-generated invoice and requires no physical signature.</li>
      </ol>
      <p style="margin-top:8px;">For support or inquiries: <strong>${escapeHtml(company.email)}</strong> | <strong>${escapeHtml(company.phone)}</strong></p>
    </div>

    <!-- Footer Bar -->
    <div class="footer-bar">
      <div>🌐 <a href="${escapeHtml(company.website)}" target="_blank">${escapeHtml(company.website.replace('https://', ''))}</a></div>
      <div>© ${new Date().getFullYear()} ${escapeHtml(company.name)}. All rights reserved.</div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Subscriber Invoice Email HTML Generator ─────────────────────────────────
// Generates an attractive, context-rich HTML email template ready for Resend/Titan/SMTP

export interface GenerateInvoiceEmailParams extends GenerateInvoiceParams {
  customMessage?: string;
  senderName?: string;
  hasPdfAttachment?: boolean;
  includeSignature?: boolean;
}

export function generateSubscriberInvoiceEmailHTML(params: GenerateInvoiceEmailParams): {
  subject: string;
  html: string;
} {
  const company: CompanyInvoiceConfig = {
    ...DEFAULT_COMPANY_CONFIG,
    ...(params.company || {}),
    bank: { ...DEFAULT_COMPANY_CONFIG.bank, ...(params.company?.bank || {}) },
    upi: { ...DEFAULT_COMPANY_CONFIG.upi, ...(params.company?.upi || {}) },
  };

  const { restaurant, plan, payment, customMessage } = params;

  const hasCompanyGst = Boolean(company.gstin && company.gstin.trim().length > 0);
  const applyGst = params.includeGst !== undefined ? params.includeGst : hasCompanyGst;
  const gstRate = applyGst ? (payment.gst_rate ?? 18) : 0;

  // Base Subtotal & Discounts
  let grossSubtotal = payment.subtotal;
  const rawPrice = Number(plan.price) || Number(payment.amount_paid) || 0;
  if (!grossSubtotal) {
    grossSubtotal = applyGst && gstRate > 0
      ? Math.round((rawPrice / (1 + gstRate / 100)) * 100) / 100
      : rawPrice;
  }

  let discountAmount = 0;
  let discountLabel = payment.discount_reason || 'Discount Applied';
  if (payment.discount_type === 'percentage' && payment.discount_value && payment.discount_value > 0) {
    discountAmount = Math.round(((grossSubtotal * payment.discount_value) / 100) * 100) / 100;
    discountLabel = `${discountLabel} (${payment.discount_value}%)`;
  } else if (payment.discount_type === 'fixed' && payment.discount_value && payment.discount_value > 0) {
    discountAmount = Math.min(grossSubtotal, Math.round(payment.discount_value * 100) / 100);
    discountLabel = `${discountLabel} (Flat Cash Off)`;
  } else if (payment.discount_amount && payment.discount_amount > 0) {
    discountAmount = Math.min(grossSubtotal, Math.round(payment.discount_amount * 100) / 100);
  }

  const taxableSubtotal = Math.max(0, Math.round((grossSubtotal - discountAmount) * 100) / 100);
  const totalTax = applyGst ? Math.round(taxableSubtotal * (gstRate / 100) * 100) / 100 : 0;
  const totalAmount = Math.round((taxableSubtotal + totalTax) * 100) / 100;

  const invoiceNo = payment.invoice_number || `INV-SUB-${Date.now().toString(36).toUpperCase()}`;
  const issueDate = formatDateString(payment.issue_date || new Date());
  const dueDate = formatDateString(payment.due_date || payment.period_start || new Date());
  const periodStart = formatDateString(payment.period_start);
  const periodEnd = formatDateString(payment.period_end);

  const isPaid = payment.status === 'PAID';
  const statusLabel = isPaid ? 'PAID & ACTIVE' : 'PAYMENT DUE';
  const statusColor = isPaid ? '#059669' : '#d97706';
  const statusBg = isPaid ? '#ecfdf5' : '#fffbeb';

  // Email subject
  const subject = isPaid
    ? `Subscription Invoice & Receipt: ${plan.name} - ${restaurant.name} [${invoiceNo}]`
    : `Subscription Invoice & Payment Due: ${plan.name} - ${restaurant.name} [${invoiceNo}]`;

  // Public Logo URL for emails (uses live Swadeshi Solutions domain)
  const publicLogoUrl = company.logoUrl && company.logoUrl.startsWith('http')
    ? company.logoUrl
    : `https://swadeshisolutions.co.in${company.logoUrl && company.logoUrl.startsWith('/') ? '' : '/'}${company.logoUrl || 'swadeshi-logo2.png'}`;

  // Escaped safe values for template rendering
  const safeCompany = {
    name: escapeHtml(company.name),
    tagline: escapeHtml(company.tagline),
    phone: escapeHtml(company.phone),
    email: escapeHtml(company.email),
    website: escapeHtml(company.website),
    bank: {
      bankName: escapeHtml(company.bank.bankName),
      accountName: escapeHtml(company.bank.accountName),
      accountNumber: escapeHtml(company.bank.accountNumber),
      ifsc: escapeHtml(company.bank.ifsc),
      branch: escapeHtml(company.bank.branch),
      accountType: escapeHtml(company.bank.accountType),
    },
    upi: {
      upiId: escapeHtml(company.upi.upiId),
      merchantName: escapeHtml(company.upi.merchantName),
    },
  };

  const safeRestaurant = {
    name: escapeHtml(restaurant.name),
    owner_name: escapeHtml(restaurant.owner_name),
  };

  const safePlan = {
    name: escapeHtml(plan.name),
    interval: escapeHtml(plan.interval || 'Monthly'),
  };

  const safeInvoiceNo = escapeHtml(invoiceNo);
  const safeDiscountLabel = escapeHtml(discountLabel);

  // Default note keeps generator-controlled HTML tags (<strong>) unescaped, but interpolates escaped plan name
  const defaultNote = isPaid
    ? `We are pleased to provide your official subscription invoice and payment receipt for <strong>${safePlan.name}</strong>. Your license is fully active and cloud synchronization is operational across all your POS terminals.`
    : `Your subscription invoice for <strong>${safePlan.name}</strong> has been generated and is now due for renewal. To ensure uninterrupted POS and kitchen billing operations, kindly process the payment using the details below.`;

  // If customMessage is provided, escape it before converting newlines to HTML line breaks
  let finalMessage = defaultNote;
  if (customMessage && customMessage.trim().length > 0) {
    finalMessage = escapeHtml(customMessage).replace(/\n/g, '<br>');
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; margin: 0 auto;">
          
          <!-- Top Accent Bar -->
          <tr>
            <td style="height: 6px; background: linear-gradient(90deg, #1e3a8a 0%, #2563eb 50%, #f97316 100%); font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Header with Logo -->
          <tr>
            <td style="padding: 28px 32px 20px 32px; border-bottom: 1px solid #f1f5f9;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="vertical-align: middle;">
                    <table cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="vertical-align: middle; padding-right: 12px;">
                          <img src="${publicLogoUrl}" alt="${safeCompany.name}" width="48" height="48" style="display: block; border-radius: 10px; border: 1px solid #e2e8f0;" />
                        </td>
                        <td style="vertical-align: middle;">
                          <div style="font-size: 20px; font-weight: 800; color: #0f172a; line-height: 1.2;">
                            Swadeshi <span style="color: #f97316;">Solutions</span>
                          </div>
                          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                            ${safeCompany.tagline}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <div style="display: inline-block; padding: 4px 12px; border-radius: 999px; background-color: ${statusBg}; color: ${statusColor}; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; border: 1px solid #cbd5e1;">
                      ${statusLabel}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting & High Context Message -->
          <tr>
            <td style="padding: 24px 32px 16px 32px;">
              <h2 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 700; color: #0f172a;">
                Hello ${safeRestaurant.owner_name || safeRestaurant.name},
              </h2>
              <div style="font-size: 13.5px; color: #475569; line-height: 1.6;">
                ${finalMessage}
              </div>
            </td>
          </tr>

          <!-- Key Highlights Card -->
          <tr>
            <td style="padding: 0 32px 20px 32px;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 16px;">
                <tr>
                  <td width="50%" style="padding: 6px 12px; vertical-align: top;">
                    <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px;">Invoice Number</div>
                    <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; font-family: monospace;">${safeInvoiceNo}</div>
                  </td>
                  <td width="50%" style="padding: 6px 12px; vertical-align: top;">
                    <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px;">Plan & Billing Cycle</div>
                    <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px;">${safePlan.name} (${safePlan.interval.toUpperCase()})</div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding: 6px 12px; vertical-align: top;">
                    <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px;">Service Period</div>
                    <div style="font-size: 12.5px; color: #334155; margin-top: 2px;">${periodStart} to ${periodEnd}</div>
                  </td>
                  <td width="50%" style="padding: 6px 12px; vertical-align: top;">
                    <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px;">Amount ${isPaid ? 'Paid' : 'Due'}</div>
                    <div style="font-size: 16px; font-weight: 800; color: #1e3a8a; margin-top: 2px;">${formatInr(totalAmount)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${params.hasPdfAttachment ? `
          <!-- PDF Attachment Notice -->
          <tr>
            <td style="padding: 0 32px 16px 32px;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 10px 14px;">
                <tr>
                  <td width="26" style="vertical-align: middle; font-size: 16px;">📎</td>
                  <td style="vertical-align: middle; font-size: 12px; color: #475569;">
                    <strong style="color: #0f172a;">PDF Invoice Attached:</strong> Official printable document (<strong>${safeInvoiceNo}.pdf</strong>) is attached to this email.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Itemized Breakdown -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0" style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; border-collapse: separate;">
                <thead>
                  <tr style="background-color: #0f172a; color: #ffffff;">
                    <th style="padding: 10px 14px; font-size: 11px; font-weight: 700; text-align: left; text-transform: uppercase;">Service Description</th>
                    <th style="padding: 10px 14px; font-size: 11px; font-weight: 700; text-align: right; text-transform: uppercase;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding: 14px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #1e293b;">
                      <strong>${safePlan.name} License</strong>
                      <div style="font-size: 11.5px; color: #64748b; margin-top: 4px;">
                        Full Cloud POS, Kitchen Order System & Business Suite
                      </div>
                      ${discountAmount > 0 ? `
                      <div style="margin-top: 6px; font-size: 11px; color: #15803d; font-weight: 600;">
                        🏷️ ${safeDiscountLabel}: -${formatInr(discountAmount)}
                      </div>` : ''}
                    </td>
                    <td style="padding: 14px; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 700; text-align: right; color: #0f172a;">
                      ${formatInr(taxableSubtotal)}
                    </td>
                  </tr>
                  ${applyGst ? `
                  <tr>
                    <td style="padding: 8px 14px; font-size: 12px; color: #64748b;">GST (${gstRate}%)</td>
                    <td style="padding: 8px 14px; font-size: 12px; font-weight: 600; text-align: right; color: #0f172a;">${formatInr(totalTax)}</td>
                  </tr>
                  ` : ''}
                  <tr style="background-color: #f8fafc;">
                    <td style="padding: 12px 14px; font-size: 13px; font-weight: 700; color: #0f172a;">Total ${isPaid ? 'Amount Paid' : 'Amount Due'}</td>
                    <td style="padding: 12px 14px; font-size: 16px; font-weight: 800; text-align: right; color: #0f172a;">${formatInr(totalAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Payment Instructions (If DUE) -->
          ${!isPaid ? `
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px;">
                <tr>
                  <td>
                    <div style="font-size: 13px; font-weight: 700; color: #1e3a8a; margin-bottom: 8px;">
                      Bank Transfer / UPI Payment Instructions
                    </div>
                    <div style="font-size: 12px; color: #1e293b; line-height: 1.6;">
                      <strong>Bank:</strong> ${safeCompany.bank.bankName}<br>
                      <strong>Account Name:</strong> ${safeCompany.bank.accountName}<br>
                      <strong>Account No:</strong> <span style="font-family: monospace; font-weight: 700; color: #1d4ed8;">${safeCompany.bank.accountNumber}</span><br>
                      <strong>IFSC:</strong> ${safeCompany.bank.ifsc} | <strong>Branch:</strong> ${safeCompany.bank.branch}<br>
                      <strong>UPI ID:</strong> <span style="font-family: monospace; font-weight: 700; color: #1d4ed8;">${safeCompany.upi.upiId}</span>
                    </div>
                    <div style="margin-top: 10px; font-size: 11.5px; color: #475569;">
                      After transferring, kindly reply to this email or send a screenshot to <strong>${safeCompany.phone}</strong>.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : `
          <tr>
            <td style="padding: 0 32px 20px 32px;">
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 12px 16px; font-size: 12px; color: #15803d; line-height: 1.5;">
                ✓ <strong>Payment Authenticated:</strong> Thank you for your payment. Your receipt is registered in our platform and your subscription is active.
              </div>
            </td>
          </tr>
          `}

          <!-- Support & Assistance -->
          <tr>
            <td style="padding: 0 32px 28px 32px; border-bottom: 1px solid #f1f5f9;">
              <div style="font-size: 12.5px; color: #64748b; line-height: 1.5;">
                Need help or have questions about your billing? Our dedicated support team is available 24/7:<br>
                📞 Phone / WhatsApp: <a href="tel:${safeCompany.phone}" style="color: #2563eb; text-decoration: none; font-weight: 600;">${safeCompany.phone}</a> | 
                ✉️ Email: <a href="mailto:${safeCompany.email}" style="color: #2563eb; text-decoration: none; font-weight: 600;">${safeCompany.email}</a>
              </div>
            </td>
          </tr>

          <!-- Official Executive Signature Block (Swadeshi Sudip Official) -->
          ${params.includeSignature !== false ? `
          <tr>
            <td style="padding: 24px 32px; background-color: #ffffff; border-top: 1px solid #f1f5f9;">
              <table cellpadding="0" cellspacing="0" border="0" style="background: transparent; border-collapse: collapse; width: 100%;" width="100%">
                <tbody valign="middle">
                  <tr valign="inherit">
                    <td style="padding-right: 25px; vertical-align: middle;" valign="middle">
                      <a href="https://www.swadeshisolutions.co.in" target="_blank">&nbsp;&nbsp;<img src="https://clmsoetktmvhazctlans.supabase.co/storage/v1/object/public/images/90bfb05e-129b-45ea-b5e3-519cbd00cfab.png" alt="Swadeshi Solutions" width="150" style="width: 150px; max-width: 150px; display: block; border: 0px;"></a>
                    </td>
                    <td style="border-left: 2px solid #0056b3; padding-left: 25px; vertical-align: middle;" valign="middle">
                      <strong style="font-size: 16px; color: #111111; letter-spacing: 0.5px;">Sudip Jangam</strong>
                      <br><span style="color: #666666; font-size: 13px;">Chief Technology Officer</span>
                      <br><span style="color: #0056b3; font-size: 13px; font-weight: bold; display: inline-block; margin-top: 2px;">Swadeshi Solutions</span>
                      <br><span style="color: rgb(0, 86, 179); font-size: 13px; font-weight: bold; display: inline-block; margin-top: 2px; font-family: sans-serif, arial;">&nbsp; 830-890-3224</span>
                      <div style="margin-top: 12px; font-size: 13px; color: #555555;">
                        <span style="display: inline-block; vertical-align: middle; margin-right: 6px;"><img src="https://cdn-icons-png.flaticon.com/16/542/542689.png" width="13" height="13" style="display: block; border: 0px;" alt="Email icon"></span> <a href="mailto:sudipjangam@swadeshisolutions.co.in" style="color: #0056b3; text-decoration: none;">sudipjangam@swadeshisolutions.co.in</a>
                        <br><span style="display: inline-block; vertical-align: middle; margin-right: 6px; margin-top: 4px;"><img src="https://cdn-icons-png.flaticon.com/16/1006/1006771.png" width="13" height="13" style="display: block; border: 0px;" alt="Web icon"></span> <a href="https://www.swadeshisolutions.co.in" target="_blank" style="color: #0056b3; text-decoration: none;">www.swadeshisolutions.co.in</a>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div style="margin-top: 14px; border-top: 1px solid #eeeeee; padding-top: 6px; font-size: 11px; color: #888888; font-style: italic; max-width: 420px;">Next-gen Restaurant Management Systems</div>
            </td>
          </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0f172a; text-align: center; color: #94a3b8; font-size: 11px;">
              <div style="margin-bottom: 6px;">
                <a href="${safeCompany.website}" style="color: #60a5fa; text-decoration: none; font-weight: 600;">${safeCompany.website}</a>
              </div>
              <div>© ${new Date().getFullYear()} ${safeCompany.name}. All rights reserved.</div>
              <div style="margin-top: 4px; color: #64748b;">This is a system-generated subscription communication.</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

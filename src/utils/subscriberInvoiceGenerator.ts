// ─── Subscriber Invoice Generator (Swadeshi Solutions / Tasty Bite Harbor) ──────
// Generates pixel-perfect Tax Invoice & Bill HTML matching RestoServe/Swadeshi standard.

export interface InvoiceRestaurantDetails {
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
  cgst_rate?: number; // e.g. 9
  sgst_rate?: number; // e.g. 9
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
  gstin: string;
  pan: string;
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
  gstin: '27AABCS1429B1Z2',
  pan: 'AABCS1429B',
  logoUrl: 'https://swadeshi-restaurant-managment.netlify.app/icons/swadeshi-icon-512.png',
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

export function formatInr(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(val);
}

export function formatDateString(isoOrDate?: string | Date): string {
  if (!isoOrDate) return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (isNaN(d.getTime())) return String(isoOrDate);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function generateSubscriberInvoiceHTML(params: {
  restaurant: InvoiceRestaurantDetails;
  plan: InvoicePlanDetails;
  payment: InvoicePaymentDetails;
  company?: Partial<CompanyInvoiceConfig>;
}): string {
  const company: CompanyInvoiceConfig = {
    ...DEFAULT_COMPANY_CONFIG,
    ...(params.company || {}),
    bank: { ...DEFAULT_COMPANY_CONFIG.bank, ...(params.company?.bank || {}) },
    upi: { ...DEFAULT_COMPANY_CONFIG.upi, ...(params.company?.upi || {}) },
  };

  const { restaurant, plan, payment } = params;

  // Pricing & Discount Calculations
  const gstRate = payment.gst_rate ?? 18;
  const isInterstate = !!payment.is_interstate;

  // Gross base subtotal (before discount)
  let grossSubtotal = payment.subtotal;
  if (!grossSubtotal) {
    const rawPrice = Number(plan.price) || Number(payment.amount_paid) || 0;
    // If raw price is inclusive of GST, extract base
    grossSubtotal = Math.round((rawPrice / (1 + gstRate / 100)) * 100) / 100;
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
  const totalTax = Math.round(taxableSubtotal * (gstRate / 100) * 100) / 100;
  const totalAmount = Math.round((taxableSubtotal + totalTax) * 100) / 100;

  const cgstAmount = isInterstate ? 0 : Math.round((totalTax / 2) * 100) / 100;
  const sgstAmount = isInterstate ? 0 : Math.round((totalTax - cgstAmount) * 100) / 100;
  const igstAmount = isInterstate ? totalTax : 0;

  const invoiceNo = payment.invoice_number || `INV-${Date.now().toString(36).toUpperCase()}`;
  const issueDate = formatDateString(payment.issue_date || new Date());
  const dueDate = formatDateString(payment.due_date || payment.period_start || new Date());
  const periodStart = formatDateString(payment.period_start);
  const periodEnd = formatDateString(payment.period_end);

  const isPaid = payment.status === 'PAID';
  const statusColor = isPaid ? '#16a34a' : '#ea580c';
  const statusBg = isPaid ? '#dcfce7' : '#ffedd5';
  const statusLabel = isPaid ? '✓ PAID' : '⚠ PAYMENT DUE';

  // Generate UPI QR Code URL
  const upiPayLink = `upi://pay?pa=${encodeURIComponent(company.upi.upiId)}&pn=${encodeURIComponent(company.upi.merchantName)}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(`Invoice ${invoiceNo}`)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiPayLink)}&color=0f2b5c`;

  // Feature list
  const featuresList = plan.features && plan.features.length > 0
    ? plan.features.slice(0, 6).map((f) => `<li style="margin-bottom:3px;font-size:12px;color:#475569;">• ${f}</li>`).join('')
    : '<li style="margin-bottom:3px;font-size:12px;color:#475569;">• Full POS, Kitchen & Billing Suite</li><li style="margin-bottom:3px;font-size:12px;color:#475569;">• Inventory & Realtime Analytics</li><li style="margin-bottom:3px;font-size:12px;color:#475569;">• Cloud Sync & Unlimited Staff Accounts</li>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tax Invoice - ${invoiceNo}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: #f1f5f9; color: #0f172a; padding: 24px 12px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .invoice-container { max-width: 820px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0; }
    
    /* Top accent strip */
    .top-accent-bar { height: 6px; background: linear-gradient(90deg, #0f2b5c 0%, #2563eb 60%, #f97316 100%); }
    
    /* Header */
    .header-section { padding: 32px 36px 24px 36px; display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; border-bottom: 1px solid #f1f5f9; }
    .brand-group { display: flex; align-items: center; gap: 14px; }
    .brand-logo { width: 54px; height: 54px; border-radius: 12px; object-fit: contain; background: #f8fafc; padding: 4px; border: 1px solid #e2e8f0; }
    .brand-name { font-size: 24px; font-weight: 800; color: #0f2b5c; letter-spacing: -0.5px; }
    .brand-name span { color: #f97316; }
    .brand-sub { font-size: 13px; color: #64748b; font-weight: 500; margin-top: 2px; }
    
    .invoice-title-block { text-align: right; }
    .invoice-title { font-size: 22px; font-weight: 800; color: #0f2b5c; letter-spacing: -0.3px; text-transform: uppercase; }
    .meta-line { font-size: 12px; color: #64748b; margin-top: 4px; }
    .meta-line strong { color: #1e293b; }
    
    /* 2-Column Info Grid */
    .info-grid { padding: 24px 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; background: #fafafa; border-bottom: 1px solid #e2e8f0; }
    .info-col-title { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.8px; margin-bottom: 8px; }
    .info-entity-name { font-size: 16px; font-weight: 700; color: #0f2b5c; margin-bottom: 4px; }
    .info-text { font-size: 12.5px; color: #475569; line-height: 1.6; }
    
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; margin-top: 6px; }
    
    /* Table */
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
    
    /* Summary Block */
    .summary-wrapper { display: flex; justify-content: flex-end; padding: 12px 36px 24px 36px; }
    .summary-table { width: 320px; border-collapse: collapse; }
    .summary-table td { padding: 6px 10px; font-size: 12.5px; color: #475569; }
    .summary-table td.num { text-align: right; font-weight: 600; color: #1e293b; }
    .total-row td { background: #0f2b5c; color: #ffffff !important; padding: 10px 12px; font-size: 15px; font-weight: 800; border-radius: 6px; }
    .total-row td.num { font-size: 18px; color: #ffffff !important; }
    
    /* Payment Information Card */
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

    /* Transaction Info (when paid via Razorpay/Direct) */
    .txn-info-row { margin-top: 14px; padding-top: 12px; border-top: 1px dashed #cbd5e1; font-size: 12px; color: #64748b; display: flex; flex-wrap: wrap; gap: 16px; }
    .txn-info-item strong { color: #0f172a; font-weight: 600; }

    /* Terms */
    .terms-section { padding: 0 36px 24px 36px; font-size: 11.5px; color: #64748b; line-height: 1.5; }
    .terms-title { font-weight: 700; color: #334155; margin-bottom: 4px; }
    .terms-list { padding-left: 16px; }
    
    /* Footer */
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
    <!-- Top Accent Bar -->
    <div class="top-accent-bar"></div>

    <!-- Header Section -->
    <div class="header-section">
      <div class="brand-group">
        <img src="${company.logoUrl}" alt="${company.name}" class="brand-logo" onerror="this.style.display='none'" />
        <div>
          <h1 class="brand-name">${company.name}</h1>
          <p class="brand-sub">${company.tagline}</p>
          <p class="meta-line" style="margin-top:4px;">GSTIN: <strong>${company.gstin}</strong> | PAN: <strong>${company.pan}</strong></p>
        </div>
      </div>
      <div class="invoice-title-block">
        <div class="invoice-title">Tax Invoice / Bill</div>
        <p class="meta-line">Invoice Number: <strong>${invoiceNo}</strong></p>
        <p class="meta-line">Invoice Date: <strong>${issueDate}</strong></p>
        <p class="meta-line">Payment Due Date: <strong>${dueDate}</strong></p>
        <span class="status-badge" style="background:${statusBg};color:${statusColor};">${statusLabel}</span>
      </div>
    </div>

    <!-- 2-Column Info: Bill To & Service Details -->
    <div class="info-grid">
      <div>
        <div class="info-col-title">Bill To (Subscriber)</div>
        <div class="info-entity-name">${restaurant.name || 'Subscriber Restaurant'}</div>
        <div class="info-text">
          ${restaurant.owner_name ? `Attention: <strong>${restaurant.owner_name}</strong><br>` : ''}
          ${restaurant.address ? `${restaurant.address}<br>` : ''}
          ${restaurant.city ? `${restaurant.city}, ` : ''}${restaurant.state ? `${restaurant.state} ` : ''}${restaurant.pincode || ''}<br>
          ${restaurant.phone ? `Phone: ${restaurant.phone}<br>` : ''}
          ${restaurant.email ? `Email: ${restaurant.email}<br>` : ''}
          ${restaurant.gstin ? `GSTIN: <strong>${restaurant.gstin}</strong>` : ''}
        </div>
      </div>

      <div>
        <div class="info-col-title">Service Details</div>
        <div class="info-entity-name">${plan.name}</div>
        <div class="info-text">
          Billing Cycle: <strong>${plan.interval ? plan.interval.toUpperCase() : 'SUBSCRIPTION'}</strong><br>
          Service Period: <strong>${periodStart}</strong> to <strong>${periodEnd}</strong><br>
          SAC Code: <strong>${plan.hsn_sac || '997331 (Software as a Service)'}</strong><br>
          Supply Place: <strong>${restaurant.state || 'Maharashtra (27)'}</strong>
        </div>
      </div>
    </div>

    <!-- Pricing Table -->
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
                ${featuresList}
              </ul>
              ${discountAmount > 0 ? `
              <div style="margin-top:6px;font-size:11.5px;color:#16a34a;font-weight:600;background:#dcfce7;display:inline-block;padding:2px 8px;border-radius:4px;">
                🎉 ${discountLabel}: -${formatInr(discountAmount)}
              </div>` : ''}
            </td>
            <td class="text-center">1</td>
            <td class="text-right">${formatInr(grossSubtotal)}</td>
            <td class="text-right">${formatInr(taxableSubtotal)}</td>
            <td class="text-center">${gstRate}%</td>
            <td class="text-right">${formatInr(totalTax)}</td>
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
          <td style="color:#16a34a;font-weight:600;">${discountLabel}</td>
          <td class="num" style="color:#16a34a;font-weight:700;">-${formatInr(discountAmount)}</td>
        </tr>
        <tr>
          <td style="font-weight:600;color:#0f2b5c;">Taxable Value</td>
          <td class="num" style="font-weight:700;color:#0f2b5c;">${formatInr(taxableSubtotal)}</td>
        </tr>
        ` : `
        <tr>
          <td>Sub Total</td>
          <td class="num">${formatInr(taxableSubtotal)}</td>
        </tr>
        `}
        ${!isInterstate ? `
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
        `}
        <tr class="total-row">
          <td>${isPaid ? 'Total Amount Paid' : 'Total Amount Due'}</td>
          <td class="num">${formatInr(totalAmount)}</td>
        </tr>
      </table>
    </div>

    <!-- Payment Information Box -->
    <div class="payment-box">
      <div class="payment-heading">
        <span>Payment Information</span>
        <span style="font-size:11px;font-weight:600;color:#64748b;">
          ${isPaid ? 'Mode: ' + (payment.payment_method || 'Online').toUpperCase() : 'Instant Verification'}
        </span>
      </div>

      <div class="payment-columns">
        <!-- Bank Transfer Details -->
        <div>
          <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:8px;">Bank Transfer (NEFT / RTGS / IMPS)</div>
          <div class="bank-details-grid">
            <span class="bank-label">Bank Name</span>
            <span class="bank-val">${company.bank.bankName}</span>
            
            <span class="bank-label">Account Name</span>
            <span class="bank-val">${company.bank.accountName}</span>
            
            <span class="bank-label">Account Number</span>
            <span class="bank-val" style="color:#0f2b5c;font-size:13px;letter-spacing:0.5px;">${company.bank.accountNumber}</span>
            
            <span class="bank-label">IFSC Code</span>
            <span class="bank-val">${company.bank.ifsc}</span>
            
            <span class="bank-label">Branch & Type</span>
            <span class="bank-val">${company.bank.branch} (${company.bank.accountType})</span>
          </div>
        </div>

        <!-- Scan & Pay UPI -->
        <div>
          <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:8px;">Scan & Pay with UPI</div>
          <div class="qr-container">
            <img src="${qrCodeUrl}" alt="UPI QR Code" class="qr-code-img" />
            <div class="qr-text-block">
              <strong>Scan any UPI App</strong>
              GPay, PhonePe, Paytm, BHIM<br>
              <div class="upi-badge">UPI: ${company.upi.upiId}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Transaction details if paid -->
      ${isPaid && (payment.razorpay_payment_id || payment.transaction_ref) ? `
      <div class="txn-info-row">
        ${payment.razorpay_payment_id ? `<div class="txn-info-item">Razorpay Payment ID: <strong>${payment.razorpay_payment_id}</strong></div>` : ''}
        ${payment.razorpay_order_id ? `<div class="txn-info-item">Order ID: <strong>${payment.razorpay_order_id}</strong></div>` : ''}
        ${payment.transaction_ref ? `<div class="txn-info-item">Transaction Ref: <strong>${payment.transaction_ref}</strong></div>` : ''}
        <div class="txn-info-item">Payment Status: <strong style="color:#16a34a;">Verified & Received</strong></div>
      </div>
      ` : `
      <div class="txn-info-row">
        <div class="txn-info-item">💡 After payment, send screenshot & UTR to <strong>${company.phone}</strong> or <strong>${company.email}</strong> for instant license activation.</div>
      </div>
      `}
    </div>

    <!-- Terms & Conditions -->
    <div class="terms-section">
      <div class="terms-title">Terms & Conditions</div>
      <ol class="terms-list">
        <li>Software license is non-transferable and valid for the specified subscription duration.</li>
        <li>Payments are non-refundable once the subscription period begins.</li>
        <li>For invoice corrections or tax credits, notify support within 7 days of invoice generation.</li>
      </ol>
      <p style="margin-top:8px;">For support or inquiries: <strong>${company.email}</strong> | <strong>${company.phone}</strong></p>
    </div>

    <!-- Footer Bar -->
    <div class="footer-bar">
      <div>🌐 <a href="${company.website}" target="_blank">${company.website}</a></div>
      <div>© ${new Date().getFullYear()} ${company.name}. All rights reserved.</div>
    </div>
  </div>
</body>
</html>`;
}

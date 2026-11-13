/**
 * UPIPaymentCard — Branded payment card shown inside the invoice modal.
 * Supports both LIGHT and DARK modes.
 * Brand colors extracted from Swadeshi Solutions logo:
 *   Orange  #F26522
 *   Blue    #2E4FA3
 *   Navy    #1E3270
 */

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Download, QrCode, Copy, Check, Sun, Moon } from 'lucide-react';
import { CompanyInvoiceConfig } from '@/utils/subscriberInvoiceGenerator';

// ── Brand tokens ──────────────────────────────────────────────────────────────
const BRAND = {
  orange: '#F26522',
  orangeLight: '#F9874A',
  blue: '#2E4FA3',
  navy: '#1E3270',
  navyDark: '#141E4A',
};

// ── QR helper ─────────────────────────────────────────────────────────────────
function buildAutoQrUrl(upiId: string, merchantName: string, amount?: number, dark = false) {
  const pa = encodeURIComponent(upiId);
  const pn = encodeURIComponent(merchantName);
  const link = amount
    ? `upi://pay?pa=${pa}&pn=${pn}&am=${amount}&cu=INR&tn=Subscription`
    : `upi://pay?pa=${pa}&pn=${pn}&cu=INR`;
  const fg = dark ? 'ffffff' : '1E3270';
  const bg = dark ? '1a2560' : 'ffffff';
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}&color=${fg}&bgcolor=${bg}&margin=8`;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface UPIPaymentCardProps {
  company: CompanyInvoiceConfig;
  planName?: string;
  planPrice?: number;
  invoiceNumber?: string;
  customQrImageUrl?: string;
  cardTagline?: string;
  className?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────
export const UPIPaymentCard: React.FC<UPIPaymentCardProps> = ({
  company,
  planName,
  planPrice,
  invoiceNumber,
  customQrImageUrl,
  cardTagline = 'Start Your Complete POS Automation Journey',
  className = '',
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  const dark = mode === 'dark';
  const qrSrc =
    customQrImageUrl ||
    buildAutoQrUrl(company.upi.upiId, company.upi.merchantName, planPrice, dark);

  // ── Save as PNG ────────────────────────────────────────────────────────────
  const handleSaveImage = async () => {
    if (!cardRef.current) return;
    setIsSaving(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: dark ? BRAND.navyDark : '#ffffff',
        logging: false,
      });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `swadeshi-payment-card-${invoiceNumber || 'upi'}.png`;
      a.click();
      toast.success('Payment card saved as PNG!');
    } catch {
      toast.error('Could not save image. Try screenshot instead.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(company.upi.upiId);
    setCopiedUpi(true);
    toast.success('UPI ID copied!');
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // ── Palette helpers ────────────────────────────────────────────────────────
  const card = dark
    ? {
        bg: `linear-gradient(145deg, ${BRAND.navyDark} 0%, #1a2560 60%, ${BRAND.navyDark} 100%)`,
        border: `1px solid rgba(242,101,34,0.25)`,
        tagline: '#FFFFFF',
        sub: BRAND.orangeLight,
        labelColor: 'rgba(255,255,255,0.45)',
        valueColor: '#FFFFFF',
        bankName: '#E2E8F0',
        bankMeta: 'rgba(255,255,255,0.45)',
        qrBorder: `2px solid ${BRAND.orange}`,
        qrBg: 'rgba(255,255,255,0.06)',
        pillBg: 'rgba(255,255,255,0.08)',
        pillBorder: 'rgba(255,255,255,0.14)',
        pillText: '#CBD5E1',
        upiBg: 'rgba(242,101,34,0.10)',
        upiBorder: `1px solid rgba(242,101,34,0.3)`,
        upiText: '#FFFFFF',
        divider: 'rgba(255,255,255,0.08)',
        footerText: 'rgba(255,255,255,0.3)',
        refBg: 'rgba(242,101,34,0.12)',
        refBorder: `1px solid rgba(242,101,34,0.3)`,
        refText: BRAND.orangeLight,
        scanText: BRAND.orange,
      }
    : {
        bg: '#FFFFFF',
        border: `1px solid #E8EBF0`,
        tagline: BRAND.navy,
        sub: BRAND.orange,
        labelColor: '#6B7280',
        valueColor: BRAND.navy,
        bankName: BRAND.navy,
        bankMeta: '#6B7280',
        qrBorder: `2px solid ${BRAND.orange}`,
        qrBg: '#F8F9FC',
        pillBg: '#F1F5F9',
        pillBorder: '#E2E8F0',
        pillText: '#374151',
        upiBg: '#FFF5EE',
        upiBorder: `1px solid #FDDAB9`,
        upiText: BRAND.navy,
        divider: '#E8EBF0',
        footerText: '#9CA3AF',
        refBg: '#FFF5EE',
        refBorder: `1px solid #FDDAB9`,
        refText: BRAND.orange,
        scanText: BRAND.orange,
      };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
          <QrCode className="w-3.5 h-3.5" />
          Branded UPI Payment Card
        </p>
        <div className="flex items-center gap-2">
          {/* Light / Dark toggle */}
          <button
            type="button"
            onClick={() => setMode(dark ? 'light' : 'dark')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all
              border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300
              hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {dark ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
            {dark ? 'Light' : 'Dark'}
          </button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSaveImage}
            disabled={isSaving}
            className="text-xs gap-1.5 h-7"
          >
            <Download className="w-3 h-3" />
            {isSaving ? 'Saving…' : 'Save as Image'}
          </Button>
        </div>
      </div>

      {/* ── THE CARD ── */}
      <div
        ref={cardRef}
        style={{
          background: card.bg,
          border: card.border,
          borderRadius: '16px',
          padding: '24px',
          fontFamily: "'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
          position: 'relative',
          overflow: 'hidden',
          boxShadow: dark
            ? '0 4px 24px rgba(0,0,0,0.4)'
            : '0 2px 16px rgba(30,50,112,0.08)',
        }}
      >
        {/* Light-mode: subtle top-edge accent bar */}
        {!dark && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: `linear-gradient(90deg, ${BRAND.orange} 0%, ${BRAND.blue} 100%)`,
              borderRadius: '16px 16px 0 0',
            }}
          />
        )}

        {/* ── Top row: Logo area + plan badge ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src="/swadeshi-logo2.png"
              alt="Swadeshi Solutions"
              width={32}
              height={32}
              style={{ objectFit: 'contain' }}
              crossOrigin="anonymous"
            />
            <div>
              <div style={{
                color: BRAND.blue,
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.3px',
                lineHeight: 1.2,
              }}>
                Swadeshi Solutions
              </div>
              <div style={{ color: card.bankMeta, fontSize: '10px', marginTop: '1px' }}>
                Restaurant &amp; Hospitality Management
              </div>
            </div>
          </div>
          {planName && (
            <div style={{
              background: dark ? 'rgba(242,101,34,0.15)' : '#FFF0E6',
              border: `1px solid ${dark ? 'rgba(242,101,34,0.35)' : '#FDDAB9'}`,
              borderRadius: '20px',
              padding: '3px 10px',
              color: BRAND.orange,
              fontSize: '10px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}>
              {planName}
            </div>
          )}
        </div>

        {/* Invoice/amount ref pill */}
        {(invoiceNumber || planPrice) && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: card.refBg,
            border: card.refBorder,
            borderRadius: '20px',
            padding: '3px 12px',
            color: card.refText,
            fontSize: '10px',
            fontWeight: 600,
            marginBottom: '14px',
          }}>
            {invoiceNumber && <span>{invoiceNumber}</span>}
            {invoiceNumber && planPrice && <span style={{ opacity: 0.5 }}>·</span>}
            {planPrice && <span>₹{planPrice.toLocaleString('en-IN')}</span>}
          </div>
        )}

        {/* ── Tagline ── */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            color: card.tagline,
            fontSize: '17px',
            fontWeight: 800,
            lineHeight: 1.3,
            marginBottom: '4px',
            letterSpacing: '-0.2px',
          }}>
            {cardTagline}
          </div>
          <div style={{
            color: card.sub,
            fontSize: '12px',
            fontWeight: 600,
          }}>
            Make payment here to begin ↓
          </div>
        </div>

        {/* ── QR + Details row ── */}
        <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
          {/* QR block */}
          <div style={{ flexShrink: 0, textAlign: 'center' }}>
            <div style={{
              background: card.qrBg,
              border: card.qrBorder,
              borderRadius: '12px',
              padding: '10px',
              display: 'inline-block',
            }}>
              <img
                src={qrSrc}
                alt="UPI QR Code"
                width={120}
                height={120}
                style={{ borderRadius: '6px', display: 'block' }}
                crossOrigin="anonymous"
              />
            </div>
            <div style={{
              marginTop: '5px',
              color: card.scanText,
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
            }}>
              Scan to Pay
            </div>
          </div>

          {/* Right column */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* UPI ID */}
            <div style={{
              background: card.upiBg,
              border: card.upiBorder,
              borderRadius: '10px',
              padding: '9px 11px',
              marginBottom: '10px',
            }}>
              <div style={{
                color: card.labelColor,
                fontSize: '9px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '3px',
              }}>
                UPI ID
              </div>
              <div style={{
                color: card.upiText,
                fontSize: '13px',
                fontWeight: 700,
                fontFamily: "'Courier New', Courier, monospace",
                wordBreak: 'break-all',
              }}>
                {company.upi.upiId}
              </div>
            </div>

            {/* App pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
              {['GPay', 'PhonePe', 'Paytm', 'BHIM'].map((app) => (
                <div key={app} style={{
                  background: card.pillBg,
                  border: `1px solid ${card.pillBorder}`,
                  borderRadius: '20px',
                  padding: '2px 9px',
                  color: card.pillText,
                  fontSize: '9px',
                  fontWeight: 600,
                }}>
                  {app}
                </div>
              ))}
            </div>

            {/* Bank details */}
            <div style={{
              borderTop: `1px solid ${card.divider}`,
              paddingTop: '9px',
              lineHeight: 1.7,
            }}>
              <div style={{ color: card.bankName, fontSize: '11px', fontWeight: 700 }}>
                {company.bank.bankName}
              </div>
              <div style={{ color: card.labelColor, fontSize: '10px' }}>
                A/C:{' '}
                <span style={{ color: card.valueColor, fontFamily: 'monospace', fontWeight: 600 }}>
                  {company.bank.accountNumber}
                </span>
              </div>
              <div style={{ color: card.labelColor, fontSize: '10px' }}>
                IFSC:{' '}
                <span style={{ color: card.valueColor, fontFamily: 'monospace', fontWeight: 600 }}>
                  {company.bank.ifsc}
                </span>
              </div>
              <div style={{ color: card.bankMeta, fontSize: '10px' }}>
                {company.bank.accountType} · {company.bank.branch}
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          marginTop: '16px',
          paddingTop: '10px',
          borderTop: `1px solid ${card.divider}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ color: card.footerText, fontSize: '9px' }}>
            💡 After payment, share UTR to{' '}
            <span style={{ color: card.bankMeta, fontWeight: 600 }}>{company.phone}</span>
          </div>
          <div style={{ color: card.footerText, fontSize: '9px' }}>
            {company.website.replace('https://', '')}
          </div>
        </div>
      </div>

      {/* ── Quick-copy UPI ── */}
      <button
        onClick={handleCopyUpi}
        className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg border border-dashed
          border-orange-300/60 text-orange-600 dark:text-orange-400 text-xs font-medium
          hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-colors"
      >
        {copiedUpi ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        {copiedUpi ? 'Copied!' : `Copy UPI: ${company.upi.upiId}`}
      </button>
    </div>
  );
};

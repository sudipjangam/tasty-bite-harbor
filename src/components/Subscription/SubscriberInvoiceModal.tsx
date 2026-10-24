import React, { useRef, useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Download,
  Printer,
  Share2,
  Copy,
  Check,
  FileText,
  Tag,
  Percent,
  IndianRupee,
  X,
  Loader2,
  Mail,
  Send,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import {
  generateSubscriberInvoiceHTML,
  generateSubscriberInvoiceEmailHTML,
  InvoiceRestaurantDetails,
  InvoicePlanDetails,
  InvoicePaymentDetails,
  DEFAULT_COMPANY_CONFIG,
  CompanyInvoiceConfig,
  formatInr,
  formatDateString,
} from '@/utils/subscriberInvoiceGenerator';

interface SubscriberInvoiceModalProps {
  restaurant: InvoiceRestaurantDetails;
  plan: InvoicePlanDetails;
  payment: InvoicePaymentDetails;
  companyConfig?: Partial<CompanyInvoiceConfig>;
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const SubscriberInvoiceModal: React.FC<SubscriberInvoiceModalProps> = ({
  restaurant,
  plan,
  payment: initialPayment,
  companyConfig,
  trigger,
  isOpen,
  onOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = isOpen !== undefined;
  const open = isControlled ? isOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;

  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'DUE'>(initialPayment.status || 'PAID');
  const [includeGst, setIncludeGst] = useState<boolean>(false); // Skipped by default as business has no GST number yet
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(
    initialPayment.discount_type || 'percentage'
  );
  const [discountValue, setDiscountValue] = useState<string>(
    initialPayment.discount_value ? String(initialPayment.discount_value) : ''
  );
  const [discountReason, setDiscountReason] = useState<string>(
    initialPayment.discount_reason || ''
  );

  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);
  const invoicePrintRef = useRef<HTMLDivElement>(null);

  // Email sending states
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState(restaurant.email || '');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [attachPdf, setAttachPdf] = useState(true);
  const [includeSignature, setIncludeSignature] = useState(true);

  const numDiscount = parseFloat(discountValue) || 0;

  const activePayment: InvoicePaymentDetails = {
    ...initialPayment,
    status: paymentStatus,
    discount_type: numDiscount > 0 ? discountType : undefined,
    discount_value: numDiscount > 0 ? numDiscount : undefined,
    discount_reason: discountReason.trim() || (numDiscount > 0 ? (discountType === 'percentage' ? `${numDiscount}% Discount` : 'Special Cash Discount') : undefined),
  };

  const invoiceHtml = generateSubscriberInvoiceHTML({
    restaurant,
    plan,
    payment: activePayment,
    company: companyConfig,
    includeGst,
  });

  // Keep email fields synchronized when details or status change
  useEffect(() => {
    const invNumber = activePayment.invoice_number || 'INV-SUB';
    const isPaid = paymentStatus === 'PAID';
    setEmailSubject(
      isPaid
        ? `Subscription Invoice & Receipt: ${plan.name} - ${restaurant.name} [${invNumber}]`
        : `Subscription Invoice & Payment Due: ${plan.name} - ${restaurant.name} [${invNumber}]`
    );
    setEmailMessage(
      isPaid
        ? `We are pleased to provide your official subscription invoice & payment receipt for ${plan.name}. Your restaurant management license is active and cloud sync is operational across all terminals.\n\nThank you for choosing Swadeshi Solutions!`
        : `Your subscription invoice for ${plan.name} has been generated and is now due for renewal. To ensure uninterrupted POS and kitchen billing operations, kindly process the payment using the bank/UPI details provided below.\n\nThank you for choosing Swadeshi Solutions!`
    );
    if (!recipientEmail && restaurant.email) {
      setRecipientEmail(restaurant.email);
    }
  }, [
    restaurant?.name,
    restaurant?.owner_name,
    restaurant?.email,
    plan?.name,
    paymentStatus,
    activePayment.invoice_number,
  ]);

  const generateInvoicePdfBase64 = async (): Promise<{ filename: string; content: string } | null> => {
    const element = invoicePrintRef.current;
    if (!element) return null;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const ratio = canvas.height / canvas.width;
    const imgWidth = pdfWidth;
    const imgHeight = pdfWidth * ratio;

    let position = 0;
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, '', 'FAST');

    let heightLeft = imgHeight - pdfHeight;
    while (heightLeft > 0) {
      position -= pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, '', 'FAST');
      heightLeft -= pdfHeight;
    }

    const filename = `${activePayment.invoice_number || 'Subscriber-Invoice'}.pdf`;
    const uri = pdf.output('datauristring');
    const b64 = uri.split(',')[1];
    return { filename, content: b64 };
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const element = invoicePrintRef.current;
      if (!element) {
        toast.error('Invoice preview not ready');
        return;
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const ratio = canvas.height / canvas.width;
      const imgWidth = pdfWidth;
      const imgHeight = pdfWidth * ratio;

      let position = 0;
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, '', 'FAST');

      let heightLeft = imgHeight - pdfHeight;
      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, '', 'FAST');
        heightLeft -= pdfHeight;
      }

      const fileName = `${activePayment.invoice_number || 'Subscriber-Invoice'}.pdf`;
      pdf.save(fileName);
      toast.success('Invoice PDF downloaded successfully!');
    } catch (err: any) {
      console.error('PDF generation error:', err);
      toast.error('PDF export issue, opening print window...');
      handlePrint();
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Pop-up blocked. Please allow pop-ups to print.');
      return;
    }
    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handleCopyPaymentDetails = () => {
    const text = `*Swadeshi Solutions Payment Details*
----------------------------
Bank Name: ${DEFAULT_COMPANY_CONFIG.bank.bankName}
Account Name: ${DEFAULT_COMPANY_CONFIG.bank.accountName}
Account No: ${DEFAULT_COMPANY_CONFIG.bank.accountNumber}
IFSC: ${DEFAULT_COMPANY_CONFIG.bank.ifsc}
Branch: ${DEFAULT_COMPANY_CONFIG.bank.branch}
Account Type: ${DEFAULT_COMPANY_CONFIG.bank.accountType}

*UPI ID*: ${DEFAULT_COMPANY_CONFIG.upi.upiId}
*Amount*: ${formatInr(Number(activePayment.amount_paid) || 0)}
Invoice Ref: ${activePayment.invoice_number || 'Subscription'}

After payment, kindly share UTR/screenshot to ${DEFAULT_COMPANY_CONFIG.phone}`;

    navigator.clipboard.writeText(text);
    setCopiedBank(true);
    toast.success('Bank & UPI details copied to clipboard!');
    setTimeout(() => setCopiedBank(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const discountInfo = numDiscount > 0
      ? `\n- Discount: ${discountType === 'percentage' ? `${numDiscount}%` : `₹${numDiscount}`} (${activePayment.discount_reason || 'Applied'})`
      : '';

    const text = `Hello ${restaurant.name},

Here are your invoice details for *${plan.name}*:
- Invoice No: ${activePayment.invoice_number || 'INV-SUB'}
- Period: ${formatDateString(activePayment.period_start)} to ${formatDateString(activePayment.period_end)}${discountInfo}
- Total Amount: ${formatInr(Number(activePayment.amount_paid) || 0)}
- Status: ${activePayment.status}

*Bank Details for Transfer:*
Bank: ${DEFAULT_COMPANY_CONFIG.bank.bankName}
A/C: ${DEFAULT_COMPANY_CONFIG.bank.accountNumber}
IFSC: ${DEFAULT_COMPANY_CONFIG.bank.ifsc}
UPI ID: ${DEFAULT_COMPANY_CONFIG.upi.upiId}

Thank you,
${DEFAULT_COMPANY_CONFIG.name}`;

    const phone = restaurant.phone?.replace(/[^0-9]/g, '') || '';
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
  };

  const handleSendEmail = async () => {
    const targetEmail = recipientEmail.trim();
    if (!targetEmail) {
      toast.error('Please enter a recipient email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(targetEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSendingEmail(true);
    try {
      let attachments: Array<{ filename: string; content: string }> | undefined = undefined;

      if (attachPdf) {
        try {
          const pdfData = await generateInvoicePdfBase64();
          if (pdfData) {
            attachments = [{
              filename: pdfData.filename,
              content: pdfData.content,
            }];
          }
        } catch (pdfErr) {
          console.warn('PDF generation for email attachment failed, proceeding with email only:', pdfErr);
        }
      }

      // Generate rich HTML email content matching modern SaaS standards
      const emailPayload = generateSubscriberInvoiceEmailHTML({
        restaurant,
        plan,
        payment: activePayment,
        company: companyConfig,
        includeGst,
        customMessage: emailMessage,
        hasPdfAttachment: Boolean(attachments && attachments.length > 0),
        includeSignature,
      });

      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: targetEmail,
          subject: emailSubject || emailPayload.subject,
          html: emailPayload.html,
          fromName: 'Swadeshi Solutions',
          restaurantId: restaurant.id,
          attachments,
        },
      });

      if (error) throw error;
      if (data && data.success === false) {
        throw new Error(data.error || 'Failed to dispatch email');
      }

      toast.success(
        attachments && attachments.length > 0
          ? `Invoice with PDF attached sent successfully to ${targetEmail}! ✉️`
          : `Invoice email sent successfully to ${targetEmail}! ✉️`
      );
      setIsEmailModalOpen(false);
    } catch (err: any) {
      console.error('Email invoice dispatch error:', err);
      toast.error(err.message || 'Failed to send invoice email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader className="p-4 px-6 border-b bg-white dark:bg-slate-950 flex flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-950 text-blue-600 rounded-xl shadow-xs border border-blue-100 dark:border-blue-900">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base md:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                  {includeGst ? 'Subscriber Tax Invoice & Bill' : 'Subscriber Invoice & Bill'}
                  <Badge
                    variant="outline"
                    className={
                      paymentStatus === 'PAID'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-amber-50 text-amber-700 border-amber-300'
                    }
                  >
                    {paymentStatus === 'PAID' ? '✓ PAID' : '⚠ DUE'}
                  </Badge>
                  {numDiscount > 0 && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 gap-1 text-xs">
                      <Tag className="w-3 h-3" />
                      {discountType === 'percentage' ? `${numDiscount}% Off` : `₹${numDiscount} Off`}
                    </Badge>
                  )}
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  {restaurant.name} · {plan.name} ({formatInr(Number(activePayment.amount_paid) || 0)})
                </p>
              </div>
            </div>

            {/* Quick status & GST controls */}
            <div className="flex items-center gap-3">
              {/* Optional GST toggle */}
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-medium">GST (18%)</span>
                <Switch
                  checked={includeGst}
                  onCheckedChange={setIncludeGst}
                  className="scale-75 origin-right"
                />
              </div>

              {/* Paid / Due Toggle */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setPaymentStatus('PAID')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    paymentStatus === 'PAID'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  Paid
                </button>
                <button
                  onClick={() => setPaymentStatus('DUE')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    paymentStatus === 'DUE'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  Due / Bill
                </button>
              </div>
            </div>
          </DialogHeader>

          {/* Action Toolbar */}
          <div className="bg-white dark:bg-slate-950 px-6 py-2.5 border-b flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Custom Discount Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`gap-1.5 text-xs ${
                      numDiscount > 0
                        ? 'border-green-400 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5" />
                    {numDiscount > 0
                      ? `Discount: ${discountType === 'percentage' ? `${numDiscount}%` : `₹${numDiscount}`}`
                      : 'Add Discount'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4 space-y-3" align="start">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-green-600" />
                      Custom Subscriber Discount
                    </h4>
                    {numDiscount > 0 && (
                      <button
                        onClick={() => {
                          setDiscountValue('');
                          setDiscountReason('');
                        }}
                        className="text-xs text-rose-500 hover:text-rose-700 font-medium flex items-center gap-0.5"
                      >
                        <X className="w-3 h-3" /> Clear
                      </button>
                    )}
                  </div>

                  {/* Mode toggle */}
                  <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setDiscountType('percentage')}
                      className={`py-1 text-xs font-semibold rounded-md flex items-center justify-center gap-1 transition-all ${
                        discountType === 'percentage'
                          ? 'bg-white dark:bg-slate-700 text-green-700 dark:text-green-300 shadow-sm'
                          : 'text-slate-600'
                      }`}
                    >
                      <Percent className="w-3.5 h-3.5" /> Percentage (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('fixed')}
                      className={`py-1 text-xs font-semibold rounded-md flex items-center justify-center gap-1 transition-all ${
                        discountType === 'fixed'
                          ? 'bg-white dark:bg-slate-700 text-green-700 dark:text-green-300 shadow-sm'
                          : 'text-slate-600'
                      }`}
                    >
                      <IndianRupee className="w-3.5 h-3.5" /> Cash (₹ Fixed)
                    </button>
                  </div>

                  {/* Value input */}
                  <div>
                    <Label className="text-xs font-medium text-slate-600 mb-1 block">
                      {discountType === 'percentage' ? 'Discount Percentage (%)' : 'Discount Cash Amount (₹)'}
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder={discountType === 'percentage' ? 'e.g. 10, 15, 20' : 'e.g. 500, 1000'}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        className="text-sm h-8"
                      />
                      <span className="absolute right-3 top-1.5 text-xs text-slate-400 font-bold">
                        {discountType === 'percentage' ? '%' : '₹'}
                      </span>
                    </div>
                  </div>

                  {/* Reason / Offer label */}
                  <div>
                    <Label className="text-xs font-medium text-slate-600 mb-1 block">Offer Label / Reason (optional)</Label>
                    <Input
                      placeholder="e.g. Inaugural Offer, Franchise Partner"
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                      className="text-sm h-8"
                    />
                  </div>

                  {/* Quick Presets */}
                  <div className="pt-1">
                    <div className="text-[11px] text-slate-400 font-medium mb-1.5">Quick Presets:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {discountType === 'percentage' ? (
                        [5, 10, 15, 20, 25].map((pct) => (
                          <button
                            key={pct}
                            onClick={() => setDiscountValue(String(pct))}
                            className={`px-2 py-0.5 text-xs rounded border transition-all ${
                              discountValue === String(pct)
                                ? 'bg-green-600 text-white border-green-600'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))
                      ) : (
                        [250, 500, 1000, 2000, 5000].map((amt) => (
                          <button
                            key={amt}
                            onClick={() => setDiscountValue(String(amt))}
                            className={`px-2 py-0.5 text-xs rounded border transition-all ${
                              discountValue === String(amt)
                                ? 'bg-green-600 text-white border-green-600'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            ₹{amt}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyPaymentDetails}
                className="gap-1.5 text-xs text-slate-700 dark:text-slate-300"
              >
                {copiedBank ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedBank ? 'Copied' : 'Copy Bank/UPI'}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleWhatsAppShare}
                className="gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950"
              >
                <Share2 className="w-3.5 h-3.5" />
                WhatsApp
              </Button>

              {/* Email Button */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEmailModalOpen(true)}
                className="gap-1.5 text-xs text-blue-700 dark:text-blue-400 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950"
              >
                <Mail className="w-3.5 h-3.5" />
                Email Invoice
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePrint}
                className="gap-1.5 text-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </Button>
              <Button
                size="sm"
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="bg-blue-700 hover:bg-blue-800 text-white gap-1.5 text-xs shadow-sm"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    Download PDF
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Scrollable Preview Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-200 dark:bg-slate-950 flex justify-center">
            <div className="w-full max-w-[820px] shadow-lg rounded-2xl overflow-hidden bg-white">
              <div
                ref={invoicePrintRef}
                dangerouslySetInnerHTML={{ __html: invoiceHtml }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modern Email Invoice Modal */}
      <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader className="p-5 pb-4 border-b bg-slate-50 dark:bg-slate-950">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded-xl">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Send Invoice via Email
                </DialogTitle>
                <p className="text-xs text-slate-500">
                  Delivers an official branded email with invoice details & payment context
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-4">
            {/* Invoice summary chip */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 block">Recipient Entity:</span>
                <strong className="text-slate-900 dark:text-slate-100 text-sm">
                  {restaurant.name}
                </strong>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">Total:</span>
                <strong className="text-blue-700 dark:text-blue-400 text-sm">
                  {formatInr(Number(activePayment.amount_paid) || 0)}
                </strong>
              </div>
            </div>

            {/* Recipient Email */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Recipient Email Address <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="email"
                placeholder="e.g. owner@restaurant.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="text-sm h-9"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Pre-filled from restaurant record. You can change it if sending to partner/accountant.
              </span>
            </div>

            {/* Subject */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Email Subject
              </Label>
              <Input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="text-sm h-9"
              />
            </div>

            {/* Context Message */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Message / Business Context
              </Label>
              <Textarea
                rows={4}
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Add personalized context, renewal instructions, or offer notes..."
                className="text-xs leading-relaxed resize-none"
              />
            </div>

            {/* Attach PDF Invoice Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Attach Official PDF Invoice
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {activePayment.invoice_number || 'Subscriber-Invoice'}.pdf
                  </div>
                </div>
              </div>
              <Switch
                checked={attachPdf}
                onCheckedChange={setAttachPdf}
              />
            </div>

            {/* Include Official Signature Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Include Executive Signature
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Sudip Jangam (Chief Technology Officer, Swadeshi Solutions)
                  </div>
                </div>
              </div>
              <Switch
                checked={includeSignature}
                onCheckedChange={setIncludeSignature}
              />
            </div>
          </div>

          <DialogFooter className="p-4 px-5 border-t bg-slate-50 dark:bg-slate-950 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSendingEmail}
              onClick={() => setIsEmailModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSendingEmail}
              onClick={handleSendEmail}
              className="bg-blue-700 hover:bg-blue-800 text-white gap-1.5 text-xs shadow-sm"
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {attachPdf ? 'Generating PDF & Sending...' : 'Sending Email...'}
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  {attachPdf ? 'Send Invoice with PDF' : 'Send Invoice Email'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

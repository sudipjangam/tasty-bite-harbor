import React, { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
} from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  generateSubscriberInvoiceHTML,
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
  });

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader className="p-4 px-6 border-b bg-white dark:bg-slate-950 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-600 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Subscriber Tax Invoice & Bill
                <Badge
                  variant="outline"
                  className={
                    paymentStatus === 'PAID'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-amber-50 text-amber-700 border-amber-300'
                  }
                >
                  {paymentStatus}
                </Badge>
                {numDiscount > 0 && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 gap-1 text-xs">
                    <Tag className="w-3 h-3" />
                    {discountType === 'percentage' ? `${numDiscount}% Off` : `₹${numDiscount} Off`}
                  </Badge>
                )}
              </DialogTitle>
              <p className="text-xs text-slate-500">
                {restaurant.name} · {plan.name} ({formatInr(Number(activePayment.amount_paid) || 0)})
              </p>
            </div>
          </div>

          {/* Quick controls */}
          <div className="flex items-center gap-2">
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

        {/* Action & Discount Toolbar */}
        <div className="bg-white dark:bg-slate-950 px-6 py-2.5 border-b flex flex-wrap items-center justify-between gap-3">
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
                    : 'Add Discount (% / Cash)'}
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
          <div className="w-full max-w-[820px] shadow-lg rounded-xl overflow-hidden bg-white">
            <div
              ref={invoicePrintRef}
              dangerouslySetInnerHTML={{ __html: invoiceHtml }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

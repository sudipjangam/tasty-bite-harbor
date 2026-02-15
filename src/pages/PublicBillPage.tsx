import { useParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { decodeBillData, type BillFormatParams } from "@/utils/billFormatter";
import { Button } from "@/components/ui/button";
import {
  Download,
  Share2,
  Copy,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

/**
 * PublicBillPage — Premium, luxury-styled public bill page.
 * Accessible at /bill/:encodedData — no login required.
 * Data is self-contained in the URL (base64 encoded).
 */
const PublicBillPage = () => {
  const { encodedData } = useParams<{ encodedData: string }>();
  const [billData, setBillData] = useState<BillFormatParams | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const billRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      if (!encodedData) throw new Error("No bill data provided");
      const data = decodeBillData(encodedData);
      setBillData(data);
    } catch (err) {
      console.error("Error decoding bill data:", err);
      setError("This bill link is invalid or has expired.");
    }
  }, [encodedData]);

  const currencySymbol = billData?.currencySymbol || "₹";

  const handleCopyBill = async () => {
    if (!billData) return;
    const lines: string[] = [];
    lines.push(`Bill from ${billData.restaurantName}`);
    if (billData.orderDate) lines.push(`Date: ${billData.orderDate}`);
    lines.push("---");
    billData.items.forEach((item) => {
      lines.push(
        `${item.quantity}x ${item.name} — ${currencySymbol}${(item.price * item.quantity).toFixed(2)}`,
      );
    });
    lines.push("---");
    lines.push(`Subtotal: ${currencySymbol}${billData.subtotal.toFixed(2)}`);
    if (billData.discount && billData.discount > 0) {
      lines.push(`Discount: -${currencySymbol}${billData.discount.toFixed(2)}`);
    }
    lines.push(
      `Total: ${currencySymbol}${billData.total.toFixed(2)}${billData.isNonChargeable ? " (Non-Chargeable)" : ""}`,
    );
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleShare = async () => {
    if (!billData) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Bill from ${billData.restaurantName}`,
          text: `View your bill from ${billData.restaurantName}`,
          url: window.location.href,
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadPdf = async () => {
    if (!billRef.current || !billData) return;
    // Dynamic import jsPDF for smaller initial bundle
    const { default: jsPDF } = await import("jspdf");

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a5",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    let y = 18;

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(billData.restaurantName, pageWidth / 2, y, { align: "center" });
    y += 7;

    if (billData.restaurantAddress) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(billData.restaurantAddress, pageWidth / 2, y, {
        align: "center",
      });
      y += 5;
    }
    if (billData.restaurantPhone) {
      doc.setFontSize(9);
      doc.text(billData.restaurantPhone, pageWidth / 2, y, {
        align: "center",
      });
      y += 5;
    }
    if (billData.gstin) {
      doc.setFontSize(8);
      doc.text(`GSTIN: ${billData.gstin}`, pageWidth / 2, y, {
        align: "center",
      });
      y += 5;
    }

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // Order details
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    if (billData.orderDate) {
      doc.text(`Date: ${billData.orderDate}`, margin, y);
      y += 5;
    }
    if (billData.tableNumber) {
      doc.text(`Table: ${billData.tableNumber}`, margin, y);
      y += 5;
    }
    if (billData.customerName) {
      doc.text(`Customer: ${billData.customerName}`, margin, y);
      y += 5;
    }

    // Divider
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // Items header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Item", margin, y);
    doc.text("Qty", pageWidth - margin - 30, y, { align: "right" });
    doc.text("Amount", pageWidth - margin, y, { align: "right" });
    y += 2;
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    // Items
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    billData.items.forEach((item) => {
      const itemTotal = item.price * item.quantity;
      doc.text(item.name, margin, y);
      doc.text(`${item.quantity}`, pageWidth - margin - 30, y, {
        align: "right",
      });
      doc.text(
        `${currencySymbol}${itemTotal.toFixed(2)}`,
        pageWidth - margin,
        y,
        {
          align: "right",
        },
      );
      y += 5;
    });

    // Divider
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // Subtotal
    doc.setFontSize(9);
    doc.text(
      `Subtotal: ${currencySymbol}${billData.subtotal.toFixed(2)}`,
      pageWidth - margin,
      y,
      { align: "right" },
    );
    y += 5;

    // Discount
    if (billData.discount && billData.discount > 0) {
      const label = billData.promotionName
        ? `Promo (${billData.promotionName})`
        : billData.manualDiscountPercent
          ? `Discount (${billData.manualDiscountPercent}%)`
          : "Discount";
      doc.text(
        `${label}: -${currencySymbol}${billData.discount.toFixed(2)}`,
        pageWidth - margin,
        y,
        { align: "right" },
      );
      y += 5;
    }

    // Total
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    const totalText = billData.isNonChargeable
      ? `Total: ${currencySymbol}0.00 (NC)`
      : `Total: ${currencySymbol}${billData.total.toFixed(2)}`;
    doc.text(totalText, pageWidth - margin, y, { align: "right" });
    y += 8;

    // Payment method
    if (billData.paymentMethod) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(
        `Paid via: ${billData.paymentMethod.toUpperCase()}`,
        pageWidth - margin,
        y,
        { align: "right" },
      );
      y += 8;
    }

    // Footer
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text("Thank you for dining with us!", pageWidth / 2, y, {
      align: "center",
    });

    doc.save(
      `bill-${billData.restaurantName.replace(/\s+/g, "-").toLowerCase()}.pdf`,
    );
  };

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900 p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">
            Invalid Bill Link
          </h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/")}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Go to Homepage
          </Button>
        </div>
      </div>
    );
  }

  // Loading state
  if (!billData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading your bill...</p>
        </div>
      </div>
    );
  }

  const paymentMethodLabel = billData.paymentMethod
    ? {
        cash: "Cash",
        upi: "UPI",
        card: "Card",
        credit_card: "Credit Card",
        debit_card: "Debit Card",
        net_banking: "Net Banking",
        wallet: "Wallet",
        room_charge: "Room Charge",
        nc: "Non-Chargeable",
      }[billData.paymentMethod.toLowerCase()] || billData.paymentMethod
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 sm:p-6">
        {/* Bill Card */}
        <div
          ref={billRef}
          className="w-full max-w-md animate-in fade-in slide-in-from-bottom-6 duration-700"
        >
          {/* Glass card */}
          <div className="bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] rounded-3xl shadow-2xl overflow-hidden">
            {/* Gradient header */}
            <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 px-6 py-8 text-center overflow-hidden">
              {/* Header decorative circles */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

              <div className="relative z-10">
                <div className="w-14 h-14 mx-auto mb-3 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center rotate-3">
                  <span className="text-2xl">🧾</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight drop-shadow-sm">
                  {billData.restaurantName}
                </h1>
                {billData.restaurantAddress && (
                  <p className="text-white/80 text-sm mt-2 max-w-xs mx-auto">
                    📍 {billData.restaurantAddress}
                  </p>
                )}
                {billData.restaurantPhone && (
                  <p className="text-white/70 text-xs mt-1">
                    📞 {billData.restaurantPhone}
                  </p>
                )}
                {billData.gstin && (
                  <p className="text-white/60 text-xs mt-1 font-mono">
                    GSTIN: {billData.gstin}
                  </p>
                )}
              </div>
            </div>

            {/* Order meta */}
            <div className="px-6 pt-5 pb-3">
              <div className="flex flex-wrap gap-2">
                {billData.orderDate && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] rounded-full text-xs text-gray-300 border border-white/[0.06]">
                    📅 {billData.orderDate}
                  </span>
                )}
                {billData.tableNumber && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] rounded-full text-xs text-gray-300 border border-white/[0.06]">
                    🪑 Table {billData.tableNumber}
                  </span>
                )}
                {billData.customerName && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] rounded-full text-xs text-gray-300 border border-white/[0.06]">
                    👤 {billData.customerName}
                  </span>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="px-6">
              <div className="border-t border-dashed border-white/10" />
            </div>

            {/* Items */}
            <div className="px-6 py-4">
              <h2 className="text-xs font-semibold text-amber-400/80 uppercase tracking-widest mb-3">
                Order Details
              </h2>
              <div className="space-y-2.5">
                {billData.items.map((item, idx) => {
                  const itemTotal = item.price * item.quantity;
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-400">
                          {item.quantity}
                        </span>
                        <span className="text-sm text-gray-200 truncate">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-300 ml-3 tabular-nums">
                        {currencySymbol}
                        {itemTotal.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="px-6">
              <div className="border-t border-dashed border-white/10" />
            </div>

            {/* Totals */}
            <div className="px-6 py-4 space-y-2">
              {/* Subtotal */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Subtotal</span>
                <span className="text-gray-300 tabular-nums">
                  {currencySymbol}
                  {billData.subtotal.toFixed(2)}
                </span>
              </div>

              {/* Discount */}
              {billData.discount && billData.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    🏷️{" "}
                    {billData.promotionName
                      ? `Promo (${billData.promotionName})`
                      : billData.manualDiscountPercent
                        ? `Discount (${billData.manualDiscountPercent}%)`
                        : "Discount"}
                  </span>
                  <span className="text-emerald-400 tabular-nums">
                    -{currencySymbol}
                    {billData.discount.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Grand total */}
              <div className="pt-2 border-t border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-white">Total</span>
                  <div className="text-right">
                    {billData.isNonChargeable ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
                          Non-Chargeable
                        </span>
                        <span className="text-2xl font-bold text-white tabular-nums">
                          {currencySymbol}0.00
                        </span>
                      </div>
                    ) : (
                      <span className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent tabular-nums">
                        {currencySymbol}
                        {billData.total.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment method badge */}
              {paymentMethodLabel && (
                <div className="flex justify-end pt-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Paid via {paymentMethodLabel}
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-5 bg-gradient-to-b from-transparent to-white/[0.03]">
              <div className="text-center mb-5">
                <p className="text-sm text-gray-400">
                  Thank you for dining with us! 🙏
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  — {billData.restaurantName}
                </p>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleDownloadPdf}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.06] hover:border-amber-500/30 transition-all duration-300 group"
                >
                  <Download className="w-4 h-4 text-gray-400 group-hover:text-amber-400 transition-colors" />
                  <span className="text-[10px] font-medium text-gray-400 group-hover:text-gray-300 transition-colors">
                    Download
                  </span>
                </button>
                <button
                  onClick={handleShare}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.06] hover:border-blue-500/30 transition-all duration-300 group"
                >
                  {shareSuccess ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <Share2 className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors" />
                  )}
                  <span className="text-[10px] font-medium text-gray-400 group-hover:text-gray-300 transition-colors">
                    {shareSuccess ? "Shared!" : "Share"}
                  </span>
                </button>
                <button
                  onClick={handleCopyBill}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.06] hover:border-purple-500/30 transition-all duration-300 group"
                >
                  {copied ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400 group-hover:text-purple-400 transition-colors" />
                  )}
                  <span className="text-[10px] font-medium text-gray-400 group-hover:text-gray-300 transition-colors">
                    {copied ? "Copied!" : "Copy"}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Powered by footer */}
          <p className="text-center text-[10px] text-gray-600 mt-4">
            Powered by Swadeshi Software
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicBillPage;

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  QrCode,
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Clock,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { generateQRCodeImage } from "@/utils/qrCodeUtils";
import { useToast } from "@/hooks/use-toast";

interface DynamicUPIQRCodeProps {
  amount: number;
  upiId: string;
  payeeName: string;
  orderNumber?: string;
  tableName?: string;
  onPaymentSuccess?: () => void;
}

export const DynamicUPIQRCode: React.FC<DynamicUPIQRCodeProps> = ({
  amount,
  upiId,
  payeeName,
  orderNumber,
  tableName,
  onPaymentSuccess,
}) => {
  const { toast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minute countdown

  // Format standard NPCI UPI payment URL
  const note = `Order ${orderNumber || ""} Table ${tableName || ""}`.trim();
  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    payeeName
  )}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;

  useEffect(() => {
    let mounted = true;
    generateQRCodeImage(upiUrl, { width: 320, margin: 2 })
      .then((url) => {
        if (mounted) setQrDataUrl(url);
      })
      .catch((err) => console.error("Error generating UPI QR:", err));

    return () => {
      mounted = false;
    };
  }, [upiUrl]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const copyUpiId = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    toast({ title: "UPI ID Copied", description: upiId });
    setTimeout(() => setCopied(false), 2000);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <Card className="rounded-3xl border-2 border-purple-200 dark:border-purple-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 p-4 text-white text-center">
        <Badge className="bg-white/20 hover:bg-white/30 text-white font-black text-[10px] uppercase tracking-wider mb-1">
          Instant UPI Payment
        </Badge>
        <h3 className="text-xl font-black">Scan & Pay ₹{amount.toFixed(2)}</h3>
        <p className="text-xs text-purple-100 mt-0.5 opacity-90">
          Zero-login direct table settlement • GPay, PhonePe, Paytm
        </p>
      </div>

      <CardContent className="p-6 flex flex-col items-center space-y-5">
        {/* Dynamic QR Display */}
        <div className="relative p-4 rounded-3xl bg-white border-2 border-gray-100 shadow-xl flex flex-col items-center">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Dynamic UPI QR Code"
              className="w-56 h-56 rounded-2xl object-contain"
            />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center">
              <QrCode className="w-12 h-12 text-gray-400 animate-pulse" />
            </div>
          )}

          {/* Table & Timer Pill */}
          <div className="mt-3 flex items-center justify-between w-full text-xs font-extrabold text-gray-700 px-1">
            <span className="text-purple-600 bg-purple-50 dark:bg-purple-950/50 px-2.5 py-1 rounded-xl">
              {tableName ? `Table ${tableName}` : "Dine-In"}
            </span>

            <span className="flex items-center gap-1 text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-xl font-mono">
              <Clock className="w-3.5 h-3.5" />
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* 1-Tap Mobile UPI Intent Button */}
        <div className="w-full space-y-2">
          <a
            href={upiUrl}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-sm shadow-lg shadow-emerald-500/25 transition-all text-center"
          >
            <Smartphone className="w-5 h-5" />
            Open UPI App (GPay / PhonePe / Paytm)
            <ArrowRight className="w-4 h-4" />
          </a>

          {/* Copy UPI ID */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-xs">
            <div className="flex flex-col text-left pl-2">
              <span className="text-[10px] font-bold text-gray-400">PAYEE VPA / UPI ID</span>
              <span className="font-mono font-black text-gray-800 dark:text-gray-200 truncate max-w-[200px]">
                {upiId}
              </span>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={copyUpiId}
              className="rounded-xl h-8 text-xs font-bold gap-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Encrypted Direct Bank Transfer • Automatic KOT Generation</span>
        </div>
      </CardContent>
    </Card>
  );
};

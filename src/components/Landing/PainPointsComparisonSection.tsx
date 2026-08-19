import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  ShieldOff,
  Shield,
  Eye,
  EyeOff,
  CreditCard,
  Wallet,
} from "lucide-react";

export const PainPointsComparisonSection: React.FC = () => {
  const painPoints = [
    {
      icon: TrendingDown,
      pain: "Swiggy / Zomato takes 25-30% per order",
      fix: "Own website & direct ordering — 0% commission",
      painIcon: XCircle,
      fixIcon: CheckCircle2,
    },
    {
      icon: CreditCard,
      pain: "Renting billing software forever (₹15K-35K/year, locked-in)",
      fix: "One-time ownership — no renewal, no lock-in ever",
      painIcon: XCircle,
      fixIcon: CheckCircle2,
    },
    {
      icon: EyeOff,
      pain: "Aggregators own your customer data & reviews",
      fix: "All customer data stored under YOUR brand",
      painIcon: XCircle,
      fixIcon: CheckCircle2,
    },
    {
      icon: ShieldOff,
      pain: "Invisible on Google, no local search presence",
      fix: "Branded .in domain + Google Business + QR code setup",
      painIcon: XCircle,
      fixIcon: CheckCircle2,
    },
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-white via-gray-50 to-white dark:from-[#1A1A2E] dark:via-[#151522] dark:to-[#1A1A2E]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Headline */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#2D3A5F] dark:text-white tracking-tight mb-4">
            You're Working Hard.{" "}
            <span className="text-[#E23744]">Someone Else Is Cashing In.</span>
          </h2>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300">
            Every month, aggregator fees and software subscriptions silently drain your restaurant's profit. Here's what changes.
          </p>
        </div>

        {/* Two-Column Comparison */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT — The Leaky Bucket */}
          <div className="rounded-3xl border-2 border-red-200 dark:border-red-900/50 bg-gradient-to-br from-red-50/80 to-orange-50/50 dark:from-red-950/20 dark:to-orange-950/10 p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-200/30 dark:bg-red-800/10 rounded-full blur-2xl -mr-10 -mt-10" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-red-200/60 dark:border-red-800/40">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-red-800 dark:text-red-300 uppercase tracking-wide">
                    Today: The Leaky Bucket
                  </h3>
                  <p className="text-xs text-red-600/80 dark:text-red-400/60">What most restaurants suffer from</p>
                </div>
              </div>

              <div className="space-y-4">
                {painPoints.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-sm font-medium text-red-900 dark:text-red-200">{item.pain}</p>
                  </div>
                ))}
              </div>

              {/* Visual bleed indicator */}
              <div className="mt-6 p-3 rounded-xl bg-red-100/80 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-center">
                <p className="text-xs text-red-700 dark:text-red-300 font-semibold">
                  💸 Estimated yearly loss: <span className="text-base font-extrabold">₹1.5L – ₹4L+</span> per outlet
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT — Own the Engine */}
          <div className="rounded-3xl border-2 border-emerald-300 dark:border-emerald-700/50 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/10 p-6 sm:p-8 relative overflow-hidden shadow-lg shadow-emerald-500/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/30 dark:bg-emerald-800/10 rounded-full blur-2xl -mr-10 -mt-10" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-emerald-200/60 dark:border-emerald-800/40">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
                    With Swadeshi: You Own Everything
                  </h3>
                  <p className="text-xs text-emerald-600/80 dark:text-emerald-400/60">What switches when you join</p>
                </div>
              </div>

              <div className="space-y-4">
                {painPoints.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                    <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">{item.fix}</p>
                  </div>
                ))}
              </div>

              {/* Visual savings indicator */}
              <div className="mt-6 p-3 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
                <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                  💰 Money stays in YOUR bank: <span className="text-base font-extrabold">₹1.5L – ₹4L+ saved</span> per year
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

import React, { useState } from "react";
import {
  Calculator,
  TrendingUp,
  Percent,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Smartphone,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const InteractiveRoiCalculator: React.FC = () => {
  const [monthlyRevenue, setMonthlyRevenue] = useState(450000); // 4.5 Lakhs
  const [numOutlets, setNumOutlets] = useState(1);
  const [onlinePct, setOnlinePct] = useState(40); // 40% online

  // Calculations
  const monthlyOnlineRev = (monthlyRevenue * onlinePct) / 100;
  const annualAggregatorCommissions = Math.round(
    monthlyOnlineRev * 0.24 * 12 * numOutlets,
  );

  // By using direct ordering website, assume converting 25% of aggregator orders to direct 0% commission
  const annualDirectConversionSavings = Math.round(
    annualAggregatorCommissions * 0.25,
  );

  // Competitor SaaS subscription cost per year per outlet (PetPooja/Posist + Aggregator add-on + Loyalty + Webstore)
  const competitorBaseCostPerOutlet = 28000;
  const competitorAddonsPerOutlet = 16000; // Swiggy sync + inventory + KDS add-on fees
  const competitorTotalAnnualSaaS =
    (competitorBaseCostPerOutlet + competitorAddonsPerOutlet) * numOutlets;

  // Swadeshi all-in-one estimated cost savings
  const totalAnnualSavings =
    competitorTotalAnnualSaaS + annualDirectConversionSavings;
  const threeYearSavings = totalAnnualSavings * 3;

  return (
    <section
      id="roi-calculator"
      className="py-20 relative bg-white dark:bg-[#1A1A2E] overflow-hidden"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-bold uppercase tracking-wider mb-4">
            <Calculator className="w-4 h-4 text-emerald-500" />
            Interactive ROI & Cost Comparison
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#2D3A5F] dark:text-white tracking-tight mb-4">
            Calculate How Much You Stop Bleeding.{" "}
            <span className="text-[#F26722]">Guaranteed.</span>
          </h2>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300">
            Compare recurring software subscriptions and aggregator commissions
            against our unified Swadeshi ecosystem.
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Controls on Left */}
          <div className="lg:col-span-6 bg-gray-50 dark:bg-[#202038] p-6 sm:p-8 rounded-3xl border border-gray-200 dark:border-gray-700/80 flex flex-col justify-between shadow-lg">
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-[#2D3A5F] dark:text-white flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-3">
                <Zap className="w-5 h-5 text-[#F26722]" />
                Your Restaurant Metrics
              </h3>

              {/* Slider 1: Monthly Revenue */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Monthly Revenue per Outlet
                  </label>
                  <span className="text-sm font-extrabold text-[#2E3192] dark:text-[#F26722]">
                    ₹{(monthlyRevenue / 100000).toFixed(1)} Lakhs
                  </span>
                </div>
                <input
                  type="range"
                  min={100000}
                  max={3000000}
                  step={50000}
                  value={monthlyRevenue}
                  onChange={(e) => setMonthlyRevenue(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#2E3192]"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>₹1 Lakh</span>
                  <span>₹15 Lakhs</span>
                  <span>₹30 Lakhs</span>
                </div>
              </div>

              {/* Slider 2: Number of Outlets */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Number of Branches / Outlets
                  </label>
                  <span className="text-sm font-extrabold text-[#2E3192] dark:text-[#F26722]">
                    {numOutlets} {numOutlets === 1 ? "Outlet" : "Outlets"}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={numOutlets}
                  onChange={(e) => setNumOutlets(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#2E3192]"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>1 (Single)</span>
                  <span>5 (Multi)</span>
                  <span>10 (Franchise)</span>
                </div>
              </div>

              {/* Slider 3: % of Online Orders */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    % Orders from Swiggy / Zomato
                  </label>
                  <span className="text-sm font-extrabold text-[#FC8019]">
                    {onlinePct}%
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={90}
                  step={5}
                  value={onlinePct}
                  onChange={(e) => setOnlinePct(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#FC8019]"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>10% (Dine-in heavy)</span>
                  <span>50%</span>
                  <span>90% (Cloud Kitchen)</span>
                </div>
              </div>

              {/* Assumptions footnote */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#18182C] border border-gray-200/80 dark:border-gray-800 text-[11px] text-gray-500 space-y-1">
                <p className="font-semibold text-gray-700 dark:text-gray-300">
                  ⚙️ Calculation Assumptions:
                </p>
                <p>
                  • Competitor SaaS: ₹28k base + ₹16k add-ons / outlet / year.
                </p>
                <p>• Aggregator commission: 24% blended average.</p>
                <p>
                  • Direct conversion: 25% shift to your zero-commission
                  website.
                </p>
              </div>
            </div>
          </div>

          {/* Results Comparison on Right */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
            {/* Total 3-Year Savings Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#2E3192] to-[#161852] text-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#F26722]/20 rounded-full blur-2xl pointer-events-none" />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <Badge className="bg-[#F26722] text-white font-bold text-xs">
                    Estimated 3-Year Financial Impact
                  </Badge>
                  <Sparkles className="w-5 h-5 text-[#FFD93D]" />
                </div>

                <p className="text-xs text-gray-300">
                  Total Money Retained In Your Bank:
                </p>
                <h3 className="text-4xl sm:text-5xl font-extrabold text-[#FFD93D] my-2 tracking-tight">
                  ₹{threeYearSavings.toLocaleString("en-IN")}
                </h3>
                <p className="text-xs text-gray-300">
                  (≈ ₹
                  {(totalAnnualSavings / 12).toLocaleString("en-IN", {
                    maximumFractionDigits: 0,
                  })}{" "}
                  saved every single month)
                </p>
              </div>

              {/* Breakdown Grid */}
              <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t border-white/15">
                <div className="p-3 rounded-xl bg-white/10 backdrop-blur-xs">
                  <span className="text-[10px] text-gray-300 block">
                    SaaS Fees Saved:
                  </span>
                  <span className="text-base font-bold text-emerald-400">
                    ₹{(competitorTotalAnnualSaaS * 3).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white/10 backdrop-blur-xs">
                  <span className="text-[10px] text-gray-300 block">
                    Commission Retained:
                  </span>
                  <span className="text-base font-bold text-emerald-400">
                    ₹
                    {(annualDirectConversionSavings * 3).toLocaleString(
                      "en-IN",
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Feature comparison pills */}
            <div className="p-5 rounded-2xl bg-gray-50 dark:bg-[#202038] border border-gray-200 dark:border-gray-700/80 space-y-2.5 text-xs">
              <div className="flex items-center justify-between font-semibold text-gray-800 dark:text-gray-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Free Branded Webstore with Domain Included</span>
                </div>
                <span className="text-emerald-600 font-bold">Included</span>
              </div>
              <div className="flex items-center justify-between font-semibold text-gray-800 dark:text-gray-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Swiggy & Zomato 2-Way Sync with Auto-Accept</span>
                </div>
                <span className="text-emerald-600 font-bold">Included</span>
              </div>
              <div className="flex items-center justify-between font-semibold text-gray-800 dark:text-gray-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Live Recipe Costing & Multi-Language Staff Mode</span>
                </div>
                <span className="text-emerald-600 font-bold">Included</span>
              </div>
            </div>

            {/* CTA Button */}
            <a
              href="https://wa.me/918806957143?text=Hi%20Swadeshi%20Solutions%2C%20I%20used%20the%20ROI%20calculator%20and%20want%20a%20detailed%20savings%20quote%20for%20my%20restaurant."
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-[#F26722] to-[#FF6B6B] hover:opacity-95 text-white font-bold text-sm shadow-lg shadow-[#F26722]/25 transition-all text-center"
            >
              Get Full Custom Savings Audit on WhatsApp
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

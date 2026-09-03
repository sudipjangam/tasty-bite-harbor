import React, { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Minus,
  Zap,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const features = [
  { name: "Payment Model", swadeshi: "From ₹208/mo (₹2,499/yr)", petpooja: "₹10K-25K/yr + AMC", posist: "₹25K-35K/yr + AMC" },
  { name: "Own Branded Website (Free)", swadeshi: true, petpooja: false, posist: false },
  { name: "Direct Ordering (0% Commission)", swadeshi: true, petpooja: false, posist: false },
  { name: "Unified KDS (Swiggy + Zomato + Dine-in)", swadeshi: true, petpooja: "Add-on ₹6K/yr", posist: "Add-on" },
  { name: "Live Profit Margin Per Dish", swadeshi: true, petpooja: false, posist: false },
  { name: "Franchise / Multi-Branch Sync", swadeshi: true, petpooja: "Enterprise only", posist: "Enterprise only" },
  { name: "Hotel Room & PMS Module", swadeshi: true, petpooja: false, posist: false },
  { name: "Telugu / Hindi / Tamil Staff UI", swadeshi: true, petpooja: false, posist: false },
  { name: "On-Site Setup (Your City)", swadeshi: true, petpooja: "Self-setup", posist: "Self-setup" },
  { name: "Row-Level Security (RLS)", swadeshi: true, petpooja: false, posist: false },
  { name: "Offline POS / PWA Mode", swadeshi: true, petpooja: true, posist: true },
  { name: "Customer Data Stays Yours", swadeshi: true, petpooja: "Partial", posist: "Partial" },
];

const renderCell = (value: boolean | string) => {
  if (value === true) return <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />;
  if (value === false) return <XCircle className="w-5 h-5 text-red-400 mx-auto" />;
  return <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{value}</span>;
};

export const CompetitorComparisonMatrix: React.FC = () => {
  const [yearsHorizon, setYearsHorizon] = useState(5);

  // Cost calculation: Swadeshi Professional Plan (₹4,499/yr) vs Competitors with 7% annual inflation
  const swadeshiAnnualBase = 4499; // Hero Plan: Professional (₹4,499/yr)
  const petpoojaBase = 25000;
  const posistBase = 35000;

  const swadeshiCost = swadeshiAnnualBase * yearsHorizon;

  const calcCumulativeCost = (base: number, years: number) => {
    let total = 0;
    for (let y = 0; y < years; y++) {
      total += Math.round(base * Math.pow(1.07, y));
    }
    return total;
  };

  const petpoojaCost = calcCumulativeCost(petpoojaBase, yearsHorizon);
  const posistCost = calcCumulativeCost(posistBase, yearsHorizon);
  const savingsVsPetpooja = petpoojaCost - swadeshiCost;
  const savingsVsPosist = posistCost - swadeshiCost;

  return (
    <section id="compare" className="py-20 bg-white dark:bg-[#1A1A2E]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#2E3192]/10 border border-[#2E3192]/20 text-[#2E3192] dark:text-[#F26722] text-xs sm:text-sm font-bold uppercase tracking-wider mb-4">
            <Zap className="w-4 h-4 text-[#F26722]" />
            Feature & Cost Matrix
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#2D3A5F] dark:text-white tracking-tight mb-4">
            See Exactly What You Get.{" "}
            <span className="text-[#F26722]">No Hidden Fees.</span>
          </h2>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300">
            Side-by-side comparison with India's most popular restaurant software. Every feature. Every rupee.
          </p>
        </div>

        {/* Interactive Cost Slider */}
        <div className="max-w-4xl mx-auto mb-10 p-6 rounded-2xl bg-gradient-to-r from-[#2E3192]/5 via-[#F26722]/5 to-[#2E3192]/5 border border-[#2E3192]/15">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#2D3A5F] dark:text-white">
                Time Horizon: <span className="text-[#F26722]">{yearsHorizon} {yearsHorizon === 1 ? "Year" : "Years"}</span>
              </h3>
              <p className="text-xs text-gray-500">Drag slider to see cumulative cost with 7% annual inflation</p>
            </div>
            <Badge className="bg-emerald-600 text-white text-xs font-bold">
              You save ₹{savingsVsPetpooja.toLocaleString("en-IN")} vs PetPooja
            </Badge>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={yearsHorizon}
            onChange={(e) => setYearsHorizon(Number(e.target.value))}
            className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#2E3192]"
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-mono">
            <span>1 yr</span><span>3 yrs</span><span>5 yrs</span><span>7 yrs</span><span>10 yrs</span>
          </div>

          {/* Cost Bar Visualization */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6">
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 p-4 text-center">
              <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider mb-1">Swadeshi Solutions</p>
              <p className="text-xl sm:text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">
                ₹{swadeshiCost.toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-emerald-600/80 mt-0.5">₹4,499/yr (Professional Plan) • Zero AMC</p>
            </div>
            <div className="rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 p-4 text-center">
              <p className="text-[10px] uppercase font-bold text-orange-600 tracking-wider mb-1">PetPooja</p>
              <p className="text-xl sm:text-2xl font-extrabold text-orange-700 dark:text-orange-400">
                ₹{petpoojaCost.toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-red-500 font-semibold mt-0.5">+₹{savingsVsPetpooja.toLocaleString("en-IN")} more</p>
            </div>
            <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4 text-center">
              <p className="text-[10px] uppercase font-bold text-red-600 tracking-wider mb-1">Posist / Restroworks</p>
              <p className="text-xl sm:text-2xl font-extrabold text-red-700 dark:text-red-400">
                ₹{posistCost.toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-red-500 font-semibold mt-0.5">+₹{savingsVsPosist.toLocaleString("en-IN")} more</p>
            </div>
          </div>
        </div>

        {/* Feature Matrix Table */}
        <p className="text-center text-xs text-gray-400 sm:hidden mb-2">👉 Swipe left to compare all features</p>
        <div className="max-w-4xl mx-auto rounded-2xl border border-gray-200 dark:border-gray-800 overflow-x-auto shadow-lg">
          <div className="min-w-[500px]">
            {/* Table Header */}
            <div className="grid grid-cols-4 bg-gray-100 dark:bg-[#161628] text-xs font-bold">
              <div className="p-3 sm:p-4 text-gray-700 dark:text-gray-300">Feature</div>
              <div className="p-3 sm:p-4 text-center text-[#2E3192] dark:text-[#F26722]">Swadeshi</div>
              <div className="p-3 sm:p-4 text-center text-gray-500">PetPooja</div>
              <div className="p-3 sm:p-4 text-center text-gray-500">Posist</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {features.map((f, i) => (
                <div
                  key={i}
                  className={`grid grid-cols-4 text-xs sm:text-sm items-center ${
                    i % 2 === 0
                      ? "bg-white dark:bg-[#1E1E34]"
                      : "bg-gray-50/50 dark:bg-[#1A1A2E]"
                  }`}
                >
                  <div className="p-3 sm:p-4 font-medium text-gray-800 dark:text-gray-200">
                    {f.name}
                  </div>
                  <div className="p-3 sm:p-4 text-center">
                    {renderCell(f.swadeshi)}
                  </div>
                  <div className="p-3 sm:p-4 text-center">
                    {renderCell(f.petpooja)}
                  </div>
                  <div className="p-3 sm:p-4 text-center">
                    {renderCell(f.posist)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4 italic">
          In the same time PetPooja takes {yearsHorizon} year{yearsHorizon > 1 ? "s" : ""} of compounding fees from you — you save over ₹{savingsVsPetpooja.toLocaleString("en-IN")} with Swadeshi Solutions.
        </p>
      </div>
    </section>
  );
};

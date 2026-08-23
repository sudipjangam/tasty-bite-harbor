import React from "react";
import {
  ShieldCheck,
  Wallet,
  MapPin,
  Lock,
  RotateCcw,
  Star,
} from "lucide-react";

const badges = [
  { icon: ShieldCheck, label: "GST Compliant", desc: "100% GST-ready invoicing" },
  { icon: Wallet, label: "UPI / Razorpay Ready", desc: "Accept all payment modes" },
  { icon: MapPin, label: "Made in India", desc: "On-site support in your city" },
  { icon: Lock, label: "DPDP-Ready", desc: "Data privacy act compliant" },
  { icon: RotateCcw, label: "14-Day Free Trial", desc: "Full refund, no questions" },
  { icon: Star, label: "Trusted by 100+ Restaurants", desc: "Live since 2025" },
];

export const TrustBadgesStrip: React.FC = () => {
  return (
    <section className="py-10 bg-white dark:bg-[#1A1A2E] border-y border-gray-100 dark:border-gray-800/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {badges.map((badge, i) => {
            const Icon = badge.icon;
            return (
              <div
                key={i}
                className="flex flex-col items-center text-center p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-[#202038] transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl bg-[#2E3192]/10 dark:bg-[#F26722]/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Icon className="w-5 h-5 text-[#2E3192] dark:text-[#F26722]" />
                </div>
                <h4 className="text-xs font-bold text-gray-800 dark:text-white">{badge.label}</h4>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{badge.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

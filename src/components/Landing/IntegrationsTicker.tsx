import React from "react";

const integrations = [
  { name: "Swiggy", color: "#FC8019" },
  { name: "Zomato", color: "#E23744" },
  { name: "Razorpay", color: "#0270D7" },
  { name: "PhonePe", color: "#5F259F" },
  { name: "Google Pay", color: "#4285F4" },
  { name: "Paytm", color: "#00BAF2" },
  { name: "WhatsApp", color: "#25D366" },
  { name: "UPI", color: "#0D9E4C" },
  { name: "Dineout", color: "#D92B3A" },
  { name: "Google Business", color: "#4285F4" },
];

export const IntegrationsTicker: React.FC = () => {
  return (
    <section className="py-10 bg-gray-50/80 dark:bg-[#161628] border-y border-gray-200/50 dark:border-gray-800/50 overflow-hidden">
      <div className="container mx-auto px-4 mb-6">
        <p className="text-center text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
          Plays Nicely With Everything You Already Use
        </p>
      </div>

      {/* Infinite Scroll Marquee */}
      <div className="relative">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...integrations, ...integrations, ...integrations].map((item, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-2.5 mx-6 sm:mx-8 px-5 py-2.5 rounded-xl bg-white dark:bg-[#1E1E34] border border-gray-200/80 dark:border-gray-700/60 shadow-sm hover:shadow-md transition-shadow group"
            >
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-[#2E3192] dark:group-hover:text-[#F26722] transition-colors">
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

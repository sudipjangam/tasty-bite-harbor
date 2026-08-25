import React, { useState, useEffect } from "react";
import { Smartphone } from "lucide-react";

export const StickyDemoBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling 600px
      setVisible(window.scrollY > 600);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (dismissed || !visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 transition-all duration-500 animate-fade-in-up">
      <div className="bg-[#1E1E34]/95 backdrop-blur-md border-t border-gray-700/50 shadow-2xl">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-white">
            <span className="flex h-2.5 w-2.5 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#25D366]"></span>
            </span>
            <p className="text-xs sm:text-sm font-medium">
              <span className="hidden sm:inline">
                Not sure if this fits your restaurant?{" "}
              </span>
              <span className="font-bold">
                Free 20-min WhatsApp walkthrough.
              </span>
              <span className="hidden md:inline text-gray-400">
                {" "}
                No credit card. Same-day reply.
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://wa.me/918806957143?text=Hi%20Swadeshi%20Solutions%2C%20I%20want%20a%20quick%20walkthrough%20of%20the%20RMS%20platform!"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white text-xs font-bold shadow-md hover:scale-105 transition-transform whitespace-nowrap"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Book Free Demo
            </a>
            <button
              onClick={() => setDismissed(true)}
              className="text-gray-400 hover:text-white text-xs px-2 py-1"
              aria-label="Dismiss banner"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

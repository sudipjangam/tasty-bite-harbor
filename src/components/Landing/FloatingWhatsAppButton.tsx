import React from "react";
import { MessageCircle, Smartphone } from "lucide-react";

export const FloatingWhatsAppButton: React.FC = () => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center group">
      {/* Tooltip badge */}
      <span className="hidden md:inline-flex mr-3 px-3.5 py-1.5 rounded-full bg-[#1E1E34] text-white text-xs font-semibold shadow-xl border border-gray-700 items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
        <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
        Live Support & Demo (10 min reply)
      </span>

      {/* Button */}
      <a
        href="https://wa.me/918790425317?text=Hi%20Swadeshi%20Solutions%2C%20I%20wanna%20book%20a%20free%20demo%20of%20the%20Restaurant%20Management%20Platform!"
        target="_blank"
        rel="noreferrer"
        aria-label="Book Demo on WhatsApp"
        className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#25D366] to-[#128C7E] text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-transform duration-300 ring-4 ring-[#25D366]/20"
      >
        <MessageCircle className="w-7 h-7 fill-white text-white" />
      </a>
    </div>
  );
};

import React from "react";
import { useTheme } from "@/hooks/useTheme";
import SwadeshiLogoImage from "@/assets/swadeshi-logo.png";

interface SwadeshiLoaderProps {
  /** Text to show while loading */
  loadingText?: string;
  /** Words to rotate through */
  words?: string[];
  /** Size of the logo */
  size?: number;
}

/**
 * Swadeshi Solutions Branded Loader
 * Features the logo with rotating text below.
 * Perfect for full-page loading states.
 */
const SwadeshiLoader: React.FC<SwadeshiLoaderProps> = ({
  loadingText = "loading",
  words = [
    "solutions",
    "innovations",
    "possibilities",
    "experiences",
    "solutions",
  ],
  size = 120,
}) => {
  const { actualTheme } = useTheme();
  const isDark = actualTheme === "dark";

  return (
    <div className="flex flex-col items-center gap-6">
      <style>{`
        @keyframes swadeshi-word-spin {
          10% { transform: translateY(-102%); }
          25% { transform: translateY(-100%); }
          35% { transform: translateY(-202%); }
          50% { transform: translateY(-200%); }
          60% { transform: translateY(-302%); }
          75% { transform: translateY(-300%); }
          85% { transform: translateY(-402%); }
          100% { transform: translateY(-400%); }
        }
        .animate-swadeshi-word {
          animation: swadeshi-word-spin 4s infinite;
        }
      `}</style>

      {/* Swadeshi Solutions Logo Image */}
      <img
        src={SwadeshiLogoImage}
        alt="Swadeshi Solutions"
        className="object-contain"
        style={{ width: size, height: "auto" }}
      />

      {/* Text Loader with rotating words */}
      <div
        className={`rounded-[1.25rem] px-6 py-3 sm:px-8 sm:py-4 transition-colors ${
          isDark
            ? "bg-slate-800 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3),0_2px_4px_-1px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.1)]"
            : "bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.05)]"
        }`}
      >
        <div
          className={`flex items-center font-medium h-7 sm:h-9 text-[16px] sm:text-[22px] font-['Inter','Poppins',sans-serif] ${
            isDark ? "text-slate-400" : "text-slate-500"
          }`}
        >
          <p className="m-0">{loadingText}</p>
          <div className="relative overflow-hidden h-7 sm:h-9 pl-1.5">
            <div
              className={`absolute inset-0 z-20 pointer-events-none ${
                isDark
                  ? "bg-gradient-to-b from-slate-800 via-transparent to-slate-800"
                  : "bg-gradient-to-b from-white via-transparent to-white"
              }`}
            />
            {words.map((word, index) => (
              <span
                key={index}
                className="block h-full text-[#F26722] font-semibold animate-swadeshi-word"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwadeshiLoader;

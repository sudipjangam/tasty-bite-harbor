import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll } from "framer-motion";
import {
  QrCode,
  UtensilsCrossed,
  ChefHat,
  Receipt,
  TrendingUp,
  CheckCircle2,
  Clock,
  Sparkles,
  Smartphone,
  Flame,
  ArrowRight,
  ShieldCheck,
  Building2,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const HowItWorksSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (latest) => {
      if (latest < 0.25) {
        setActiveStep(0);
      } else if (latest < 0.5) {
        setActiveStep(1);
      } else if (latest < 0.75) {
        setActiveStep(2);
      } else {
        setActiveStep(3);
      }
    });

    return () => unsubscribe();
  }, [scrollYProgress]);

  const steps = [
    {
      id: "order",
      stepNumber: "01",
      title: "Contactless QR & Online Ordering",
      shortTitle: "Smart Ordering",
      description:
        "Dine-in guests scan dynamic table QRs to browse digital menus with photos, customize modifiers, and fire orders straight to kitchen without waiting for waiters.",
      color: "#FF6B6B",
      icon: <Smartphone className="w-5 h-5" />,
      badge: "Zero Wait Time",
    },
    {
      id: "kds",
      stepNumber: "02",
      title: "Instant Kitchen Display System (KDS)",
      shortTitle: "Zero-Lag Kitchen",
      description:
        "Orders instantly appear on kitchen display terminals. Color-coded prep timers, item routing by prep station, and zero lost paper tickets guarantee lightning food prep.",
      color: "#F26722",
      icon: <ChefHat className="w-5 h-5" />,
      badge: "Real-Time KOT",
    },
    {
      id: "pos",
      stepNumber: "03",
      title: "High-Speed POS & Instant Billing",
      shortTitle: "1-Click Checkout",
      description:
        "Single-tap bill generation with automated GST, split-payments, dynamic UPI QR display on customer screens, and instant WhatsApp invoice delivery.",
      color: "#6BCB77",
      icon: <Receipt className="w-5 h-5" />,
      badge: "3-Sec Checkout",
    },
    {
      id: "analytics",
      stepNumber: "04",
      title: "AI Franchise Telemetry & Profit Engine",
      shortTitle: "AI Profit Engine",
      description:
        "Live sales velocity, dish margin analysis, automated inventory depletion warnings, and centralized multi-branch management right in your pocket.",
      color: "#2D3A5F",
      icon: <TrendingUp className="w-5 h-5" />,
      badge: "Live Telemetry",
    },
  ];

  return (
    <section
      ref={containerRef}
      id="how-it-works"
      className="relative bg-[#FAFAFC] dark:bg-[#151522] py-12 lg:py-0 lg:min-h-[300vh]"
    >
      {/* Sticky Scrollytelling Container */}
      <div className="lg:sticky lg:top-20 lg:h-[calc(100vh-5rem)] flex items-center overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-8 lg:mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 text-[#FF6B6B] text-xs sm:text-sm font-semibold mb-3">
              <Sparkles className="w-4 h-4 animate-spin-slow" />
              <span>SCROLL-DRIVEN SIMULATOR</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#2D3A5F] dark:text-white tracking-tight">
              The Restaurant Engine in{" "}
              <span className="landing-gradient-text">Motion</span>
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-2">
              Scroll down to watch how an order flows seamlessly from guest table to kitchen to profit.
            </p>
          </div>

          {/* Grid Layout: Left Steps + Right Interactive Screen */}
          <div className="grid lg:grid-cols-12 gap-8 items-center max-w-6xl mx-auto">
            {/* Left Steps Navigation */}
            <div className="lg:col-span-5 space-y-3 sm:space-y-4">
              {steps.map((step, idx) => {
                const isActive = activeStep === idx;
                return (
                  <div
                    key={step.id}
                    onClick={() => setActiveStep(idx)}
                    className={`cursor-pointer p-4 sm:p-5 rounded-2xl transition-all duration-300 border relative overflow-hidden ${
                      isActive
                        ? "bg-white dark:bg-[#1E1E30] shadow-xl border-[#FF6B6B]/30 scale-[1.02]"
                        : "bg-white/60 dark:bg-[#1A1A2E]/50 border-gray-200/60 dark:border-gray-800 hover:bg-white/90 dark:hover:bg-[#1E1E30]/80"
                    }`}
                  >
                    {/* Active Left Glow Bar */}
                    {isActive && (
                      <motion.div
                        layoutId="activeStepBar"
                        className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#FF6B6B] to-[#F26722]"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}

                    <div className="flex items-start gap-4">
                      {/* Step Number & Icon */}
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-colors ${
                          isActive
                            ? "bg-[#FF6B6B] text-white shadow-md shadow-[#FF6B6B]/30"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {step.stepNumber}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3
                            className={`font-bold text-base sm:text-lg transition-colors ${
                              isActive
                                ? "text-[#2D3A5F] dark:text-white"
                                : "text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {step.shortTitle}
                          </h3>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              isActive
                                ? "bg-[#FF6B6B]/15 text-[#FF6B6B]"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                            }`}
                          >
                            {step.badge}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Interactive Simulator Stage */}
            <div className="lg:col-span-7">
              <div className="relative rounded-3xl p-2 sm:p-3 bg-gradient-to-br from-gray-900/10 via-gray-900/5 to-transparent dark:from-white/10 dark:via-white/5 dark:to-transparent border border-gray-200/80 dark:border-white/10 shadow-2xl backdrop-blur-xl">
                {/* Device Bezel Top Header */}
                <div className="bg-[#1F2430] dark:bg-[#0D0F17] rounded-2xl p-4 sm:p-6 text-white min-h-[380px] sm:min-h-[420px] flex flex-col justify-between relative overflow-hidden shadow-inner">
                  {/* Top Bar status */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#FF6B6B]" />
                      <div className="w-3 h-3 rounded-full bg-[#FFD93D]" />
                      <div className="w-3 h-3 rounded-full bg-[#6BCB77]" />
                      <span className="text-[11px] font-mono text-gray-400 ml-2">
                        RMS Engine • Live State Simulation
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      SYNCED
                    </div>
                  </div>

                  {/* Stage Dynamic Content with Animation */}
                  <AnimatePresence mode="wait">
                    {activeStep === 0 && (
                      <motion.div
                        key="step-0"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4 my-auto"
                      >
                        <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[#FF6B6B]/20 flex items-center justify-center text-[#FF6B6B]">
                              <QrCode className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">Scanned QR Code</p>
                              <p className="text-sm font-bold text-white">Table 07 • Dine-In Guest</p>
                            </div>
                          </div>
                          <span className="text-xs text-[#6BCB77] bg-[#6BCB77]/10 px-2 py-1 rounded-md border border-[#6BCB77]/20">
                            Instant Access
                          </span>
                        </div>

                        {/* Order Cart Simulation */}
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2">
                          <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                            Selected Menu Items
                          </p>
                          <div className="flex justify-between items-center text-sm py-1 border-b border-white/5">
                            <span className="text-gray-200">2x Butter Chicken Masala</span>
                            <span className="font-semibold text-white">₹680</span>
                          </div>
                          <div className="flex justify-between items-center text-sm py-1 border-b border-white/5">
                            <span className="text-gray-200">4x Garlic Butter Naan</span>
                            <span className="font-semibold text-white">₹240</span>
                          </div>
                          <div className="flex justify-between items-center text-sm py-1">
                            <span className="text-gray-200">2x Fresh Lime Soda</span>
                            <span className="font-semibold text-white">₹160</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <div>
                            <p className="text-xs text-gray-400">Cart Total</p>
                            <p className="text-xl font-bold text-white">₹1,080</p>
                          </div>
                          <div className="flex items-center gap-2 bg-[#FF6B6B] text-white px-4 py-2.5 rounded-xl font-semibold text-xs shadow-lg shadow-[#FF6B6B]/30 animate-pulse">
                            <span>Order Fired to Kitchen</span>
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeStep === 1 && (
                      <motion.div
                        key="step-1"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4 my-auto"
                      >
                        <div className="flex items-center justify-between bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                              <Flame className="w-6 h-6 animate-bounce" />
                            </div>
                            <div>
                              <p className="text-xs text-amber-400">Kitchen Display Station 01</p>
                              <p className="text-sm font-bold text-white">KOT #1082 • Live Prep</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-amber-300 font-mono bg-amber-500/20 px-2.5 py-1 rounded-md">
                            <Clock className="w-3.5 h-3.5" />
                            <span>07:24 mins</span>
                          </div>
                        </div>

                        {/* Chef Items Checklist */}
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2.5">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-400" />
                              <span className="text-gray-200">2x Butter Chicken Masala</span>
                            </div>
                            <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">Ready</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                              <span className="text-gray-200">4x Garlic Butter Naan</span>
                            </div>
                            <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">In Tandoor</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-blue-400" />
                              <span className="text-gray-200">2x Fresh Lime Soda</span>
                            </div>
                            <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">Bar Station</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <p className="text-xs text-gray-400">Station routing: Curry (1) • Tandoor (1) • Bar (1)</p>
                          <div className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3.5 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-colors">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Mark Order Ready</span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeStep === 2 && (
                      <motion.div
                        key="step-2"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4 my-auto"
                      >
                        <div className="flex items-center justify-between bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                              <Receipt className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-xs text-emerald-400">Smart Billing Terminal</p>
                              <p className="text-sm font-bold text-white">Invoice #TB-9418 • Paid</p>
                            </div>
                          </div>
                          <span className="text-xs text-emerald-300 bg-emerald-500/20 px-2 py-1 rounded-md">
                            Zero Discrepancy
                          </span>
                        </div>

                        {/* Split Bill Breakdown */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                            <p className="text-[11px] text-gray-400">Payment Mode</p>
                            <p className="text-sm font-bold text-white mt-1">UPI Dynamic QR</p>
                            <p className="text-[11px] text-emerald-400 mt-1">Txn ID: #984210</p>
                          </div>
                          <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                            <p className="text-[11px] text-gray-400">GST Breakdown</p>
                            <p className="text-sm font-bold text-white mt-1">CGST + SGST (5%)</p>
                            <p className="text-[11px] text-gray-400 mt-1">Automated Compliant</p>
                          </div>
                        </div>

                        <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-400">Total Settled</p>
                            <p className="text-xl font-bold text-emerald-400">₹1,134.00</p>
                          </div>
                          <div className="text-right">
                            <span className="inline-block text-[11px] bg-white/10 text-gray-300 px-2.5 py-1 rounded-md">
                              WhatsApp Bill Dispatched ✓
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeStep === 3 && (
                      <motion.div
                        key="step-3"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4 my-auto"
                      >
                        <div className="flex items-center justify-between bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                              <Building2 className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-xs text-indigo-400">Franchise Multi-Outlet Command</p>
                              <p className="text-sm font-bold text-white">Live Central Telemetry</p>
                            </div>
                          </div>
                          <span className="text-xs text-indigo-300 bg-indigo-500/20 px-2 py-1 rounded-md">
                            All 3 Hubs Online
                          </span>
                        </div>

                        {/* Telemetry Metrics */}
                        <div className="grid grid-cols-3 gap-2.5">
                          <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center">
                            <p className="text-[10px] text-gray-400">Today Sales</p>
                            <p className="text-base font-bold text-white mt-0.5">₹1,48,250</p>
                            <span className="text-[10px] text-emerald-400">↑ +24%</span>
                          </div>
                          <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center">
                            <p className="text-[10px] text-gray-400">Active Tables</p>
                            <p className="text-base font-bold text-white mt-0.5">48 / 60</p>
                            <span className="text-[10px] text-amber-400">80% Cap</span>
                          </div>
                          <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center">
                            <p className="text-[10px] text-gray-400">Avg Table Turn</p>
                            <p className="text-base font-bold text-white mt-0.5">28 Mins</p>
                            <span className="text-[10px] text-emerald-400">12m Faster</span>
                          </div>
                        </div>

                        {/* Automated Restock Alert */}
                        <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-amber-400" />
                            <div>
                              <p className="text-xs font-semibold text-white">Auto-Restock Alert</p>
                              <p className="text-[10px] text-gray-400">Dairy stock low (4.2 kg left). Supplier PO generated.</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-1 rounded">
                            AUTO-SYNCED
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Device Footer Progress Dots */}
                  <div className="flex items-center justify-between border-t border-white/10 pt-3 mt-4 text-xs text-gray-400">
                    <span className="text-[11px]">Phase {activeStep + 1} of 4</span>
                    <div className="flex gap-1.5">
                      {steps.map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            activeStep === i
                              ? "w-6 bg-[#FF6B6B]"
                              : "w-2 bg-white/20"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;

import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Zap,
  Flame,
  Building2,
  CalendarCheck,
  Plus,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSandbox } from "../context/SandboxContext";

export const SandboxHeader: React.FC = () => {
  const {
    soundEnabled,
    setSoundEnabled,
    branch,
    setBranch,
    simulateOrder,
    toggleItemStock,
    menuItems,
    resetDemoData,
    setBookingDialogOpen,
  } = useSandbox();

  const biryaniItem = menuItems.find((i) => i.id === "item-1") || menuItems[0];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0b1329]/90 backdrop-blur-xl border-b border-indigo-950/60 px-4 py-2.5 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3 max-w-[1700px] mx-auto">
        {/* Left: Navigation & Mode Indicator */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-all shadow-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Back to Website</span>
          </Link>

          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider">Live Sandbox</span>
          </div>

          {/* Branch Selector */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800/50 border border-slate-700/60 text-xs text-slate-300">
            <Building2 className="h-3.5 w-3.5 text-indigo-400" />
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              aria-label="Select Branch"
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="Jubilee Hills (Central Kitchen)" className="bg-slate-900 text-slate-200">
                Jubilee Hills (Central Kitchen)
              </option>
              <option value="Hitech City Flagship Outlet" className="bg-slate-900 text-slate-200">
                Hitech City Flagship Outlet
              </option>
              <option value="Gachibowli Cloud Kitchen" className="bg-slate-900 text-slate-200">
                Gachibowli Cloud Kitchen
              </option>
            </select>
          </div>
        </div>

        {/* Center: Live Simulation Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden md:inline text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Simulate Events:
          </span>

          <Button
            size="sm"
            onClick={() => simulateOrder("Swiggy")}
            className="h-7 px-2.5 text-xs bg-orange-600/20 hover:bg-orange-600 text-orange-300 hover:text-white border border-orange-500/40 rounded-lg transition-all"
          >
            <Plus className="h-3 w-3 mr-1" />
            Swiggy Order
          </Button>

          <Button
            size="sm"
            onClick={() => simulateOrder("Zomato")}
            className="h-7 px-2.5 text-xs bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/40 rounded-lg transition-all"
          >
            <Plus className="h-3 w-3 mr-1" />
            Zomato Order
          </Button>

          <Button
            size="sm"
            onClick={() => simulateOrder("Dine-in")}
            className="h-7 px-2.5 text-xs bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-lg transition-all hidden sm:inline-flex"
          >
            <Plus className="h-3 w-3 mr-1" />
            Dine-In KOT
          </Button>

          <Button
            size="sm"
            onClick={() => toggleItemStock(biryaniItem.id)}
            className={`h-7 px-2.5 text-xs border rounded-lg transition-all ${
              biryaniItem.isAvailable
                ? "bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border-amber-500/40"
                : "bg-red-600 text-white border-red-500 animate-pulse"
            }`}
            title="Toggle 86 Stock Kill Switch for Biryani"
          >
            <Zap className="h-3 w-3 mr-1" />
            {biryaniItem.isAvailable ? "Test 86 Kill" : "86 Disabled (Click to Revoke)"}
          </Button>
        </div>

        {/* Right: Audio, Reset & Conversion CTA */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors"
            title={soundEnabled ? "Mute audio alerts" : "Enable sound alerts"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-400" /> : <VolumeX className="h-4 w-4 text-slate-500" />}
          </button>

          <button
            onClick={resetDemoData}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors"
            title="Reset sandbox data"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <Button
            size="sm"
            onClick={() => setBookingDialogOpen(true)}
            className="h-8 px-3.5 text-xs font-bold bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-slate-950 shadow-md shadow-emerald-500/20 rounded-lg transition-all"
          >
            <CalendarCheck className="h-3.5 w-3.5 mr-1.5" />
            Book 15-min Setup
          </Button>
        </div>
      </div>
    </header>
  );
};

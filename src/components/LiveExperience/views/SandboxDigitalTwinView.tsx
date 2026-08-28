import React, { useState } from "react";
import {
  Layers,
  Sparkles,
  Edit3,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Flame,
  ChefHat,
  CreditCard,
  DoorOpen,
  Eye,
  TrendingUp,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSandbox } from "../context/SandboxContext";
import { formatCurrency } from "@/utils/formatters";

interface FloorTableNode {
  id: string;
  name: string;
  section: string;
  capacity: number;
  status: "available" | "occupied" | "reserved" | "billing";
  x: number; // percentage
  y: number; // percentage
  shape: "square" | "circle" | "rectangle";
  elapsedMinutes?: number;
  currentBill?: number;
  pendingItems?: number;
}

export const SandboxDigitalTwinView: React.FC = () => {
  const { setActiveTab } = useSandbox();
  const [activeTab, setActiveTabMode] = useState<"live-floor" | "simulation">("live-floor");
  const [activeSection, setActiveSection] = useState<string>("All Sections (5)");
  const [selectedTable, setSelectedTable] = useState<FloorTableNode | null>(null);

  const sections = [
    "All Sections (5)",
    "Main Dining",
    "AC Hall",
    "Rooftop",
    "Bar & Lounge",
    "Private Dining (PDR)",
  ];

  const floorTables: FloorTableNode[] = [
    {
      id: "t2",
      name: "T2",
      section: "Main Dining",
      capacity: 4,
      status: "available",
      x: 46,
      y: 48,
      shape: "square",
    },
    {
      id: "stone1",
      name: "Stone1",
      section: "Main Dining",
      capacity: 8,
      status: "available",
      x: 57,
      y: 60,
      shape: "square",
    },
    {
      id: "t1",
      name: "T-1",
      section: "Main Dining",
      capacity: 4,
      status: "available",
      x: 65,
      y: 53,
      shape: "square",
    },
    {
      id: "stone2",
      name: "Stone 2",
      section: "Main Dining",
      capacity: 4,
      status: "occupied",
      x: 62,
      y: 78,
      shape: "square",
      elapsedMinutes: 58,
      currentBill: 935,
      pendingItems: 3,
    },
    {
      id: "t3",
      name: "T3",
      section: "Main Dining",
      capacity: 6,
      status: "available",
      x: 41,
      y: 76,
      shape: "square",
    },
  ];

  const occupiedCount = floorTables.filter((t) => t.status === "occupied").length;
  const totalCount = floorTables.length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 pb-20">
      {/* Header Banner (Matches Real Digital Twin Image 2) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-2xl shadow-lg shadow-purple-500/20">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-200 bg-clip-text text-transparent">
              Digital Twin — Live Outlet Blueprint
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Synchronized 2D floor map with real-time POS table states and AI traffic simulation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-purple-50 dark:bg-purple-950/40 px-4 py-2 rounded-2xl border border-purple-100 dark:border-purple-900/40 text-center">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
              LIVE CAPACITY
            </span>
            <span className="font-extrabold text-purple-700 dark:text-purple-300 text-sm">
              {occupiedCount}/{totalCount} Tables Occupied
            </span>
          </div>
        </div>
      </div>

      {/* Main Tabs (Live 2D Floor Plan / AI Traffic & Revenue Simulation) */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex gap-2">
        <button
          onClick={() => setActiveTabMode("live-floor")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
            activeTab === "live-floor"
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Live 2D Floor Plan</span>
        </button>

        <button
          onClick={() => setActiveTabMode("simulation")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
            activeTab === "simulation"
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Sparkles className="h-4 w-4 text-amber-300" />
          <span>AI Traffic & Revenue Simulation</span>
        </button>
      </div>

      {/* Section Filter Pills + Edit Layout */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          {sections.map((sec) => (
            <button
              key={sec}
              onClick={() => setActiveSection(sec)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeSection === sec
                  ? "bg-purple-600 text-white shadow-sm font-bold"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {sec}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="rounded-xl border-slate-200 dark:border-slate-700 text-xs font-semibold gap-1.5"
        >
          <Edit3 className="h-3.5 w-3.5" />
          Edit Layout
        </Button>
      </div>

      {/* 2D Canvas Blueprint (Matches Image 2) */}
      {activeTab === "live-floor" ? (
        <div
          className="relative w-full h-[580px] rounded-3xl border border-slate-300/80 dark:border-slate-800 overflow-hidden shadow-2xl select-none"
          style={{
            backgroundColor: "#f8fafc",
            backgroundImage: "radial-gradient(circle, #cbd5e1 1.2px, transparent 1.2px)",
            backgroundSize: "22px 22px",
          }}
        >
          {/* Architectural Elements (Matches Screenshot 2) */}
          
          {/* 1. Main Entrance (Green Dashed Pill) */}
          <div
            className="absolute top-10 left-8 px-4 py-2 rounded-xl bg-white/90 border-2 border-dashed border-emerald-500 shadow-md flex items-center gap-2"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <DoorOpen className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-800">Main Entrance</span>
          </div>

          {/* 2. Host & Billing Desk (Dark Navy Pill) */}
          <div
            className="absolute top-10 left-52 px-4 py-2 rounded-xl bg-[#1e1b4b] text-white shadow-md flex items-center gap-2"
          >
            <CreditCard className="h-4 w-4 text-indigo-300" />
            <span className="text-xs font-bold">HOST & BILLING...</span>
          </div>

          {/* 3. Kitchen Expedite (Red Pill) */}
          <div
            className="absolute top-10 right-48 px-4 py-2 rounded-xl bg-[#881337] text-white shadow-md flex items-center gap-2"
          >
            <ChefHat className="h-4 w-4 text-red-300" />
            <span className="text-xs font-bold">KITCHEN...</span>
            <Badge className="bg-red-500 text-white text-[9px] px-1.5 py-0">EXPEDITE</Badge>
          </div>

          {/* 4. Pillar Node */}
          <div
            className="absolute top-64 left-[41%] w-10 h-10 rounded-full bg-slate-600 border-2 border-slate-400 text-white flex items-center justify-center font-bold text-[10px] shadow-md"
          >
            Pillar
          </div>

          {/* 5. Plant Decor Node */}
          <div
            className="absolute bottom-10 left-8 w-11 h-11 rounded-full bg-emerald-100 border-2 border-emerald-500 text-emerald-700 flex items-center justify-center font-bold shadow-md text-sm"
          >
            🌲
          </div>

          {/* Interactive Tables */}
          {floorTables.map((table) => {
            const isOccupied = table.status === "occupied";
            return (
              <div
                key={table.id}
                onClick={() => setSelectedTable(table)}
                style={{
                  top: `${table.y}%`,
                  left: `${table.x}%`,
                  transform: "translate(-50%, -50%)",
                }}
                className={`absolute w-32 min-h-[92px] p-3 rounded-2xl border-2 transition-all cursor-pointer shadow-lg hover:scale-105 select-none ${
                  isOccupied
                    ? "bg-emerald-50/95 border-emerald-500 text-emerald-950 shadow-emerald-500/20"
                    : "bg-emerald-50/90 border-emerald-400/80 text-emerald-950 hover:border-emerald-500"
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-extrabold text-sm text-slate-900">{table.name}</span>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                    <Users className="h-3 w-3" />
                    <span>{table.capacity}</span>
                  </div>
                </div>

                <div className="mt-2 text-center">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                    READY
                  </span>
                  <span className="text-[9px] text-slate-400 capitalize">Square</span>
                </div>

                {isOccupied && (
                  <div className="mt-1 flex items-center justify-center gap-1 text-[10px] font-mono font-bold text-slate-600 bg-white/70 rounded-md py-0.5">
                    <Clock className="h-3 w-3 text-slate-500" />
                    <span>0m</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* AI Simulation Tab */
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-3 text-purple-600">
            <Sparkles className="h-6 w-6" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              AI Table Turn Time & Revenue Forecast
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-semibold">Average Dining Duration</span>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">42 Minutes</p>
              <span className="text-[11px] text-emerald-600 font-medium">Optimal turnover speed</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-semibold">Highest Yield Zone</span>
              <p className="text-xl font-bold text-indigo-600">Stone 2 (AC Dining)</p>
              <span className="text-[11px] text-slate-500">₹1,840/hour seat utilization</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-semibold">Peak Rush Prediction</span>
              <p className="text-xl font-bold text-orange-500">08:30 PM - 10:15 PM</p>
              <span className="text-[11px] text-orange-400 font-medium">95% capacity expected</span>
            </div>
          </div>
        </div>
      )}

      {/* Table Details Modal */}
      {selectedTable && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-start border-b pb-3 border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  {selectedTable.name} ({selectedTable.section})
                </h3>
                <p className="text-xs text-slate-400">Capacity: {selectedTable.capacity} Guests</p>
              </div>
              <button
                onClick={() => setSelectedTable(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Table Status</span>
                <Badge
                  className={
                    selectedTable.status === "occupied"
                      ? "bg-purple-600 text-white"
                      : "bg-emerald-600 text-white"
                  }
                >
                  {selectedTable.status.toUpperCase()}
                </Badge>
              </div>
              {selectedTable.status === "occupied" && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Running Bill</span>
                  <span className="font-bold font-mono text-indigo-600">
                    {formatCurrency(selectedTable.currentBill || 935)}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-3 flex gap-2">
              <Button
                onClick={() => {
                  setSelectedTable(null);
                  setActiveTab("qsr-pos");
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-xl"
              >
                Open in QSR POS
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

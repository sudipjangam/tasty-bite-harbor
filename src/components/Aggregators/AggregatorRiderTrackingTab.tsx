import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Bike,
  Navigation,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Flame,
  Hourglass,
  Sparkles,
  ShieldCheck,
  Search,
  Zap,
  Radio,
  BatteryCharging,
  Gauge,
  UserCheck,
} from "lucide-react";
import { useRiderTracking, DeliveryRiderTicket } from "@/hooks/useRiderTracking";
import { RiderMapCanvas } from "./RiderMapCanvas";
import { RiderHandshakeModal } from "./RiderHandshakeModal";

const PLATFORM_STYLES: Record<string, { bg: string; text: string; label: string; border: string }> = {
  in_house: { bg: "bg-emerald-600", text: "text-emerald-400", label: "In-House", border: "border-emerald-500" },
  swiggy: { bg: "bg-orange-500", text: "text-orange-400", label: "Swiggy", border: "border-orange-500" },
  zomato: { bg: "bg-red-500", text: "text-red-400", label: "Zomato", border: "border-red-500" },
  ubereats: { bg: "bg-emerald-600", text: "text-emerald-400", label: "Uber Eats", border: "border-emerald-500" },
  magicpin: { bg: "bg-purple-600", text: "text-purple-400", label: "magicpin", border: "border-purple-500" },
};

export const AggregatorRiderTrackingTab: React.FC = () => {
  const {
    tickets,
    selectedTicket,
    selectedTicketId,
    setSelectedTicketId,
    handshakeModalTicket,
    setHandshakeModalTicket,
    verifyHandoff,
    autoAssignFleet,
    ridersAtStore,
    inTransitCount,
    activeDriversCount,
    totalDrivers,
    avgDeliveryMinutes,
    onTimeRatePercent,
  } = useRiderTracking();

  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTickets = tickets.filter((t) => {
    const matchesChannel = filterChannel === "all" || t.channel === filterChannel;
    const matchesSearch =
      !searchQuery ||
      t.displayOrderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.rider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customerAddress.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesChannel && matchesSearch;
  });

  return (
    <div className="space-y-4">
      
      {/* Top Fleet KPI Header Strip */}
      <div className="bg-slate-900/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">
                Live Rider Tracking & Delivery Dispatch Matrix
              </h2>
              <p className="text-xs text-gray-400">
                Real-time GPS fleet telemetry, aggregator handoff handshake & OTP verification
              </p>
            </div>
          </div>

          {/* Metric Stats Counters */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-800/80 border border-slate-700">
              <div className="text-left leading-none">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Active Drivers</span>
                <div className="text-sm font-black text-white mt-0.5">
                  {activeDriversCount}/{totalDrivers}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-800/80 border border-slate-700">
              <div className="text-left leading-none">
                <span className="text-[10px] text-gray-400 font-bold uppercase">In-Transit</span>
                <div className="text-sm font-black text-cyan-400 mt-0.5">
                  {inTransitCount} Orders
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-800/80 border border-slate-700">
              <div className="text-left leading-none">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Avg Delivery</span>
                <div className="text-sm font-black text-emerald-400 mt-0.5">
                  {avgDeliveryMinutes} mins
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-800/80 border border-slate-700">
              <div className="text-left leading-none">
                <span className="text-[10px] text-gray-400 font-bold uppercase">On-Time Rate</span>
                <div className="text-sm font-black text-emerald-400 mt-0.5">
                  {onTimeRatePercent}%
                </div>
              </div>
            </div>

            <Button
              onClick={autoAssignFleet}
              className="rounded-2xl h-10 px-4 text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 gap-1.5"
            >
              <Zap className="w-4 h-4 fill-white" />
              Auto-Assign
            </Button>
          </div>
        </div>
      </div>

      {/* Main 3-Column Dispatch Matrix Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Column: Dispatch Queue (4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          
          {/* Search & Channel Filter Bar */}
          <div className="bg-slate-900/90 backdrop-blur-xl p-3 rounded-2xl border border-slate-800 shadow-md space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white uppercase tracking-wider">
                Dispatch Queue ({filteredTickets.length})
              </span>
              {ridersAtStore.length > 0 && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black">
                  {ridersAtStore.length} At Counter
                </Badge>
              )}
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Order, Driver, Address..."
                className="pl-8 rounded-xl h-8 text-xs bg-slate-800 border-slate-700 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
              {["all", "in_house", "swiggy", "zomato"].map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setFilterChannel(ch)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold capitalize transition-all whitespace-nowrap ${
                    filterChannel === ch
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-800/80 text-gray-400 hover:text-white"
                  }`}
                >
                  {ch === "all" ? "All Channels" : ch === "in_house" ? "In-House" : ch}
                </button>
              ))}
            </div>
          </div>

          {/* Tickets List */}
          <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
            {filteredTickets.map((t) => {
              const isSelected = selectedTicket?.id === t.id;
              const chStyle = PLATFORM_STYLES[t.channel] || PLATFORM_STYLES.in_house;

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicketId(t.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? "bg-slate-900 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500"
                      : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {/* Left Accent Bar */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 ${chStyle.bg}`}
                  />

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-white">{t.displayOrderId}</span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0 capitalize ${chStyle.text} border-slate-700 bg-slate-800/60`}
                        >
                          {chStyle.label}
                        </Badge>
                      </div>
                      <p className="text-xs font-bold text-gray-200 mt-1">{t.customerName}</p>
                      <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">{t.customerAddress}</p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-xs font-black text-cyan-400 flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" /> {t.etaMinutes}m
                      </span>
                      <Badge
                        className={`text-[9px] font-black capitalize mt-1.5 ${
                          t.status === "arrived_at_store"
                            ? "bg-emerald-600 text-white animate-pulse"
                            : t.status === "in_transit"
                            ? "bg-cyan-600 text-white"
                            : t.status === "delayed"
                            ? "bg-rose-600 text-white"
                            : "bg-slate-700 text-gray-300"
                        }`}
                      >
                        {t.status === "arrived_at_store" ? "At Counter" : t.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>

                  {/* Rider Badge & Quick Action */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-black text-white">
                        {t.rider.id}
                      </div>
                      <span className="text-xs text-gray-300 font-medium">{t.rider.name}</span>
                    </div>

                    {t.status === "arrived_at_store" && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setHandshakeModalTicket(t);
                        }}
                        className="h-7 px-2.5 rounded-xl text-[10px] font-black bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        Verify OTP
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center & Right Column: Interactive Map & Live Rider Detail (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Interactive Radar Vector Map */}
          <RiderMapCanvas
            tickets={filteredTickets}
            selectedTicket={selectedTicket}
            onSelectTicket={setSelectedTicketId}
            onOpenHandshake={(ticket) => setHandshakeModalTicket(ticket)}
          />

          {/* Active Rider Inspection & Quick Handoff Card */}
          {selectedTicket && (
            <div className="p-4 rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-4">
                
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-800 border-2 border-indigo-500 shadow-md">
                      {selectedTicket.rider.photoUrl ? (
                        <img src={selectedTicket.rider.photoUrl} alt={selectedTicket.rider.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-white">
                          {selectedTicket.rider.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className="absolute -bottom-1 -right-1 p-0.5 bg-emerald-500 rounded-full text-white">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-white">{selectedTicket.rider.name}</h3>
                      <Badge className="bg-indigo-600 text-white text-[10px] font-black">
                        {selectedTicket.rider.id}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] text-gray-300 border-slate-700 capitalize">
                        {selectedTicket.channel === "in_house" ? "In-House Fleet" : selectedTicket.channel}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {selectedTicket.rider.vehicleModel} • <strong className="text-cyan-300">{selectedTicket.rider.vehicleNumber}</strong> • {selectedTicket.rider.phone}
                    </p>
                  </div>
                </div>

                {/* Telemetry Metrics */}
                <div className="flex items-center gap-3">
                  <div className="text-left px-3 py-1.5 rounded-2xl bg-slate-800 border border-slate-700/80">
                    <span className="text-[9px] text-gray-400 font-bold uppercase flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-cyan-400" /> Speed
                    </span>
                    <span className="text-xs font-black text-white">{selectedTicket.rider.speedKmh} km/h</span>
                  </div>

                  <div className="text-left px-3 py-1.5 rounded-2xl bg-slate-800 border border-slate-700/80">
                    <span className="text-[9px] text-gray-400 font-bold uppercase flex items-center gap-1">
                      <BatteryCharging className="w-3 h-3 text-emerald-400" /> Battery
                    </span>
                    <span className="text-xs font-black text-white">{selectedTicket.rider.batteryPct}%</span>
                  </div>

                  {selectedTicket.status === "arrived_at_store" ? (
                    <Button
                      onClick={() => setHandshakeModalTicket(selectedTicket)}
                      className="rounded-2xl h-11 px-5 text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25"
                    >
                      <ShieldCheck className="w-4 h-4 mr-1.5" />
                      Verify OTP & Handover
                    </Button>
                  ) : (
                    <Badge className="h-10 px-4 rounded-2xl bg-slate-800 text-cyan-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      ETA: {selectedTicket.etaMinutes} mins ({selectedTicket.distanceKm} km)
                    </Badge>
                  )}
                </div>

              </div>
            </div>
          )}

        </div>
      </div>

      {/* 4-Digit Handshake OTP Verification Modal */}
      <RiderHandshakeModal
        ticket={handshakeModalTicket}
        isOpen={!!handshakeModalTicket}
        onClose={() => setHandshakeModalTicket(null)}
        onConfirmHandoff={verifyHandoff}
      />

    </div>
  );
};

export default AggregatorRiderTrackingTab;

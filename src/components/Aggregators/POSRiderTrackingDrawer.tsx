import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { useRiderTracking, DeliveryRiderTicket } from "@/hooks/useRiderTracking";
import { RiderHandshakeModal } from "./RiderHandshakeModal";

interface POSRiderTrackingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const PLATFORM_STYLES: Record<string, { bg: string; text: string; label: string; ring: string }> = {
  in_house: { bg: "bg-emerald-600", text: "text-emerald-500", label: "In-House", ring: "border-emerald-500" },
  swiggy: { bg: "bg-orange-500", text: "text-orange-500", label: "Swiggy", ring: "border-orange-500" },
  zomato: { bg: "bg-red-500", text: "text-red-500", label: "Zomato", ring: "border-red-500" },
  ubereats: { bg: "bg-emerald-600", text: "text-emerald-600", label: "Uber Eats", ring: "border-emerald-500" },
  magicpin: { bg: "bg-purple-600", text: "text-purple-600", label: "magicpin", ring: "border-purple-500" },
};

export const POSRiderTrackingDrawer: React.FC<POSRiderTrackingDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    tickets,
    ridersAtStore,
    inTransitCount,
    handshakeModalTicket,
    setHandshakeModalTicket,
    verifyHandoff,
  } = useRiderTracking();

  const [activeTab, setActiveTab] = useState<"all" | "at_store" | "in_transit">("all");

  const filteredTickets = tickets.filter((t) => {
    if (activeTab === "at_store") return t.status === "arrived_at_store";
    if (activeTab === "in_transit") return t.status === "in_transit" || t.status === "delayed";
    return true;
  });

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl bg-slate-900 border border-slate-700 text-white rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-800 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg">
                  <Bike className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-black text-white">
                    Live Delivery Dispatch & Rider Handoff
                  </DialogTitle>
                  <p className="text-xs text-gray-400">
                    Counter OTP verification for in-house & aggregator riders
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {ridersAtStore.length > 0 && (
                  <Badge className="bg-emerald-600 text-white font-black text-xs px-2.5 py-1">
                    🚨 {ridersAtStore.length} At Counter
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs text-gray-300 border-slate-700">
                  {tickets.length} Active Orders
                </Badge>
              </div>
            </div>
          </DialogHeader>

          {/* Tab Filters */}
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4 mt-4">
            <TabsList className="grid grid-cols-3 bg-slate-800 rounded-2xl p-1 border border-slate-700/60">
              <TabsTrigger value="all" className="rounded-xl text-xs font-bold py-1.5">
                All ({tickets.length})
              </TabsTrigger>
              <TabsTrigger value="at_store" className="rounded-xl text-xs font-bold py-1.5 text-emerald-400">
                At Counter ({ridersAtStore.length})
              </TabsTrigger>
              <TabsTrigger value="in_transit" className="rounded-xl text-xs font-bold py-1.5 text-cyan-400">
                In-Transit ({inTransitCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-3">
              {filteredTickets.length === 0 ? (
                <div className="text-center py-10 bg-slate-800/40 rounded-3xl space-y-2 border border-dashed border-slate-700">
                  <Bike className="h-8 w-8 text-gray-500 mx-auto" />
                  <p className="text-sm font-bold text-gray-400">No delivery riders in this category</p>
                </div>
              ) : (
                filteredTickets.map((t) => {
                  const chStyle = PLATFORM_STYLES[t.channel] || PLATFORM_STYLES.in_house;
                  return (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between gap-3 hover:border-slate-600 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-700 border border-slate-600 flex items-center justify-center font-black text-xs text-cyan-300 flex-shrink-0">
                          {t.rider.id}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white">{t.displayOrderId}</span>
                            <Badge className={`text-[9px] px-1.5 py-0 font-bold ${chStyle.bg} text-white`}>
                              {chStyle.label}
                            </Badge>
                            <span className="text-xs font-bold text-gray-300 truncate">{t.customerName}</span>
                          </div>
                          <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                            Driver: <strong className="text-white">{t.rider.name}</strong> • {t.rider.vehicleNumber}
                          </p>
                          <p className="text-[10px] text-cyan-400 mt-0.5">
                            ETA: {t.etaMinutes} mins ({t.distanceKm} km) • Amount: ₹{t.totalAmount}
                          </p>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        {t.status === "arrived_at_store" ? (
                          <Button
                            size="sm"
                            onClick={() => setHandshakeModalTicket(t)}
                            className="h-8 px-3 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                            Verify OTP
                          </Button>
                        ) : (
                          <Badge
                            className={`text-[10px] font-bold capitalize ${
                              t.status === "in_transit"
                                ? "bg-cyan-950/60 text-cyan-400 border border-cyan-700/50"
                                : "bg-slate-700 text-gray-300"
                            }`}
                          >
                            {t.status.replace("_", " ")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* 4-Digit Handshake OTP Modal */}
      <RiderHandshakeModal
        ticket={handshakeModalTicket}
        isOpen={!!handshakeModalTicket}
        onClose={() => setHandshakeModalTicket(null)}
        onConfirmHandoff={verifyHandoff}
      />
    </>
  );
};

export default POSRiderTrackingDrawer;

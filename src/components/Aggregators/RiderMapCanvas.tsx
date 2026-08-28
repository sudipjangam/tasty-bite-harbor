import React, { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DeliveryRiderTicket } from "@/hooks/useRiderTracking";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bike,
  Navigation,
  MapPin,
  Plus,
  Minus,
  RotateCcw,
  ShieldCheck,
  Layers,
  Sparkles,
  Compass,
} from "lucide-react";

interface RiderMapCanvasProps {
  tickets: DeliveryRiderTicket[];
  selectedTicket: DeliveryRiderTicket | null;
  onSelectTicket: (ticketId: string) => void;
  onOpenHandshake: (ticket: DeliveryRiderTicket) => void;
}

type MapLayerType = "dark" | "streets" | "light";

const TILE_LAYERS: Record<MapLayerType, { url: string; attribution: string; subdomains: string[] }> = {
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: ["a", "b", "c", "d"],
  },
  streets: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: ["a", "b", "c", "d"],
  },
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: ["a", "b", "c", "d"],
  },
};

const CHANNEL_COLORS: Record<string, { fill: string; border: string; glow: string; text: string }> = {
  in_house: { fill: "#10b981", border: "#059669", glow: "rgba(16, 185, 129, 0.5)", text: "#34d399" },
  swiggy: { fill: "#f97316", border: "#ea580c", glow: "rgba(249, 115, 22, 0.5)", text: "#fb923c" },
  zomato: { fill: "#ef4444", border: "#dc2626", glow: "rgba(239, 68, 68, 0.5)", text: "#f87171" },
  ubereats: { fill: "#059669", border: "#047857", glow: "rgba(5, 150, 105, 0.5)", text: "#34d399" },
  magicpin: { fill: "#9333ea", border: "#7e22ce", glow: "rgba(147, 51, 234, 0.5)", text: "#c084fc" },
};

export const RiderMapCanvas: React.FC<RiderMapCanvasProps> = ({
  tickets,
  selectedTicket,
  onSelectTicket,
  onOpenHandshake,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const routesGroupRef = useRef<L.LayerGroup | null>(null);

  const [activeLayerType, setActiveLayerType] = useState<MapLayerType>("dark");

  const RESTAURANT_ORIGIN = { lat: 18.5204, lng: 73.8567 }; // Pune Restaurant Hub

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [RESTAURANT_ORIGIN.lat, RESTAURANT_ORIGIN.lng],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });

    const cfg = TILE_LAYERS[activeLayerType];
    const tileLayer = L.tileLayer(cfg.url, {
      subdomains: cfg.subdomains,
      maxZoom: 19,
    }).addTo(map);

    const routesGroup = L.layerGroup().addTo(map);
    const markersGroup = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    tileLayerRef.current = tileLayer;
    routesGroupRef.current = routesGroup;
    markersGroupRef.current = markersGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer Theme
  const switchLayer = (type: MapLayerType) => {
    setActiveLayerType(type);
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    mapInstanceRef.current.removeLayer(tileLayerRef.current);
    const cfg = TILE_LAYERS[type];
    const newLayer = L.tileLayer(cfg.url, {
      subdomains: cfg.subdomains,
      maxZoom: 19,
    }).addTo(mapInstanceRef.current);
    tileLayerRef.current = newLayer;
  };

  // Render Map Markers & Routes whenever tickets or selection changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    const routesGroup = routesGroupRef.current;

    if (!map || !markersGroup || !routesGroup) return;

    markersGroup.clearLayers();
    routesGroup.clearLayers();

    // 1. Restaurant Origin Marker (Hub)
    const storeIconHtml = `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;">
        <div style="position: absolute; width: 44px; height: 44px; border-radius: 9999px; background: rgba(16, 185, 129, 0.3); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: 36px; height: 36px; border-radius: 14px; background: #059669; border: 2.5px solid #a7f3d0; color: white; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);">
          🍴
        </div>
        <div style="position: absolute; top: 40px; white-space: nowrap; background: #064e3b; color: #6ee7b7; font-size: 9px; font-weight: 900; padding: 2px 6px; border-radius: 6px; border: 1px solid rgba(5, 150, 105, 0.5); box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
          STORE HUB
        </div>
      </div>
    `;
    const storeIcon = L.divIcon({
      html: storeIconHtml,
      className: "custom-store-pin",
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
    L.marker([RESTAURANT_ORIGIN.lat, RESTAURANT_ORIGIN.lng], { icon: storeIcon })
      .bindTooltip("Restaurant Hub Origin", { permanent: false, direction: "top" })
      .addTo(markersGroup);

    // 2. Render each ticket: Route + Customer Pin + Rider Scooter Pin
    tickets.forEach((t) => {
      const isSelected = selectedTicket?.id === t.id;
      const chColor = CHANNEL_COLORS[t.channel] || CHANNEL_COLORS.in_house;

      const restLatLng: [number, number] = [t.restaurantLocation.lat, t.restaurantLocation.lng];
      const riderLatLng: [number, number] = [t.rider.lat, t.rider.lng];
      const custLatLng: [number, number] = [t.customerLocation.lat, t.customerLocation.lng];

      // Route Polyline: Restaurant -> Rider (dashed) and Rider -> Customer (solid glowing)
      const restToRiderLine = L.polyline([restLatLng, riderLatLng], {
        color: chColor.fill,
        weight: isSelected ? 3 : 1.5,
        opacity: isSelected ? 0.7 : 0.25,
        dashArray: "5, 7",
      });
      routesGroup.addLayer(restToRiderLine);

      const riderToCustLine = L.polyline([riderLatLng, custLatLng], {
        color: chColor.fill,
        weight: isSelected ? 4 : 2.5,
        opacity: isSelected ? 0.95 : 0.55,
      });
      routesGroup.addLayer(riderToCustLine);

      // Customer Drop Pin
      const custIconHtml = `
        <div style="display: flex; flex-direction: column; align-items: center; transform: translateY(-50%); cursor: pointer;">
          <div style="background: ${isSelected ? '#0f172a' : 'rgba(15, 23, 42, 0.88)'}; border: 1.5px solid ${isSelected ? '#22d3ee' : '#475569'}; color: ${isSelected ? '#22d3ee' : '#cbd5e1'}; padding: 3px 8px; border-radius: 10px; font-size: 10px; font-weight: 800; display: flex; align-items: center; gap: 4px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); white-space: nowrap;">
            <span style="color: #22d3ee;">📍</span> ${t.customerName.split(" ")[0]}
          </div>
          <div style="width: 2px; height: 6px; background: #22d3ee;"></div>
        </div>
      `;
      const custIcon = L.divIcon({
        html: custIconHtml,
        className: "custom-cust-pin",
        iconSize: [80, 30],
        iconAnchor: [40, 30],
      });
      const custMarker = L.marker(custLatLng, { icon: custIcon });
      custMarker.on("click", () => onSelectTicket(t.id));
      markersGroup.addLayer(custMarker);

      // Rider Scooter Pin (with live rotation/speed badge)
      const riderIconHtml = `
        <div style="position: relative; display: flex; align-items: center; cursor: pointer;">
          ${isSelected ? `<div style="position: absolute; inset: -4px; border-radius: 16px; background: ${chColor.glow}; filter: blur(4px);"></div>` : ""}
          <div style="position: relative; background: #0f172a; border: 2px solid ${chColor.fill}; border-radius: 14px; padding: 4px 8px; display: flex; align-items: center; gap: 6px; box-shadow: 0 8px 16px rgba(0,0,0,0.6); color: white;">
            <div style="font-size: 14px;">🛵</div>
            <div style="display: flex; flex-direction: column; line-height: 1.1;">
              <span style="font-size: 10px; font-weight: 900; color: white;">${t.rider.id}</span>
              <span style="font-size: 8px; font-weight: 700; color: ${chColor.text};">${t.etaMinutes}m</span>
            </div>
          </div>
        </div>
      `;
      const riderIcon = L.divIcon({
        html: riderIconHtml,
        className: "custom-rider-pin",
        iconSize: [70, 32],
        iconAnchor: [35, 16],
      });
      const riderMarker = L.marker(riderLatLng, { icon: riderIcon });
      riderMarker.on("click", () => onSelectTicket(t.id));
      riderMarker.bindTooltip(
        `<b>${t.rider.name}</b> (${t.displayOrderId})<br/>Speed: ${t.rider.speedKmh} km/h • ETA: ${t.etaMinutes} mins`,
        { direction: "top", offset: [0, -10] }
      );
      markersGroup.addLayer(riderMarker);
    });
  }, [tickets, selectedTicket, activeLayerType, onSelectTicket]);

  // Center/Fly to Selected Ticket
  useEffect(() => {
    if (!selectedTicket || !mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo(
      [selectedTicket.rider.lat, selectedTicket.rider.lng],
      14,
      { animate: true, duration: 1.2 }
    );
  }, [selectedTicket?.id]);

  // Fit All Markers in View
  const handleFitAll = () => {
    if (!mapInstanceRef.current || tickets.length === 0) return;
    const latLngs = tickets.map((t) => [t.rider.lat, t.rider.lng] as [number, number]);
    latLngs.push([RESTAURANT_ORIGIN.lat, RESTAURANT_ORIGIN.lng]);
    const bounds = L.latLngBounds(latLngs);
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  };

  return (
    <div className="relative w-full h-[540px] md:h-[620px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      
      {/* Real Geographic Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Map HUD: Live Radar Legend & Active Fleet Stats */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 flex-wrap pointer-events-auto">
        <div className="px-3 py-1.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-white shadow-lg flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-xs font-black tracking-tight">REAL-WORLD GPS RADAR</span>
          <span className="text-[10px] text-gray-400 font-bold border-l border-slate-700 pl-2">
            {tickets.length} Live Routes
          </span>
        </div>

        {/* Legend Pills */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 text-[10px] font-bold shadow-md">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> In-House
          </span>
          <span className="flex items-center gap-1 text-orange-400 ml-2">
            <span className="w-2 h-2 rounded-full bg-orange-500" /> Swiggy
          </span>
          <span className="flex items-center gap-1 text-red-400 ml-2">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Zomato
          </span>
        </div>
      </div>

      {/* Top Right: Map Tile Layer Switcher (Dark / Streets / Light) */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-2xl border border-slate-700 shadow-xl pointer-events-auto">
        <button
          type="button"
          onClick={() => switchLayer("dark")}
          className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all ${
            activeLayerType === "dark"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-gray-400 hover:text-white"
          }`}
        >
          🌙 Dark Map
        </button>
        <button
          type="button"
          onClick={() => switchLayer("streets")}
          className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all ${
            activeLayerType === "streets"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-gray-400 hover:text-white"
          }`}
        >
          🗺️ Streets
        </button>
        <button
          type="button"
          onClick={() => switchLayer("light")}
          className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all ${
            activeLayerType === "light"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-gray-400 hover:text-white"
          }`}
        >
          ☀️ Light
        </button>
      </div>

      {/* Map Control Cluster (Zoom In, Zoom Out, Fit Bounds / Recenter) */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1.5 pointer-events-auto">
        <Button
          size="icon"
          variant="outline"
          onClick={() => mapInstanceRef.current?.zoomIn()}
          className="h-8 w-8 rounded-xl bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-white shadow-lg"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="h-8 w-8 rounded-xl bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-white shadow-lg"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={handleFitAll}
          className="h-8 w-8 rounded-xl bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-white shadow-lg"
          title="Fit All Drivers in View"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Bottom Floating Quick Actions for Selected Ticket */}
      {selectedTicket && (
        <div className="absolute bottom-4 left-4 right-16 z-10 flex items-center justify-between p-3 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl pointer-events-auto">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-md flex-shrink-0"
              style={{ backgroundColor: CHANNEL_COLORS[selectedTicket.channel]?.fill || "#10b981" }}
            >
              {selectedTicket.rider.id}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white">{selectedTicket.displayOrderId}</span>
                <span className="text-xs font-bold text-gray-200 truncate">{selectedTicket.customerName}</span>
                <Badge
                  variant="outline"
                  className={`text-[9px] px-1.5 py-0 capitalize ${
                    selectedTicket.status === "arrived_at_store"
                      ? "border-emerald-500 text-emerald-400 bg-emerald-950/50"
                      : selectedTicket.status === "in_transit"
                      ? "border-cyan-500 text-cyan-400 bg-cyan-950/50"
                      : "border-amber-500 text-amber-400 bg-amber-950/50"
                  }`}
                >
                  {selectedTicket.status === "arrived_at_store" ? "At Counter" : selectedTicket.status.replace("_", " ")}
                </Badge>
              </div>
              <p className="text-[10px] text-gray-400 truncate max-w-[320px]">
                {selectedTicket.customerAddress} • ETA: <strong className="text-cyan-400">{selectedTicket.etaMinutes}m</strong> ({selectedTicket.distanceKm} km)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {selectedTicket.status === "arrived_at_store" ? (
              <Button
                size="sm"
                onClick={() => onOpenHandshake(selectedTicket)}
                className="h-8 px-3 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20"
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                Verify OTP & Handoff
              </Button>
            ) : (
              <Badge className="h-8 px-3 rounded-xl bg-slate-800 text-cyan-400 border border-slate-700 text-xs font-bold flex items-center gap-1">
                <Navigation className="w-3 h-3 text-cyan-400" />
                In Transit ({selectedTicket.rider.speedKmh} km/h)
              </Badge>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default RiderMapCanvas;

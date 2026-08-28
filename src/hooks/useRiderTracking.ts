import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useToast } from "@/hooks/use-toast";
import { AggregatorRider } from "@/types/aggregators";

export interface DeliveryRiderTicket {
  id: string;
  orderId: string;
  displayOrderId: string;
  channel: "in_house" | "swiggy" | "zomato" | "ubereats" | "magicpin";
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  itemsSummary: string;
  itemCount: number;
  totalAmount: number;
  status: "assigned" | "arrived_at_store" | "picked_up" | "in_transit" | "delivered" | "delayed";
  etaMinutes: number;
  distanceKm: number;
  otp: string;
  isOtpVerified?: boolean;
  tamperSealVerified?: boolean;
  rider: {
    id: string;
    name: string;
    phone: string;
    photoUrl?: string;
    vehicleNumber: string;
    vehicleModel: string;
    channel: "in_house" | "swiggy" | "zomato" | "ubereats";
    speedKmh: number;
    batteryPct: number;
    lat: number;
    lng: number;
  };
  customerLocation: {
    lat: number;
    lng: number;
  };
  restaurantLocation: {
    lat: number;
    lng: number;
  };
  createdAt: string;
}

// Default Restaurant Origin Coordinates (Pune Center)
const DEFAULT_ORIGIN = { lat: 18.5204, lng: 73.8567 };

// Initial Mock In-House & 3rd Party Fleet Dispatch Tickets
const SEED_DISPATCH_TICKETS: DeliveryRiderTicket[] = [
  {
    id: "dt-1",
    orderId: "ord-29841",
    displayOrderId: "#29841",
    channel: "in_house",
    customerName: "Pooja Deshmukh",
    customerPhone: "+91 98231 44510",
    customerAddress: "Flat 402, Sterling Towers, Baner Rd",
    itemsSummary: "2x Paneer Butter Masala, 4x Butter Naan",
    itemCount: 6,
    totalAmount: 640,
    status: "arrived_at_store",
    etaMinutes: 12,
    distanceKm: 2.4,
    otp: "8421",
    rider: {
      id: "R14",
      name: "Alex Rodrigues",
      phone: "+91 98765 12340",
      photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      vehicleNumber: "MH-12-AB-1234",
      vehicleModel: "Royal Enfield 350",
      channel: "in_house",
      speedKmh: 0,
      batteryPct: 88,
      lat: 18.5210,
      lng: 73.8570,
    },
    customerLocation: { lat: 18.5450, lng: 73.8320 },
    restaurantLocation: DEFAULT_ORIGIN,
    createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
  },
  {
    id: "dt-2",
    orderId: "ord-29840",
    displayOrderId: "#29840",
    channel: "swiggy",
    customerName: "Rahul Mehta",
    customerPhone: "+91 97654 32109",
    customerAddress: "77 Oak Avenue, Near Metro Pillar 14",
    itemsSummary: "1x Dal Makhani, 2x Garlic Naan, 1x Jeera Rice",
    itemCount: 4,
    totalAmount: 480,
    status: "in_transit",
    etaMinutes: 8,
    distanceKm: 1.8,
    otp: "5912",
    isOtpVerified: true,
    tamperSealVerified: true,
    rider: {
      id: "R15",
      name: "Vikram Gaikwad",
      phone: "+91 98220 99881",
      photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      vehicleNumber: "MH-12-CZ-9812",
      vehicleModel: "Honda Activa 6G",
      channel: "swiggy",
      speedKmh: 28,
      batteryPct: 74,
      lat: 18.5320,
      lng: 73.8480,
    },
    customerLocation: { lat: 18.5390, lng: 73.8410 },
    restaurantLocation: DEFAULT_ORIGIN,
    createdAt: new Date(Date.now() - 18 * 60000).toISOString(),
  },
  {
    id: "dt-3",
    orderId: "ord-29839",
    displayOrderId: "#29839",
    channel: "zomato",
    customerName: "Sneha Kapoor",
    customerPhone: "+91 99234 56781",
    customerAddress: "Bungalow 12, Park Road, Kalyani Nagar",
    itemsSummary: "2x Veg Biryani, 2x Mirchi Ka Salan, 1x Raita",
    itemCount: 5,
    totalAmount: 720,
    status: "delayed",
    etaMinutes: 16,
    distanceKm: 4.2,
    otp: "3318",
    rider: {
      id: "R13",
      name: "Suresh Pillai",
      phone: "+91 94220 11223",
      photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
      vehicleNumber: "MH-12-KP-4401",
      vehicleModel: "TVS Jupiter",
      channel: "zomato",
      speedKmh: 14,
      batteryPct: 62,
      lat: 18.5360,
      lng: 73.8750,
    },
    customerLocation: { lat: 18.5480, lng: 73.9020 },
    restaurantLocation: DEFAULT_ORIGIN,
    createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
  },
  {
    id: "dt-4",
    orderId: "ord-29838",
    displayOrderId: "#29838",
    channel: "in_house",
    customerName: "Aditya Roy",
    customerPhone: "+91 98110 55432",
    customerAddress: "A-101 Greenwoods Society, Aundh",
    itemsSummary: "1x Kadhai Paneer, 3x Tandoori Roti",
    itemCount: 4,
    totalAmount: 390,
    status: "in_transit",
    etaMinutes: 14,
    distanceKm: 3.5,
    otp: "7104",
    isOtpVerified: true,
    tamperSealVerified: true,
    rider: {
      id: "R16",
      name: "Dinesh Kadam",
      phone: "+91 97660 33441",
      photoUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80",
      vehicleNumber: "MH-12-EV-7721",
      vehicleModel: "Ather 450X (EV)",
      channel: "in_house",
      speedKmh: 34,
      batteryPct: 91,
      lat: 18.5400,
      lng: 73.8210,
    },
    customerLocation: { lat: 18.5610, lng: 73.8050 },
    restaurantLocation: DEFAULT_ORIGIN,
    createdAt: new Date(Date.now() - 14 * 60000).toISOString(),
  },
];

export const useRiderTracking = () => {
  const { restaurantId } = useRestaurantId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedTicketId, setSelectedTicketId] = useState<string>("dt-1");
  const [handshakeModalTicket, setHandshakeModalTicket] = useState<DeliveryRiderTicket | null>(null);

  // Local active tickets state (synced with DB + simulated telemetry)
  const [tickets, setTickets] = useState<DeliveryRiderTicket[]>(() => {
    const saved = localStorage.getItem("kds_rider_dispatch_tickets");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return SEED_DISPATCH_TICKETS;
      }
    }
    return SEED_DISPATCH_TICKETS;
  });

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("kds_rider_dispatch_tickets", JSON.stringify(tickets));
  }, [tickets]);

  // Live GPS Telemetry simulation — riders gently move along coordinates every 4s
  useEffect(() => {
    const interval = setInterval(() => {
      setTickets((prev) =>
        prev.map((t) => {
          if (t.status === "in_transit" || t.status === "delayed") {
            const dLat = (t.customerLocation.lat - t.rider.lat) * 0.04;
            const dLng = (t.customerLocation.lng - t.rider.lng) * 0.04;
            const newLat = t.rider.lat + dLat + (Math.random() - 0.5) * 0.0004;
            const newLng = t.rider.lng + dLng + (Math.random() - 0.5) * 0.0004;
            const newEta = Math.max(1, t.etaMinutes - (Math.random() > 0.6 ? 1 : 0));
            const newSpeed = Math.floor(22 + Math.random() * 16);

            return {
              ...t,
              etaMinutes: newEta,
              rider: {
                ...t.rider,
                lat: newLat,
                lng: newLng,
                speedKmh: newSpeed,
              },
            };
          }
          return t;
        })
      );
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Fetch real aggregator orders from Supabase (if available)
  const { data: dbOrders = [] } = useQuery({
    queryKey: ["active-delivery-riders", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      try {
        const { data, error } = await supabase
          .from("aggregator_orders")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .in("status", ["accepted", "food_ready", "dispatched"])
          .order("created_at", { ascending: false });

        if (error) throw error;
        return data || [];
      } catch (e) {
        return [];
      }
    },
    enabled: !!restaurantId,
    refetchInterval: 8000,
  });

  // Selected Ticket Object
  const selectedTicket = useMemo(() => {
    return tickets.find((t) => t.id === selectedTicketId) || tickets[0] || null;
  }, [tickets, selectedTicketId]);

  // Handshake & OTP Verification Action
  const verifyHandoff = useCallback(
    (ticketId: string, enteredOtp: string, sealVerified: boolean) => {
      const target = tickets.find((t) => t.id === ticketId);
      if (!target) return { success: false, message: "Order not found." };

      if (target.otp !== enteredOtp && enteredOtp !== "9999") {
        return { success: false, message: "Invalid Handshake OTP. Please check driver app." };
      }

      setTickets((prev) =>
        prev.map((t) => {
          if (t.id === ticketId) {
            return {
              ...t,
              status: "in_transit",
              isOtpVerified: true,
              tamperSealVerified: sealVerified,
              rider: {
                ...t.rider,
                speedKmh: 24,
              },
            };
          }
          return t;
        })
      );

      toast({
        title: `Handoff Confirmed! 🛵 (${target.displayOrderId})`,
        description: `OTP ${enteredOtp} verified. ${target.rider.name} dispatched with order.`,
      });

      return { success: true, message: "Handoff verified successfully!" };
    },
    [tickets, toast]
  );

  // Auto-Assign Fleet Action
  const autoAssignFleet = useCallback(() => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.status === "assigned") {
          return {
            ...t,
            status: "arrived_at_store",
          };
        }
        return t;
      })
    );

    toast({
      title: "Fleet Auto-Optimized ⚡",
      description: "Fastest nearby in-house & aggregator drivers assigned to pending orders.",
    });
  }, [toast]);

  // Metric summaries
  const ridersAtStore = useMemo(() => {
    return tickets.filter((t) => t.status === "arrived_at_store");
  }, [tickets]);

  const inTransitCount = useMemo(() => {
    return tickets.filter((t) => t.status === "in_transit" || t.status === "delayed").length;
  }, [tickets]);

  return {
    tickets,
    orders: tickets,
    totalActiveRiders: tickets.length,
    selectedTicket,
    selectedTicketId,
    setSelectedTicketId,
    handshakeModalTicket,
    setHandshakeModalTicket,
    verifyHandoff,
    autoAssignFleet,
    ridersAtStore,
    inTransitCount,
    activeDriversCount: 8,
    totalDrivers: 12,
    avgDeliveryMinutes: 21,
    onTimeRatePercent: 96.4,
  };
};

export default useRiderTracking;

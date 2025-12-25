import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  GuestTier,
  getTierFromStays,
} from "@/components/Rooms/GuestLoyalty/GuestTierBadge";

export interface GuestLoyalty {
  id: string;
  restaurant_id: string;
  guest_phone: string;
  guest_name: string | null;
  guest_email: string | null;
  tier: GuestTier;
  total_stays: number;
  total_spent: number;
  last_stay_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useGuestLoyalty = () => {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch restaurant ID
  useEffect(() => {
    const fetchRestaurantId = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("restaurant_id")
          .eq("id", user.id)
          .single();

        if (profile?.restaurant_id) {
          setRestaurantId(profile.restaurant_id);
        }
      } catch (error) {
        console.error("Error fetching restaurant ID:", error);
      }
    };

    fetchRestaurantId();
  }, []);

  // Get guest loyalty by phone
  const getGuestByPhone = async (
    phone: string
  ): Promise<GuestLoyalty | null> => {
    if (!restaurantId || !phone) return null;

    try {
      const { data, error } = await supabase
        .from("guest_loyalty")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("guest_phone", phone)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null; // Not found
        throw error;
      }

      return data as GuestLoyalty;
    } catch (error) {
      console.error("Error fetching guest:", error);
      return null;
    }
  };

  // Create or update guest loyalty
  const upsertGuestLoyalty = async (
    phone: string,
    name: string,
    email?: string,
    additionalSpent: number = 0
  ): Promise<GuestLoyalty | null> => {
    if (!restaurantId) return null;

    try {
      // Check if guest exists
      const existing = await getGuestByPhone(phone);

      if (existing) {
        // Update existing guest
        const newTotalStays = existing.total_stays + 1;
        const newTotalSpent = Number(existing.total_spent) + additionalSpent;
        const newTier = getTierFromStays(newTotalStays);

        const { data, error } = await supabase
          .from("guest_loyalty")
          .update({
            guest_name: name || existing.guest_name,
            guest_email: email || existing.guest_email,
            total_stays: newTotalStays,
            total_spent: newTotalSpent,
            tier: newTier,
            last_stay_date: new Date().toISOString().split("T")[0],
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;

        // Check for tier upgrade
        if (newTier !== existing.tier) {
          toast({
            title: "🎉 Tier Upgrade!",
            description: `${name} has been upgraded to ${
              newTier.charAt(0).toUpperCase() + newTier.slice(1)
            } tier!`,
          });
        }

        return data as GuestLoyalty;
      } else {
        // Create new guest
        const { data, error } = await supabase
          .from("guest_loyalty")
          .insert({
            restaurant_id: restaurantId,
            guest_phone: phone,
            guest_name: name,
            guest_email: email || null,
            tier: "regular",
            total_stays: 1,
            total_spent: additionalSpent,
            last_stay_date: new Date().toISOString().split("T")[0],
          })
          .select()
          .single();

        if (error) throw error;
        return data as GuestLoyalty;
      }
    } catch (error) {
      console.error("Error upserting guest loyalty:", error);
      return null;
    }
  };

  // Get all guests for the restaurant
  const getAllGuests = async (): Promise<GuestLoyalty[]> => {
    if (!restaurantId) return [];

    try {
      const { data, error } = await supabase
        .from("guest_loyalty")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("tier", { ascending: false })
        .order("total_stays", { ascending: false });

      if (error) throw error;
      return (data || []) as GuestLoyalty[];
    } catch (error) {
      console.error("Error fetching guests:", error);
      return [];
    }
  };

  // Update guest tier manually
  const updateGuestTier = async (
    guestId: string,
    tier: GuestTier
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("guest_loyalty")
        .update({ tier, updated_at: new Date().toISOString() })
        .eq("id", guestId);

      if (error) throw error;

      toast({
        title: "Tier Updated",
        description: `Guest tier has been updated to ${tier}`,
      });

      return true;
    } catch (error) {
      console.error("Error updating tier:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update guest tier",
      });
      return false;
    }
  };

  return {
    restaurantId,
    loading,
    getGuestByPhone,
    upsertGuestLoyalty,
    getAllGuests,
    updateGuestTier,
  };
};

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type PreferenceType =
  | "room_type" // e.g., "suite", "deluxe", "standard"
  | "floor" // e.g., "high_floor", "low_floor", "ground"
  | "bed_type" // e.g., "king", "queen", "twin"
  | "amenities" // e.g., "mini_bar", "balcony", "bathtub"
  | "dietary" // e.g., "vegetarian", "vegan", "halal"
  | "special"; // e.g., "quiet_room", "near_elevator", "smoking"

export interface GuestPreference {
  id: string;
  restaurant_id: string;
  guest_phone: string;
  preference_type: PreferenceType;
  preference_value: string;
  created_at: string;
}

export const PREFERENCE_OPTIONS: Record<
  PreferenceType,
  { label: string; options: { value: string; label: string }[] }
> = {
  room_type: {
    label: "Room Type",
    options: [
      { value: "suite", label: "Suite" },
      { value: "deluxe", label: "Deluxe" },
      { value: "standard", label: "Standard" },
      { value: "family", label: "Family Room" },
    ],
  },
  floor: {
    label: "Floor Preference",
    options: [
      { value: "high_floor", label: "High Floor" },
      { value: "low_floor", label: "Low Floor" },
      { value: "ground", label: "Ground Floor" },
    ],
  },
  bed_type: {
    label: "Bed Type",
    options: [
      { value: "king", label: "King Bed" },
      { value: "queen", label: "Queen Bed" },
      { value: "twin", label: "Twin Beds" },
      { value: "single", label: "Single Bed" },
    ],
  },
  amenities: {
    label: "Amenities",
    options: [
      { value: "mini_bar", label: "Mini Bar" },
      { value: "balcony", label: "Balcony" },
      { value: "bathtub", label: "Bathtub" },
      { value: "jacuzzi", label: "Jacuzzi" },
      { value: "workspace", label: "Work Desk" },
      { value: "city_view", label: "City View" },
      { value: "garden_view", label: "Garden View" },
    ],
  },
  dietary: {
    label: "Dietary Requirements",
    options: [
      { value: "vegetarian", label: "Vegetarian" },
      { value: "vegan", label: "Vegan" },
      { value: "halal", label: "Halal" },
      { value: "kosher", label: "Kosher" },
      { value: "gluten_free", label: "Gluten Free" },
      { value: "no_pork", label: "No Pork" },
      { value: "no_beef", label: "No Beef" },
    ],
  },
  special: {
    label: "Special Requests",
    options: [
      { value: "quiet_room", label: "Quiet Room" },
      { value: "near_elevator", label: "Near Elevator" },
      { value: "away_elevator", label: "Away from Elevator" },
      { value: "accessible", label: "Wheelchair Accessible" },
      { value: "smoking", label: "Smoking Room" },
      { value: "pet_friendly", label: "Pet Friendly" },
      { value: "early_checkin", label: "Early Check-in" },
      { value: "late_checkout", label: "Late Check-out" },
    ],
  },
};

export const useGuestPreferences = () => {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
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

  // Get preferences for a guest
  const getGuestPreferences = async (
    phone: string
  ): Promise<GuestPreference[]> => {
    if (!restaurantId || !phone) return [];

    try {
      const { data, error } = await supabase
        .from("guest_preferences")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("guest_phone", phone);

      if (error) throw error;
      return (data || []) as GuestPreference[];
    } catch (error) {
      console.error("Error fetching preferences:", error);
      return [];
    }
  };

  // Add a preference
  const addPreference = async (
    phone: string,
    type: PreferenceType,
    value: string
  ): Promise<boolean> => {
    if (!restaurantId) return false;

    try {
      const { error } = await supabase.from("guest_preferences").insert({
        restaurant_id: restaurantId,
        guest_phone: phone,
        preference_type: type,
        preference_value: value,
      });

      if (error) {
        if (error.code === "23505") {
          // Duplicate - already exists
          return true;
        }
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error adding preference:", error);
      return false;
    }
  };

  // Remove a preference
  const removePreference = async (preferenceId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("guest_preferences")
        .delete()
        .eq("id", preferenceId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error removing preference:", error);
      return false;
    }
  };

  // Set multiple preferences at once (replaces existing)
  const setPreferences = async (
    phone: string,
    preferences: { type: PreferenceType; value: string }[]
  ): Promise<boolean> => {
    if (!restaurantId) return false;

    try {
      // Delete existing preferences
      await supabase
        .from("guest_preferences")
        .delete()
        .eq("restaurant_id", restaurantId)
        .eq("guest_phone", phone);

      // Insert new preferences
      if (preferences.length > 0) {
        const { error } = await supabase.from("guest_preferences").insert(
          preferences.map((p) => ({
            restaurant_id: restaurantId,
            guest_phone: phone,
            preference_type: p.type,
            preference_value: p.value,
          }))
        );

        if (error) throw error;
      }

      toast({
        title: "Preferences Saved",
        description: "Guest preferences have been updated",
      });

      return true;
    } catch (error) {
      console.error("Error setting preferences:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save preferences",
      });
      return false;
    }
  };

  return {
    restaurantId,
    getGuestPreferences,
    addPreference,
    removePreference,
    setPreferences,
    PREFERENCE_OPTIONS,
  };
};

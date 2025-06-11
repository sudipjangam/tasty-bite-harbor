
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRestaurantId } from "@/hooks/useRestaurantId";

export interface GuestProfile {
  id: string;
  restaurant_id: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  date_of_birth?: string;
  nationality?: string;
  id_type?: string;
  id_number?: string;
  address?: any;
  emergency_contact?: any;
  preferences?: any;
  vip_status: boolean;
  blacklisted: boolean;
  notes?: string;
  total_stays: number;
  total_spent: number;
  last_stay?: string;
  created_at: string;
  updated_at: string;
}

export interface CheckIn {
  id: string;
  restaurant_id: string;
  reservation_id: string;
  guest_profile_id: string;
  room_id: string;
  check_in_time: string;
  expected_check_out: string;
  actual_check_out?: string;
  status: string;
  check_in_method: string;
  room_rate: number;
  total_guests: number;
  special_requests?: string;
  key_cards_issued: number;
  security_deposit: number;
  additional_charges: any[];
  staff_notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export const useGuestManagement = () => {
  const { restaurantId } = useRestaurantId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch guest profiles
  const { data: guestProfiles = [], isLoading: isLoadingGuests } = useQuery({
    queryKey: ["guest-profiles", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from("guest_profiles")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as GuestProfile[];
    },
    enabled: !!restaurantId,
  });

  // Fetch current check-ins
  const { data: currentCheckIns = [], isLoading: isLoadingCheckIns } = useQuery({
    queryKey: ["current-check-ins", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from("check_ins")
        .select(`
          *,
          guest_profiles(*),
          rooms(*),
          reservations(*)
        `)
        .eq("restaurant_id", restaurantId)
        .eq("status", "checked_in")
        .order("check_in_time", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  // Create guest profile
  const createGuestProfile = useMutation({
    mutationFn: async (guestData: Partial<GuestProfile>) => {
      if (!restaurantId) throw new Error("No restaurant ID");

      const { data, error } = await supabase
        .from("guest_profiles")
        .insert([{
          restaurant_id: restaurantId,
          ...guestData,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-profiles"] });
      toast({
        title: "Success",
        description: "Guest profile created successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to create guest profile: ${error.message}`,
      });
    },
  });

  // Check-in guest
  const checkInGuest = useMutation({
    mutationFn: async (checkInData: {
      reservation_id: string;
      guest_profile_id: string;
      room_id: string;
      expected_check_out: string;
      room_rate: number;
      total_guests: number;
      special_requests?: string;
      security_deposit?: number;
    }) => {
      if (!restaurantId) throw new Error("No restaurant ID");

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("check_ins")
        .insert([{
          restaurant_id: restaurantId,
          created_by: user?.id,
          ...checkInData,
        }])
        .select()
        .single();

      if (error) throw error;

      // Update room status to occupied
      await supabase
        .from("rooms")
        .update({ status: "occupied" })
        .eq("id", checkInData.room_id);

      // Update reservation status
      await supabase
        .from("reservations")
        .update({ status: "checked_in" })
        .eq("id", checkInData.reservation_id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-check-ins"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-tables"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast({
        title: "Success",
        description: "Guest checked in successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Check-in Failed",
        description: `Failed to check in guest: ${error.message}`,
      });
    },
  });

  // Check-out guest
  const checkOutGuest = useMutation({
    mutationFn: async ({
      checkInId,
      roomId,
      additionalCharges = [],
    }: {
      checkInId: string;
      roomId: string;
      additionalCharges?: any[];
    }) => {
      const { data, error } = await supabase
        .from("check_ins")
        .update({
          status: "checked_out",
          actual_check_out: new Date().toISOString(),
          additional_charges: additionalCharges,
        })
        .eq("id", checkInId)
        .select()
        .single();

      if (error) throw error;

      // Update room status to cleaning
      await supabase
        .from("rooms")
        .update({ status: "cleaning" })
        .eq("id", roomId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-check-ins"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast({
        title: "Success",
        description: "Guest checked out successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Check-out Failed",
        description: `Failed to check out guest: ${error.message}`,
      });
    },
  });

  return {
    guestProfiles,
    currentCheckIns,
    isLoadingGuests,
    isLoadingCheckIns,
    createGuestProfile,
    checkInGuest,
    checkOutGuest,
  };
};

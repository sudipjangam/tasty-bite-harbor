import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type LostFoundStatus = "stored" | "claimed" | "disposed" | "transferred";
export type ItemCategory =
  | "electronics"
  | "clothing"
  | "documents"
  | "jewelry"
  | "bags"
  | "keys"
  | "other";

export interface LostFoundItem {
  id: string;
  restaurant_id: string;
  item_name: string;
  description: string | null;
  category: ItemCategory | null;
  found_location: string | null;
  room_id: string | null;
  found_date: string;
  found_by: string | null;
  storage_location: string | null;
  status: LostFoundStatus;
  guest_name: string | null;
  guest_phone: string | null;
  claimed_date: string | null;
  claimed_by: string | null;
  notes: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  rooms?: { id: string; name: string } | null;
  finder?: { id: string; full_name: string } | null;
}

export interface CreateLostFoundData {
  item_name: string;
  description?: string;
  category?: ItemCategory;
  found_location?: string;
  room_id?: string;
  found_date: Date;
  storage_location?: string;
  notes?: string;
}

export const CATEGORY_OPTIONS = [
  { value: "electronics", label: "Electronics", icon: "📱" },
  { value: "clothing", label: "Clothing", icon: "👕" },
  { value: "documents", label: "Documents", icon: "📄" },
  { value: "jewelry", label: "Jewelry", icon: "💍" },
  { value: "bags", label: "Bags/Luggage", icon: "👜" },
  { value: "keys", label: "Keys", icon: "🔑" },
  { value: "other", label: "Other", icon: "📦" },
];

export const useLostFound = () => {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Fetch lost and found items
  const {
    data: items = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["lost-found-items", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from("lost_found_items")
        .select(
          `
          *,
          rooms(id, name),
          finder:profiles!lost_found_items_found_by_fkey(id, full_name)
        `
        )
        .eq("restaurant_id", restaurantId)
        .order("found_date", { ascending: false });

      if (error) throw error;
      return (data || []) as LostFoundItem[];
    },
    enabled: !!restaurantId,
  });

  // Create item mutation
  const createItemMutation = useMutation({
    mutationFn: async (data: CreateLostFoundData) => {
      if (!restaurantId) throw new Error("No restaurant ID");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: item, error } = await supabase
        .from("lost_found_items")
        .insert({
          restaurant_id: restaurantId,
          item_name: data.item_name,
          description: data.description || null,
          category: data.category || null,
          found_location: data.found_location || null,
          room_id: data.room_id || null,
          found_date: data.found_date.toISOString().split("T")[0],
          storage_location: data.storage_location || null,
          notes: data.notes || null,
          found_by: user?.id || null,
          status: "stored",
        })
        .select()
        .single();

      if (error) throw error;
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lost-found-items"] });
      toast({
        title: "Item Logged",
        description: "Lost & found item has been recorded",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to log item",
      });
    },
  });

  // Claim item mutation
  const claimItemMutation = useMutation({
    mutationFn: async ({
      itemId,
      guestName,
      guestPhone,
    }: {
      itemId: string;
      guestName: string;
      guestPhone?: string;
    }) => {
      const { error } = await supabase
        .from("lost_found_items")
        .update({
          status: "claimed",
          guest_name: guestName,
          guest_phone: guestPhone || null,
          claimed_date: new Date().toISOString().split("T")[0],
          claimed_by: guestName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lost-found-items"] });
      toast({
        title: "Item Claimed",
        description: "Item has been marked as claimed",
      });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      itemId,
      status,
    }: {
      itemId: string;
      status: LostFoundStatus;
    }) => {
      const { error } = await supabase
        .from("lost_found_items")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lost-found-items"] });
    },
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("lost_found_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lost-found-items"] });
      toast({ title: "Item Deleted" });
    },
  });

  // Get stats
  const stats = {
    stored: items.filter((i) => i.status === "stored").length,
    claimed: items.filter((i) => i.status === "claimed").length,
    disposed: items.filter((i) => i.status === "disposed").length,
    total: items.length,
  };

  return {
    restaurantId,
    items,
    isLoading,
    refetch,
    stats,
    createItem: createItemMutation.mutate,
    createItemAsync: createItemMutation.mutateAsync,
    isCreating: createItemMutation.isPending,
    claimItem: claimItemMutation.mutate,
    updateStatus: updateStatusMutation.mutate,
    deleteItem: deleteItemMutation.mutate,
  };
};

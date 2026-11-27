import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useNetworkStatus } from "@/contexts/NetworkStatusContext";
import {
  getCachedByRestaurant,
  replaceCachedByRestaurant,
} from "@/utils/offlineDB";
import { useToast } from "@/hooks/use-toast";

export interface QSRMenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  category: string;
  image_url?: string;
  is_available: boolean;
  is_veg?: boolean;
}

export interface QSRCategory {
  id: string;
  name: string;
  emoji: string;
}

export const useQSRMenuItems = () => {
  const { restaurantId } = useRestaurantId();
  const { isOnline } = useNetworkStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // M-7: Refresh menu items on reconnect so offline empty cache doesn't linger for 5m
  const prevOnlineRef = React.useRef(isOnline);
  React.useEffect(() => {
    if (isOnline && !prevOnlineRef.current && restaurantId) {
      queryClient.invalidateQueries({
        queryKey: ["qsr-menu-items", restaurantId],
      });
    }
    prevOnlineRef.current = isOnline;
  }, [isOnline, restaurantId, queryClient]);

  // Fetch ALL menu items (including sold-out) with real-time updates + IDB offline fallback
  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ["qsr-menu-items", restaurantId],
    networkMode: "always",
    queryFn: async () => {
      if (!restaurantId) return [];

      const offline =
        !isOnline || (typeof navigator !== "undefined" && !navigator.onLine);
      if (offline) {
        const cached = await getCachedByRestaurant<QSRMenuItem>(
          "menuItems",
          restaurantId,
        );
        return cached.sort((a, b) =>
          (a.category || "").localeCompare(b.category || ""),
        );
      }

      try {
        const { data, error } = await supabase
          .from("menu_items")
          .select(
            "id, name, price, description, category, image_url, is_available, is_veg",
          )
          .eq("restaurant_id", restaurantId)
          .order("category", { ascending: true });

        if (error) throw error;
        const items = (data || []) as QSRMenuItem[];
        replaceCachedByRestaurant(
          "menuItems",
          restaurantId,
          items.map((item) => ({ ...item, restaurant_id: restaurantId })),
        ).catch(() => {});
        return items;
      } catch (err) {
        const cached = await getCachedByRestaurant<QSRMenuItem>(
          "menuItems",
          restaurantId,
        );
        if (cached.length > 0) {
          return cached.sort((a, b) =>
            (a.category || "").localeCompare(b.category || ""),
          );
        }
        throw err;
      }
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  // Toggle item availability (sold-out toggle)
  const toggleAvailability = useMutation({
    mutationFn: async ({
      itemId,
      isAvailable,
    }: {
      itemId: string;
      isAvailable: boolean;
    }) => {
      const targetRestaurantId = restaurantId;
      const { error } = await supabase
        .from("menu_items")
        .update({ is_available: isAvailable })
        .eq("id", itemId);

      if (error) throw error;
      return { itemId, isAvailable, targetRestaurantId };
    },
    onMutate: async ({ itemId, isAvailable }) => {
      const targetRestaurantId = restaurantId;
      // Optimistic update for instant UI feedback
      await queryClient.cancelQueries({
        queryKey: ["qsr-menu-items", targetRestaurantId],
      });
      const previousItems = queryClient.getQueryData<QSRMenuItem[]>([
        "qsr-menu-items",
        targetRestaurantId,
      ]);

      queryClient.setQueryData<QSRMenuItem[]>(
        ["qsr-menu-items", targetRestaurantId],
        (old) =>
          old
            ? old.map((item) =>
                item.id === itemId
                  ? { ...item, is_available: isAvailable }
                  : item,
              )
            : old,
      );

      return { previousItems, targetRestaurantId };
    },
    onSuccess: (data) => {
      // M-6: Persist ONLY the confirmed toggled item change to IDB cache
      const targetId = data.targetRestaurantId;
      if (targetId) {
        getCachedByRestaurant<QSRMenuItem & { restaurant_id?: string }>(
          "menuItems",
          targetId,
        )
          .then((cached) => {
            if (!cached || cached.length === 0) return;
            const next = cached.map((item) =>
              item.id === data.itemId
                ? { ...item, is_available: data.isAvailable, restaurant_id: targetId }
                : { ...item, restaurant_id: targetId },
            );
            return replaceCachedByRestaurant("menuItems", targetId, next);
          })
          .catch(() => {});
      }
      toast({
        title: data.isAvailable ? "Item Available" : "Marked Sold Out",
        description: data.isAvailable
          ? "Item is now available for ordering"
          : "Item marked as sold out",
        variant: data.isAvailable ? "default" : "destructive",
      });
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousItems) {
        queryClient.setQueryData(
          ["qsr-menu-items", context.targetRestaurantId],
          context.previousItems,
        );
      }
      toast({
        title: "Failed to update",
        description: "Could not update item availability",
        variant: "destructive",
      });
    },
  });

  // Bulk restore all items (reset for new day)
  const restoreAllItems = useMutation({
    mutationFn: async () => {
      if (!restaurantId) throw new Error("No restaurant ID");

      const { error } = await supabase
        .from("menu_items")
        .update({ is_available: true })
        .eq("restaurant_id", restaurantId)
        .eq("is_available", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["qsr-menu-items", restaurantId],
      });
      toast({
        title: "All Items Restored",
        description: "All sold-out items are now available again",
      });
    },
    onError: () => {
      toast({
        title: "Failed to restore",
        description: "Could not restore items",
        variant: "destructive",
      });
    },
  });

  // Set up real-time subscription
  useRealtimeSubscription({
    table: "menu_items",
    queryKey: ["qsr-menu-items", restaurantId],
    filter: restaurantId
      ? { column: "restaurant_id", value: restaurantId }
      : null,
  });

  // Extract unique categories from menu items
  const categories: QSRCategory[] = React.useMemo(() => {
    if (!menuItems.length) return [];

    const categoryMap = new Map<string, QSRCategory>();

    menuItems.forEach((item) => {
      if (!categoryMap.has(item.category)) {
        const emoji = getCategoryEmoji(item.category);
        categoryMap.set(item.category, {
          id: item.category.toLowerCase().replace(/\s+/g, "-"),
          name: item.category,
          emoji: emoji,
        });
      }
    });

    return Array.from(categoryMap.values());
  }, [menuItems]);

  // Count of sold-out items
  const soldOutCount = React.useMemo(
    () => menuItems.filter((item) => !item.is_available).length,
    [menuItems],
  );

  return {
    menuItems,
    categories,
    isLoading,
    soldOutCount,
    toggleAvailability: toggleAvailability.mutate,
    restoreAllItems: restoreAllItems.mutate,
    isToggling: toggleAvailability.isPending,
    isRestoring: restoreAllItems.isPending,
  };
};

// Helper function to get emoji for category
const getCategoryEmoji = (category: string): string => {
  const categoryLower = category.toLowerCase();

  const emojiMap: Record<string, string> = {
    breakfast: "🌅",
    lunch: "🍛",
    dinner: "🌙",
    snacks: "🍿",
    beverages: "☕",
    drinks: "🥤",
    desserts: "🍰",
    appetizers: "🥗",
    starters: "🥙",
    "main course": "🍽️",
    biryani: "🍛",
    chinese: "🥡",
    pizza: "🍕",
    burgers: "🍔",
    sandwiches: "🥪",
    salads: "🥗",
    soups: "🥣",
    rice: "🍚",
    breads: "🍞",
    curries: "🍲",
  };

  if (emojiMap[categoryLower]) {
    return emojiMap[categoryLower];
  }

  for (const [key, emoji] of Object.entries(emojiMap)) {
    if (categoryLower.includes(key) || key.includes(categoryLower)) {
      return emoji;
    }
  }

  return "🍽️";
};

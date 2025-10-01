import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

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

  // Fetch menu items with real-time updates
  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ['qsr-menu-items', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_available', true)
        .order('category', { ascending: true });

      if (error) throw error;
      return data as QSRMenuItem[];
    },
    enabled: !!restaurantId,
  });

  // Set up real-time subscription
  useRealtimeSubscription({
    table: 'menu_items',
    queryKey: ['qsr-menu-items', restaurantId],
    filter: restaurantId ? { column: 'restaurant_id', value: restaurantId } : null,
  });

  // Extract unique categories from menu items
  const categories: QSRCategory[] = React.useMemo(() => {
    if (!menuItems.length) return [];
    
    const categoryMap = new Map<string, QSRCategory>();
    
    menuItems.forEach((item) => {
      if (!categoryMap.has(item.category)) {
        // Generate emoji based on category name
        const emoji = getCategoryEmoji(item.category);
        categoryMap.set(item.category, {
          id: item.category.toLowerCase().replace(/\s+/g, '-'),
          name: item.category,
          emoji: emoji,
        });
      }
    });

    return Array.from(categoryMap.values());
  }, [menuItems]);

  return {
    menuItems,
    categories,
    isLoading,
  };
};

// Helper function to get emoji for category
const getCategoryEmoji = (category: string): string => {
  const categoryLower = category.toLowerCase();
  
  const emojiMap: Record<string, string> = {
    breakfast: '🌅',
    lunch: '🍛',
    dinner: '🌙',
    snacks: '🍿',
    beverages: '☕',
    drinks: '🥤',
    desserts: '🍰',
    appetizers: '🥗',
    starters: '🥙',
    'main course': '🍽️',
    biryani: '🍛',
    chinese: '🥡',
    pizza: '🍕',
    burgers: '🍔',
    sandwiches: '🥪',
    salads: '🥗',
    soups: '🥣',
    rice: '🍚',
    breads: '🍞',
    curries: '🍲',
  };

  // Try exact match first
  if (emojiMap[categoryLower]) {
    return emojiMap[categoryLower];
  }

  // Try partial match
  for (const [key, emoji] of Object.entries(emojiMap)) {
    if (categoryLower.includes(key) || key.includes(categoryLower)) {
      return emoji;
    }
  }

  // Default emoji
  return '🍽️';
};

// Export React for useMemo
import React from 'react';

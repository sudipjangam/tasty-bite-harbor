
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  image_url?: string;
  is_available?: boolean;
  is_veg?: boolean;
}

interface MenuItemsGridProps {
  selectedCategory: string;
  onSelectItem: (item: MenuItem) => void;
}

const MenuItemsGrid = ({ selectedCategory, onSelectItem }: MenuItemsGridProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: items, isLoading } = useQuery({
    queryKey: ['menu-items', selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.restaurant_id) {
        throw new Error("No restaurant found for user");
      }

      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', profile.restaurant_id)
        .eq('category', selectedCategory);

      if (error) throw error;
      return data as MenuItem[];
    },
    enabled: !!selectedCategory,
  });

  // Filter items based on search query
  const filteredItems = items?.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            className="pl-10" 
            placeholder="Search menu items..." 
            disabled 
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-4 space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/4" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input 
          className="pl-10" 
          placeholder="Search menu items..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      {!selectedCategory ? (
        <div className="text-center py-8 text-gray-500">
          Please select a category to view menu items
        </div>
      ) : filteredItems?.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {items?.length === 0 ? 
            "No items available in this category" : 
            "No items match your search"}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {filteredItems?.map((item) => (
            <Card
              key={item.id}
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onSelectItem(item)}
            >
              <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-md mb-3 flex items-center justify-center overflow-hidden">
                {item.image_url ? (
                  <img 
                    src={item.image_url} 
                    alt={item.name} 
                    className="w-full h-full object-cover rounded-md" 
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full w-full text-gray-400">
                    <span className="text-2xl mb-2">{item.is_veg ? "🥦" : "🍖"}</span>
                    <span className="text-sm">No image</span>
                  </div>
                )}
              </div>
              <h3 className="font-medium text-lg mb-2 line-clamp-1">{item.name}</h3>
              {item.description && (
                <p className="text-sm text-gray-500 mb-2 line-clamp-2">{item.description}</p>
              )}
              <div className="flex justify-between items-center">
                <p className="text-lg font-bold text-indigo-600">₹{item.price.toFixed(2)}</p>
                {item.is_veg !== undefined && (
                  <span className={`px-2 py-1 text-xs rounded-full ${item.is_veg ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {item.is_veg ? 'Veg' : 'Non-Veg'}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MenuItemsGrid;

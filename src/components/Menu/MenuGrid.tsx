import { useState, useCallback, memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Trash2, CakeSlice, Coffee, Pizza, Beef, Soup, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import AddMenuItemForm from "./AddMenuItemForm";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  image_url: string;
  is_available: boolean;
  created_at: string;
  is_veg?: boolean;
  is_special?: boolean;
}

// Memoized MenuItem component with colorful 3D design
const MenuItemCard = memo(({ 
  item, 
  onEdit, 
  onDelete, 
  getCategoryIcon,
  currencySymbol
}: { 
  item: MenuItem, 
  onEdit: (item: MenuItem) => void, 
  onDelete: (id: string) => void, 
  getCategoryIcon: (category: string) => JSX.Element,
  currencySymbol: string
}) => (
  <Card className="group overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-700/50 backdrop-blur-sm border-0 shadow-lg relative">
    {/* Colorful top accent bar */}
    <div className={`h-1 w-full ${
      item.is_special 
        ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500' 
        : item.is_veg 
          ? 'bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500' 
          : 'bg-gradient-to-r from-orange-400 via-red-500 to-pink-500'
    }`}></div>
    
    {/* Image Section */}
    <div className="relative h-36 overflow-hidden">
      <img
        src={item.image_url || "/placeholder.svg"}
        alt={item.name}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        loading="lazy"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
      
      {/* Category badge */}
      <div className="absolute top-2 right-2">
        <div className="p-2 bg-white/95 dark:bg-gray-700/95 backdrop-blur-sm rounded-xl shadow-lg border border-white/50">
          {getCategoryIcon(item.category)}
        </div>
      </div>
      
      {/* Badges */}
      <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
        {item.is_veg !== undefined && (
          <div className={`text-xs px-2.5 py-1 rounded-full font-bold shadow-lg backdrop-blur-sm ${
            item.is_veg 
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
              : 'bg-gradient-to-r from-red-500 to-rose-500 text-white'
          }`}>
            {item.is_veg ? '🥬 Veg' : '🍖 Non-Veg'}
          </div>
        )}
        {item.is_special && (
          <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white text-xs px-2.5 py-1 rounded-full font-bold shadow-lg animate-pulse">
            ⭐ Special
          </div>
        )}
      </div>
      
      {/* Price badge */}
      <div className="absolute bottom-2 right-2">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-lg font-bold px-3 py-1.5 rounded-xl shadow-lg">
          {currencySymbol}{item.price}
        </div>
      </div>
    </div>
    
    {/* Content */}
    <div className="p-4">
      <div className="mb-3">
        <h3 className="font-bold text-gray-800 dark:text-white text-lg leading-tight line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {item.name}
        </h3>
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">{item.category}</p>
      </div>
      
      {item.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{item.description}</p>
      )}
      
      {/* Action buttons */}
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm"
          className="flex-1 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border-indigo-200 dark:border-indigo-700 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-800/40 dark:hover:to-purple-800/40 text-indigo-700 dark:text-indigo-300 transition-all duration-200 font-medium"
          onClick={() => onEdit(item)}
        >
          <Edit2 className="w-3.5 h-3.5 mr-1.5" />
          Edit
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          className="flex-1 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30 border-red-200 dark:border-red-700 hover:from-red-100 hover:to-rose-100 dark:hover:from-red-800/40 dark:hover:to-rose-800/40 text-red-600 dark:text-red-400 transition-all duration-200 font-medium"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
          Delete
        </Button>
      </div>
    </div>
  </Card>
));

const MenuGrid = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurantId();
  const { symbol: currencySymbol } = useCurrencyContext();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  // Fetch menu items - filter by restaurant_id for RLS compliance
  const { data: menuItems, isLoading } = useQuery({
    queryKey: ['menuItems', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      console.log('Fetching menu items for restaurant:', restaurantId);
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching menu items:', error);
        throw error;
      }

      console.log('Fetched menu items:', data);
      return data as MenuItem[];
    },
    enabled: !!restaurantId,
    staleTime: 60000, // 1 minute cache
    refetchOnWindowFocus: false, // Prevent refetch on window focus to avoid loading flashes
  });

  // Delete menu item mutation
  const deleteMenuItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      toast({
        title: "Success",
        description: "Menu item deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Error deleting menu item:', error);
      toast({
        title: "Error",
        description: "Failed to delete menu item",
        variant: "destructive",
      });
    },
  });

  const getCategoryIcon = useCallback((category: string) => {
    switch (category?.toLowerCase()) {
      case 'desserts':
        return <CakeSlice className="h-4 w-4 text-pink-500" />;
      case 'beverages':
        return <Coffee className="h-4 w-4 text-brown-500" />;
      case 'main course':
        return <Pizza className="h-4 w-4 text-orange-500" />;
      case 'non-veg':
        return <Beef className="h-4 w-4 text-red-500" />;
      default:
        return <Soup className="h-4 w-4 text-primary" />;
    }
  }, []);

  // Handle delete
  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('Are you sure you want to delete this menu item?')) {
      deleteMenuItemMutation.mutate(id);
    }
  }, [deleteMenuItemMutation]);

  // Handle edit
  const handleEdit = useCallback((item: MenuItem) => {
    setEditingItem(item);
    setShowAddForm(true);
  }, []);

  // Handle close form
  const handleCloseForm = useCallback(() => {
    setShowAddForm(false);
    setEditingItem(null);
  }, []);

  // Filter menu items based on search query and active category
  const filteredMenuItems = menuItems?.filter((item) => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeCategory === "all") {
      return matchesSearch;
    } else if (activeCategory === "veg") {
      return matchesSearch && item.is_veg === true;
    } else if (activeCategory === "non-veg") {
      return matchesSearch && item.is_veg === false;
    } else if (activeCategory === "special") {
      return matchesSearch && item.is_special === true;
    } else {
      return matchesSearch && item.category === activeCategory;
    }
  });

  // Group items by category (memoize this operation)
  const groupedItems = useCallback(() => {
    if (!menuItems) return {};
    
    return menuItems.reduce((acc, item) => {
      const category = item.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<string, MenuItem[]>);
  }, [menuItems]);

  const groupedItemsData = groupedItems();

  if (isLoading) {
    return <div className="p-8 text-center">Loading menu items...</div>;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Compact Header with Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gradient-to-r from-white/90 to-emerald-50/30 dark:from-gray-800/90 dark:to-emerald-900/20 p-4 rounded-xl border border-emerald-100/50 dark:border-emerald-800/30 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl shadow-lg">
            <Search className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Menu Items
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-xs">
              {filteredMenuItems?.length || 0} items • {Object.keys(groupedItemsData).length} categories
            </p>
          </div>
        </div>
        
        {/* Search Input - Inline */}
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search items..."
              className="pl-9 h-9 bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-lg text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button 
            size="sm"
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md h-9"
            onClick={() => {
              setEditingItem(null);
              setShowAddForm(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {/* Compact Category Filter Pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveCategory("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
            activeCategory === "all"
              ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md"
              : "bg-white/80 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600"
          }`}
        >
          ✨ All ({menuItems?.length || 0})
        </button>
        <button
          onClick={() => setActiveCategory("veg")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
            activeCategory === "veg"
              ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md"
              : "bg-white/80 dark:bg-gray-700/80 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-700"
          }`}
        >
          🥬 Veg
        </button>
        <button
          onClick={() => setActiveCategory("non-veg")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
            activeCategory === "non-veg"
              ? "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-md"
              : "bg-white/80 dark:bg-gray-700/80 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-700"
          }`}
        >
          🍖 Non-Veg
        </button>
        <button
          onClick={() => setActiveCategory("special")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
            activeCategory === "special"
              ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md"
              : "bg-white/80 dark:bg-gray-700/80 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 border border-purple-200 dark:border-purple-700"
          }`}
        >
          ⭐ Specials
        </button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1 self-center"></div>
        {Object.entries(groupedItemsData).map(([category, items]) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              activeCategory === category
                ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md"
                : "bg-white/80 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600"
            }`}
          >
            {category} ({items.length})
          </button>
        ))}
      </div>

      {/* Menu items grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredMenuItems?.length === 0 ? (
          <div className="col-span-full text-center p-12 text-gray-500">
            <div className="flex flex-col items-center gap-3">
              <Search className="h-12 w-12 text-gray-300" />
              <h3 className="text-lg font-medium">No menu items found</h3>
              <p className="text-sm">Try adjusting your search or category filter</p>
            </div>
          </div>
        ) : (
          filteredMenuItems?.map((item) => (
            <MenuItemCard 
              key={item.id}
              item={item}
              onEdit={handleEdit}
              onDelete={handleDelete}
              getCategoryIcon={getCategoryIcon}
              currencySymbol={currencySymbol}
            />
          ))
        )}
      </div>

      {showAddForm && (
        <AddMenuItemForm
          onClose={handleCloseForm}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['menuItems'] })}
          editingItem={editingItem}
        />
      )}
    </div>
  );
};

export default MenuGrid;

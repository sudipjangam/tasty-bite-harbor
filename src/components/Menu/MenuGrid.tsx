import { useState, useEffect, useCallback, memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit2, Trash2, CakeSlice, Coffee, Pizza, Beef, Soup, Search, Filter } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
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

// Memoized MenuItem component with optimized image size
const MenuItemCard = memo(({ 
  item, 
  onEdit, 
  onDelete, 
  getCategoryIcon 
}: { 
  item: MenuItem, 
  onEdit: (item: MenuItem) => void, 
  onDelete: (id: string) => void, 
  getCategoryIcon: (category: string) => JSX.Element 
}) => (
  <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] bg-white/90 backdrop-blur-sm border border-white/20">
    <div className="relative h-32">
      <img
        src={item.image_url || "/placeholder.svg"}
        alt={item.name}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute top-2 right-2">
        <div className="p-1.5 bg-white/95 backdrop-blur-sm rounded-lg shadow-md">
          {getCategoryIcon(item.category)}
        </div>
      </div>
      <div className="absolute top-2 left-2 flex gap-1">
        {item.is_veg !== undefined && (
          <div className={`text-xs px-2 py-1 rounded-full font-medium ${
            item.is_veg 
              ? 'bg-green-500/90 text-white' 
              : 'bg-red-500/90 text-white'
          }`}>
            {item.is_veg ? 'Veg' : 'Non-Veg'}
          </div>
        )}
        {item.is_special && (
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs px-2 py-1 rounded-full font-medium">
            Special
          </div>
        )}
      </div>
    </div>
    <div className="p-4">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h3 className="font-bold text-gray-800 text-lg leading-tight">{item.name}</h3>
          <p className="text-sm text-emerald-600 font-medium">{item.category}</p>
        </div>
        <p className="font-bold text-purple-600 text-lg">₹{item.price}</p>
      </div>
      {item.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
      )}
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm"
          className="flex-1 hover:bg-purple-50 hover:border-purple-300 transition-colors"
          onClick={() => onEdit(item)}
        >
          <Edit2 className="w-3 h-3 mr-1" />
          Edit
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300 transition-colors"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="w-3 h-3 mr-1" />
          Delete
        </Button>
      </div>
    </div>
  </Card>
));

const MenuGrid = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  // Fetch menu items
  const { data: menuItems, isLoading } = useQuery({
    queryKey: ['menuItems'],
    queryFn: async () => {
      console.log('Fetching menu items...');
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching menu items:', error);
        throw error;
      }

      console.log('Fetched menu items:', data);
      return data as MenuItem[];
    },
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
    <div className="space-y-6 animate-fade-in">
      {/* Modern Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Menu Items
          </h2>
          <p className="text-gray-600 text-sm mt-1">Manage your restaurant's menu offerings</p>
        </div>
        <Button 
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          onClick={() => {
            setEditingItem(null);
            setShowAddForm(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Enhanced Search and Filter Section */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl shadow-lg">
            <Search className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Search & Filter</h3>
        </div>
        
        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search menu items by name, description, or category..."
            className="pl-10 bg-white/50 border-white/30 rounded-xl focus:bg-white focus:border-emerald-300 transition-all duration-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Category Filter Tabs */}
        <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="bg-gray-100/50 rounded-xl p-1 flex-wrap h-auto">
            <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md">
              All Items
            </TabsTrigger>
            <TabsTrigger value="veg" className="text-green-600 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md">
              Vegetarian
            </TabsTrigger>
            <TabsTrigger value="non-veg" className="text-red-600 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md">
              Non-Vegetarian
            </TabsTrigger>
            <TabsTrigger value="special" className="text-purple-600 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md">
              Restaurant Specials
            </TabsTrigger>
            {Object.keys(groupedItemsData).map((category) => (
              <TabsTrigger key={category} value={category} className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md">
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Category Overview Cards - Only show on "all" tab */}
      {activeCategory === "all" && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Object.entries(groupedItemsData).map(([category, items]) => (
            <Card key={category} className="p-4 bg-gradient-to-br from-white to-gray-50/50 border border-white/30 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <div className="flex flex-col items-center text-center gap-2">
                {getCategoryIcon(category)}
                <div>
                  <h3 className="font-medium text-gray-700 text-sm">{category}</h3>
                  <p className="text-xs text-gray-500">
                    {items.length} items
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

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

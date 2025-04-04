
import { useState, useEffect, useCallback, memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit2, Trash2, CakeSlice, Coffee, Pizza, Beef, Soup, Search } from "lucide-react";
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

// Memoized MenuItem component to avoid re-renders
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
  <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
    <div className="relative h-48">
      <img
        src={item.image_url || "/placeholder.svg"}
        alt={item.name}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute top-2 right-2">
        <div className="p-2 bg-white/90 rounded-full shadow-md">
          {getCategoryIcon(item.category)}
        </div>
      </div>
      {item.is_veg && (
        <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
          Veg
        </div>
      )}
      {!item.is_veg && (
        <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
          Non-Veg
        </div>
      )}
      {item.is_special && (
        <div className="absolute bottom-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
          Special
        </div>
      )}
    </div>
    <div className="p-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-gray-800">{item.name}</h3>
          <p className="text-sm text-muted-foreground">{item.category}</p>
          {item.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
          )}
        </div>
        <p className="font-bold text-purple-600">₹{item.price}</p>
      </div>
      <div className="flex gap-2 mt-4">
        <Button 
          variant="outline" 
          className="flex-1 hover:bg-purple-50"
          onClick={() => onEdit(item)}
        >
          <Edit2 className="w-4 h-4 mr-2" />
          Edit
        </Button>
        <Button 
          variant="outline" 
          className="flex-1 text-destructive hover:text-destructive hover:bg-red-50"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
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
        return <CakeSlice className="h-6 w-6 text-pink-500" />;
      case 'beverages':
        return <Coffee className="h-6 w-6 text-brown-500" />;
      case 'main course':
        return <Pizza className="h-6 w-6 text-orange-500" />;
      case 'non-veg':
        return <Beef className="h-6 w-6 text-red-500" />;
      default:
        return <Soup className="h-6 w-6 text-primary" />;
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Menu Items</h2>
        <Button 
          className="bg-purple-600 hover:bg-purple-700 text-white"
          onClick={() => {
            setEditingItem(null);
            setShowAddForm(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search menu items..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Category tabs */}
      <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="mb-4 w-full justify-start overflow-x-auto">
          <TabsTrigger value="all">All Items</TabsTrigger>
          <TabsTrigger value="veg" className="text-green-600">Vegetarian</TabsTrigger>
          <TabsTrigger value="non-veg" className="text-red-600">Non-Vegetarian</TabsTrigger>
          <TabsTrigger value="special" className="text-purple-600">Restaurant Specials</TabsTrigger>
          {Object.keys(groupedItemsData).map((category) => (
            <TabsTrigger key={category} value={category}>
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* All items are shown in each tab, but filtered accordingly */}
        <div className="flex flex-wrap gap-4 mb-6">
          {activeCategory === "all" && Object.entries(groupedItemsData).map(([category, items]) => (
            <Card key={category} className="flex items-center gap-3 p-4 bg-gradient-to-br from-white to-gray-50 border-none shadow-md">
              {getCategoryIcon(category)}
              <div>
                <h3 className="font-medium text-gray-700">{category}</h3>
                <p className="text-sm text-muted-foreground">
                  {items.length} items
                </p>
              </div>
            </Card>
          ))}
        </div>
      </Tabs>

      {/* Menu items grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMenuItems?.length === 0 ? (
          <div className="col-span-full text-center p-8 text-muted-foreground">
            No menu items found. Try a different search or category.
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

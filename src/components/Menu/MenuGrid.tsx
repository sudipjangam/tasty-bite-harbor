
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2, CakeSlice, Coffee, Pizza, Beef, Soup } from "lucide-react";
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
}

const MenuGrid = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Fetch menu items with improved error handling
  const { data: menuItems, isLoading, error } = useQuery({
    queryKey: ['menuItems'],
    queryFn: async () => {
      console.log('Fetching menu items...');
      
      // First get the restaurant_id from the user's profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found');
        throw new Error('No authenticated user found');
      }
      
      console.log('Authenticated user ID:', user.id);
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('restaurant_id')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.error('Error fetching profile:', profileError);
        throw profileError;
      }
      
      if (!profile?.restaurant_id) {
        console.error('No restaurant found for user');
        throw new Error('No restaurant found for user');
      }
      
      console.log('Restaurant ID:', profile.restaurant_id);
      
      // Then get the menu items for this restaurant
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', profile.restaurant_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching menu items:', error);
        throw error;
      }

      console.log('Fetched menu items:', data);
      return data as MenuItem[];
    },
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

  const getCategoryIcon = (category: string) => {
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
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this menu item?')) {
      deleteMenuItemMutation.mutate(id);
    }
  };

  // Handle edit
  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setShowAddForm(true);
  };

  // Handle close form
  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingItem(null);
  };

  // Display error state if there's an error
  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="bg-red-50 p-4 rounded-md mb-4">
          <h3 className="text-lg font-medium text-red-800">Error loading menu items</h3>
          <p className="text-sm text-red-600 mt-1">{(error as Error).message || 'An unknown error occurred'}</p>
        </div>
        <Button 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['menuItems'] })}
          className="mt-4"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-8 text-center">Loading menu items...</div>;
  }

  // Group items by category
  const groupedItems = menuItems?.reduce((acc, item) => {
    const category = item.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, any[]>);

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

      {menuItems && menuItems.length === 0 && (
        <div className="p-8 text-center bg-gray-50 rounded-md">
          <p className="text-gray-600">No menu items found. Add your first menu item to get started.</p>
        </div>
      )}

      {groupedItems && Object.entries(groupedItems).length > 0 && (
        <div className="flex flex-wrap gap-4 mb-6">
          {Object.entries(groupedItems).map(([category, items]) => (
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
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {menuItems?.map((item) => (
          <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative h-48">
              <img
                src={item.image_url || "/placeholder.svg"}
                alt={item.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2">
                <div className="p-2 bg-white/90 rounded-full shadow-md">
                  {getCategoryIcon(item.category)}
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-800">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">{item.category}</p>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  )}
                </div>
                <p className="font-bold text-purple-600">₹{item.price}</p>
              </div>
              <div className="flex gap-2 mt-4">
                <Button 
                  variant="outline" 
                  className="flex-1 hover:bg-purple-50"
                  onClick={() => handleEdit(item)}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 text-destructive hover:text-destructive hover:bg-red-50"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
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

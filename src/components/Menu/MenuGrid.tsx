import { useState, useCallback, memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Edit2,
  Trash2,
  CakeSlice,
  Coffee,
  Pizza,
  Beef,
  Soup,
  Search,
  Sparkles,
  Utensils,
  X,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { useIsMobile } from "@/hooks/use-mobile";
import AddMenuItemForm from "./AddMenuItemForm";
import { LazyImage } from "@/components/ui/lazy-image";
import { FeatureLock } from "@/components/Auth/FeatureLock";
import AIImportDialog from "./AIImportDialog";
import CategoryBar, { getCategoryEmoji, getCategoryGradient } from "./CategoryBar";
import MobileMenuView, { MenuItem, VegIndicator } from "./MobileMenuView";

// Memoized MenuItem component with colorful 3D design & instant availability toggle
const MenuItemCard = memo(
  ({
    item,
    onEdit,
    onDelete,
    onToggleAvailability,
    getCategoryIcon,
    currencySymbol,
  }: {
    item: MenuItem;
    onEdit: (item: MenuItem) => void;
    onDelete: (id: string) => void;
    onToggleAvailability: (id: string, currentStatus: boolean) => void;
    getCategoryIcon: (category: string) => JSX.Element;
    currencySymbol: string;
  }) => {
    const isAvailable = item.is_available ?? true;
    const hasCustomImage = Boolean(
      item.image_url &&
        item.image_url !== "/placeholder.svg" &&
        !item.image_url.includes("placeholder"),
    );
    const emoji = getCategoryEmoji(item.category || item.name);
    const gradient = getCategoryGradient(item.category, item.is_veg ?? undefined);

    return (
      <Card
        className={`group overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-700/50 backdrop-blur-sm border-0 shadow-lg relative flex flex-col justify-between ${
          !isAvailable ? "opacity-75" : ""
        }`}
      >
        <div>
          {/* Colorful top accent bar */}
          <div
            className={`h-1 w-full ${
              !isAvailable
                ? "bg-gray-400 dark:bg-gray-600"
                : item.is_special
                  ? "bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500"
                  : item.is_veg === true
                    ? "bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500"
                    : item.is_veg === false
                      ? "bg-gradient-to-r from-orange-400 via-red-500 to-pink-500"
                      : "bg-gradient-to-r from-blue-400 via-indigo-500 to-teal-500"
            }`}
          ></div>

          {/* Image / Fallback Section */}
          <div className="relative h-40 overflow-hidden bg-gray-100 dark:bg-gray-700 select-none">
            {hasCustomImage ? (
              <LazyImage
                src={item.image_url}
                alt={item.name}
                className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${
                  !isAvailable ? "grayscale contrast-75" : ""
                }`}
                containerClassName="w-full h-full"
              />
            ) : (
              <div
                className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center relative ${
                  !isAvailable ? "grayscale contrast-75" : ""
                }`}
              >
                <span className="text-5xl filter drop-shadow-md transition-transform duration-500 group-hover:scale-110">
                  {emoji}
                </span>
              </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none"></div>

            {/* Badges in Top Left */}
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
              <VegIndicator isVeg={item.is_veg} />
              {item.is_special && (
                <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white text-xs px-2.5 py-0.5 rounded-full font-bold shadow-lg animate-pulse">
                  ⭐ Special
                </div>
              )}
              {!isAvailable && (
                <div className="bg-rose-600 text-white text-xs px-2.5 py-0.5 rounded-full font-bold shadow-lg">
                  Out of Stock
                </div>
              )}
            </div>

            {/* Price badge */}
            <div className="absolute bottom-2.5 right-2.5">
              <div className="bg-slate-900/85 dark:bg-black/85 backdrop-blur-sm text-white text-lg font-black px-3 py-1 rounded-xl shadow-lg">
                {currencySymbol}
                {item.price}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="mb-2">
              <h3
                className={`font-bold text-lg leading-tight line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors capitalize ${
                  isAvailable
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-500 dark:text-gray-400 line-through"
                }`}
              >
                {item.name}
              </h3>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {item.category}
              </p>
            </div>

            {item.description && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                {item.description}
              </p>
            )}
          </div>
        </div>

        {/* Bottom Bar: Stock Switch + Action Buttons */}
        <div className="p-4 pt-0 space-y-3">
          {/* Quick Stock Toggle */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
            <span
              className={`text-xs font-bold ${
                isAvailable
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-500"
              }`}
            >
              {isAvailable ? "🟢 In Stock" : "🔴 Out of Stock"}
            </span>
            <Switch
              checked={isAvailable}
              onCheckedChange={() => onToggleAvailability(item.id, isAvailable)}
              className="data-[state=checked]:bg-emerald-500 scale-90"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border-indigo-200 dark:border-indigo-700 hover:from-indigo-100 hover:to-purple-100 text-indigo-700 dark:text-indigo-300 font-bold"
              onClick={() => onEdit(item)}
            >
              <Edit2 className="w-3.5 h-3.5 mr-1.5" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30 border-red-200 dark:border-red-700 hover:from-red-100 hover:to-rose-100 text-red-600 dark:text-red-400 font-bold"
              onClick={() => onDelete(item.id)}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete
            </Button>
          </div>
        </div>
      </Card>
    );
  },
);

const MenuGrid = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurantId();
  const { symbol: currencySymbol } = useCurrencyContext();
  const isMobile = useIsMobile();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAIImport, setShowAIImport] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  // Fetch menu items - filter by restaurant_id for RLS compliance
  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ["menuItems", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching menu items:", error);
        throw error;
      }

      return data as MenuItem[];
    },
    enabled: !!restaurantId,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Delete menu item mutation
  const deleteMenuItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("menu_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menuItems", restaurantId] });
      toast({
        title: "Success",
        description: "Menu item deleted successfully",
      });
    },
    onError: (error) => {
      console.error("Error deleting menu item:", error);
      toast({
        title: "Error",
        description: "Failed to delete menu item",
        variant: "destructive",
      });
    },
  });

  // Toggle availability mutation with optimistic update
  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: boolean }) => {
      const { error } = await supabase
        .from("menu_items")
        .update({ is_available: newStatus, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      return { id, newStatus };
    },
    onMutate: async ({ id, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ["menuItems", restaurantId] });
      const previousItems = queryClient.getQueryData<MenuItem[]>(["menuItems", restaurantId]);

      if (previousItems) {
        queryClient.setQueryData<MenuItem[]>(
          ["menuItems", restaurantId],
          previousItems.map((item) =>
            item.id === id ? { ...item, is_available: newStatus } : item,
          ),
        );
      }

      return { previousItems };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(["menuItems", restaurantId], context.previousItems);
      }
      toast({
        title: "Error",
        description: "Failed to update item availability",
        variant: "destructive",
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.newStatus ? "Item In Stock" : "Item Out of Stock",
        description: `Availability updated to ${variables.newStatus ? "In Stock" : "Out of Stock"}`,
      });
      queryClient.invalidateQueries({ queryKey: ["menuItems", restaurantId] });
    },
  });

  const handleToggleAvailability = useCallback(
    (id: string, currentStatus: boolean) => {
      toggleAvailabilityMutation.mutate({ id, newStatus: !currentStatus });
    },
    [toggleAvailabilityMutation],
  );

  const getCategoryIcon = useCallback((category: string) => {
    switch (category?.toLowerCase()) {
      case "desserts":
      case "dessert & ice creams":
        return <CakeSlice className="h-4 w-4 text-pink-500" />;
      case "beverages":
      case "cold coffee":
      case "special coffees":
      case "hot beverages":
      case "milkshakes":
      case "mocktails":
      case "special mocktails":
        return <Coffee className="h-4 w-4 text-amber-600" />;
      case "main course":
      case "pizza":
      case "jain pizza":
        return <Pizza className="h-4 w-4 text-orange-500" />;
      case "non-veg":
        return <Beef className="h-4 w-4 text-red-500" />;
      case "chinese noodles":
      case "chinese rice":
      case "chinese bhel":
      case "pasta":
        return <Utensils className="h-4 w-4 text-emerald-500" />;
      default:
        return <Soup className="h-4 w-4 text-primary" />;
    }
  }, []);

  // Handle delete
  const handleDelete = useCallback(
    async (id: string) => {
      if (window.confirm("Are you sure you want to delete this menu item?")) {
        deleteMenuItemMutation.mutate(id);
      }
    },
    [deleteMenuItemMutation],
  );

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
  const filteredMenuItems = menuItems.filter((item) => {
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

  // Group items by category
  const groupedItems = useCallback(() => {
    return menuItems.reduce(
      (acc, item) => {
        const category = item.category || "Other";
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(item);
        return acc;
      },
      {} as Record<string, MenuItem[]>,
    );
  }, [menuItems]);

  const groupedItemsData = groupedItems();
  const vegCount = menuItems.filter((i) => i.is_veg === true).length;
  const nonVegCount = menuItems.filter((i) => i.is_veg === false).length;
  const specialCount = menuItems.filter((i) => i.is_special === true).length;

  if (isLoading) {
    return (
      <div className="p-12 text-center text-gray-500">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="font-medium">Loading delicious offerings...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Mobile-Optimized Menu View */}
      {isMobile ? (
        <MobileMenuView
          items={filteredMenuItems}
          allItems={menuItems}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          groupedItemsData={groupedItemsData}
          currencySymbol={currencySymbol}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleAvailability={handleToggleAvailability}
          onOpenAddModal={() => {
            setEditingItem(null);
            setShowAddForm(true);
          }}
          onOpenAIImport={() => setShowAIImport(true)}
        />
      ) : (
        /* Desktop View */
        <div className="space-y-4">
          {/* Desktop Search & Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gradient-to-r from-white/90 to-emerald-50/30 dark:from-gray-800/90 dark:to-emerald-900/20 p-4 rounded-2xl border border-emerald-100/50 dark:border-emerald-800/30 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-500/20">
                <Search className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Menu Offerings
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-xs">
                  {filteredMenuItems.length} items shown • {Object.keys(groupedItemsData).length} categories
                </p>
              </div>
            </div>

            {/* Search Input - Desktop Inline */}
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search items by name, category..."
                  className="pl-9 pr-8 h-10 bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl text-sm focus-visible:ring-emerald-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <FeatureLock feature="menu.ai_import" interceptClicks={true}>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 shadow-sm h-10 px-3.5 rounded-xl flex items-center gap-1.5 font-bold text-xs"
                  onClick={() => setShowAIImport(true)}
                >
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  AI Import
                </Button>
              </FeatureLock>
              <Button
                size="sm"
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/20 h-10 px-4 rounded-xl font-bold text-xs"
                onClick={() => {
                  setEditingItem(null);
                  setShowAddForm(true);
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>
          </div>

          {/* Desktop Categories & Filter Bar */}
          <CategoryBar
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            groupedItemsData={groupedItemsData}
            totalCount={menuItems.length}
            vegCount={vegCount}
            nonVegCount={nonVegCount}
            specialCount={specialCount}
          />

          {/* Desktop Menu items grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-1">
            {filteredMenuItems.length === 0 ? (
              <div className="col-span-full text-center p-16 text-gray-500 bg-white/50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                <div className="flex flex-col items-center gap-3">
                  <Search className="h-12 w-12 text-gray-300" />
                  <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">No menu items found</h3>
                  <p className="text-sm text-gray-500">
                    Try adjusting your search query or choosing another category filter.
                  </p>
                  {(searchQuery || activeCategory !== "all") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("");
                        setActiveCategory("all");
                      }}
                      className="mt-2 rounded-xl"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              filteredMenuItems.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggleAvailability={handleToggleAvailability}
                  getCategoryIcon={getCategoryIcon}
                  currencySymbol={currencySymbol}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {showAddForm && (
        <AddMenuItemForm
          onClose={handleCloseForm}
          onSuccess={() =>
            queryClient.invalidateQueries({ queryKey: ["menuItems", restaurantId] })
          }
          editingItem={editingItem}
        />
      )}

      {/* AI Import Modal */}
      {showAIImport && (
        <AIImportDialog
          onClose={() => setShowAIImport(false)}
          onSuccess={() =>
            queryClient.invalidateQueries({ queryKey: ["menuItems", restaurantId] })
          }
        />
      )}
    </div>
  );
};

export default MenuGrid;

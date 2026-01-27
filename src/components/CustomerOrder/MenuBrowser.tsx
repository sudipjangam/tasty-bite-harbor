import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Plus, Minus, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image?: string;
  is_available: boolean;
}

interface MenuBrowserProps {
  menuItems: MenuItem[];
  restaurantName: string;
}

export const MenuBrowser = ({
  menuItems,
  restaurantName,
}: MenuBrowserProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const { addItem, items: cartItems } = useCart();

  // Get unique categories
  const categories = useMemo(() => {
    const cats = ["All", ...new Set(menuItems.map((item) => item.category))];
    return cats;
  }, [menuItems]);

  // Filter menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesSearch = item.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === "All" || item.category === selectedCategory;
      return matchesSearch && matchesCategory && item.is_available;
    });
  }, [menuItems, searchTerm, selectedCategory]);

  // Get quantity in cart for an item
  const getCartQuantity = (menuItemId: string) => {
    return cartItems
      .filter((item) => item.menuItemId === menuItemId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  const handleAddToCart = (item: MenuItem) => {
    addItem({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      image: item.image,
    });
  };

  return (
    <div className="space-y-4">
      {/* Restaurant Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold mb-1">{restaurantName}</h1>
        <p className="text-purple-100 text-sm">Browse our menu and order</p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search menu items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((category) => (
          <Badge
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            className={`cursor-pointer whitespace-nowrap ${
              selectedCategory === category
                ? "bg-purple-600 hover:bg-purple-700"
                : "hover:bg-gray-100"
            }`}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </Badge>
        ))}
      </div>

      {/* Menu Items Grid */}
      <div className="grid gap-4">
        {filteredItems.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">No items found</p>
          </Card>
        ) : (
          filteredItems.map((item) => {
            const cartQty = getCartQuantity(item.id);
            return (
              <Card
                key={item.id}
                className="overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="flex gap-4 p-4">
                  {/* Item Image */}
                  {item.image && (
                    <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Item Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold text-purple-600">
                        ₹{item.price.toFixed(2)}
                      </p>

                      {/* Add to Cart Button */}
                      {cartQty === 0 ? (
                        <Button
                          size="sm"
                          onClick={() => handleAddToCart(item)}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      ) : (
                        <Badge
                          variant="default"
                          className="bg-green-600 px-3 py-1"
                        >
                          <ShoppingCart className="w-3 h-3 mr-1" />
                          {cartQty} in cart
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

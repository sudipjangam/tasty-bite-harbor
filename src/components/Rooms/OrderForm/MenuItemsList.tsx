
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Leaf } from 'lucide-react';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  is_veg?: boolean;
}

interface MenuItemsListProps {
  menuItems: MenuItem[];
  isLoading: boolean;
  error: string | null;
  onAddToOrder: (item: MenuItem) => void;
}

const MenuItemsList: React.FC<MenuItemsListProps> = ({ 
  menuItems, 
  isLoading, 
  error,
  onAddToOrder 
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading menu items...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (menuItems.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No menu items found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {menuItems.map((item) => (
        <Card key={item.id} className="group hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h4 className="font-semibold text-base mb-1 line-clamp-1">{item.name}</h4>
                {item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {item.description}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {item.category}
                  </Badge>
                  {item.is_veg !== undefined && (
                    <Badge 
                      variant={item.is_veg ? "default" : "destructive"} 
                      className="text-xs flex items-center gap-1"
                    >
                      {item.is_veg && <Leaf className="h-3 w-3" />}
                      {item.is_veg ? 'Veg' : 'Non-Veg'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <span className="text-lg font-bold text-primary">
                ₹{item.price.toFixed(2)}
              </span>
              <Button 
                size="sm"
                onClick={() => onAddToOrder(item)}
                className="group-hover:scale-105 transition-transform"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default MenuItemsList;

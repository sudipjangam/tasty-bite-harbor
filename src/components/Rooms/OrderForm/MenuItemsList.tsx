
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';

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
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-4">Loading menu items...</TableCell>
            </TableRow>
          ) : error ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-4 text-red-500">{error}</TableCell>
            </TableRow>
          ) : menuItems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-4">No menu items found</TableCell>
            </TableRow>
          ) : (
            menuItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {item.name}
                  {item.is_veg !== undefined && (
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${item.is_veg ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {item.is_veg ? 'Veg' : 'Non-Veg'}
                    </span>
                  )}
                </TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell className="text-right">₹{item.price.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => onAddToOrder(item)}
                  >
                    <Plus className="h-4 w-4" />
                    <span className="ml-1 hidden sm:inline">Add</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default MenuItemsList;

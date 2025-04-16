
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MenuItem } from "@/components/Rooms/OrderForm/MenuItemsList";

interface MenuItemsGridProps {
  items: MenuItem[];
  onSelectItem: (item: MenuItem) => void;
  isLoading?: boolean;
}

const MenuItemsGrid = ({ items, onSelectItem, isLoading }: MenuItemsGridProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="p-4 space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/4" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
      {items.map((item) => (
        <Card
          key={item.id}
          className="p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onSelectItem(item)}
        >
          <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-md mb-3 flex items-center justify-center">
            <span className="text-2xl text-gray-400">Item</span>
          </div>
          <h3 className="font-medium text-lg mb-2">{item.name}</h3>
          <p className="text-lg font-bold text-indigo-600">₹{item.price.toFixed(2)}</p>
        </Card>
      ))}
    </div>
  );
};

export default MenuItemsGrid;

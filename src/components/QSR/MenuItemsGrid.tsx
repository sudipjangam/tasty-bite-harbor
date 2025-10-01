import { QSRMenuItem } from '@/hooks/useQSRMenuItems';
import { CurrencyDisplay } from '@/components/ui/currency-display';

interface MenuItemsGridProps {
  items: QSRMenuItem[];
  onAddItem: (item: QSRMenuItem) => void;
}

export const MenuItemsGrid = ({ items, onAddItem }: MenuItemsGridProps) => {
  return (
    <div className="bg-background h-full overflow-y-auto">
      <div className="p-4 border-b border-border sticky top-0 bg-background z-10">
        <h2 className="text-lg font-semibold text-foreground">Quick Menu Select</h2>
      </div>
      <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
        {items.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No items available in this category
          </div>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              onClick={() => onAddItem(item)}
              className="bg-card hover:bg-accent border border-border rounded-lg p-4 text-center transition-all shadow-sm hover:shadow-md touch-manipulation active:scale-95"
            >
              {item.image_url ? (
                <img 
                  src={item.image_url} 
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded-lg mx-auto mb-2"
                />
              ) : (
                <div className="text-4xl mb-2">{item.is_veg ? '🥦' : '🍖'}</div>
              )}
              <div className="font-medium text-card-foreground mb-1 line-clamp-2">{item.name}</div>
              {item.description && (
                <div className="text-xs text-muted-foreground mb-2 line-clamp-1">{item.description}</div>
              )}
              <div className="text-primary font-semibold">
                <CurrencyDisplay amount={item.price} showTooltip={false} />
              </div>
              {item.is_veg !== undefined && (
                <div className="mt-2">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${item.is_veg ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'}`}>
                    {item.is_veg ? 'Veg' : 'Non-Veg'}
                  </span>
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

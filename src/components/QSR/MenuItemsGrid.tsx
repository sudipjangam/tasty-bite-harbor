import { QSRMenuItem } from '@/types/qsr';
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
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onAddItem(item)}
            className="bg-card hover:bg-accent border border-border rounded-lg p-4 text-center transition-all shadow-sm hover:shadow-md touch-manipulation active:scale-95"
          >
            <div className="text-4xl mb-2">{item.emoji}</div>
            <div className="font-medium text-card-foreground mb-1">{item.name}</div>
            <div className="text-primary font-semibold">
              <CurrencyDisplay amount={item.price} showTooltip={false} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

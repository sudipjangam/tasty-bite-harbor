import { QSROrderItem } from '@/types/qsr';
import { Plus, Minus, X } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency-display';

interface OrderSummaryProps {
  items: QSROrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  onIncrement: (menuItemId: string) => void;
  onDecrement: (menuItemId: string) => void;
  onRemove: (menuItemId: string) => void;
  onKOT: () => void;
  onCancel: () => void;
  onPayNow: () => void;
  loading?: boolean;
}

export const OrderSummary = ({
  items,
  subtotal,
  tax,
  total,
  onIncrement,
  onDecrement,
  onRemove,
  onKOT,
  onCancel,
  onPayNow,
  loading = false,
}: OrderSummaryProps) => {
  return (
    <div className="bg-primary/5 border-l border-border h-full flex flex-col">
      <div className="p-4 bg-primary text-primary-foreground">
        <h2 className="text-lg font-semibold">Current Order</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {items.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No items in order
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.menuItemId}
              className="bg-card border border-border rounded-lg p-3 flex items-center justify-between gap-2"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-card-foreground truncate">{item.name}</div>
                <div className="text-sm text-muted-foreground">
                  @ <CurrencyDisplay amount={item.price} showTooltip={false} />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onDecrement(item.menuItemId)}
                  className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center touch-manipulation"
                  disabled={loading}
                >
                  <Minus className="w-4 h-4" />
                </button>
                
                <span className="w-8 text-center font-semibold">{item.quantity}</span>
                
                <button
                  onClick={() => onIncrement(item.menuItemId)}
                  className="w-8 h-8 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center touch-manipulation"
                  disabled={loading}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              <div className="font-semibold text-card-foreground">
                <CurrencyDisplay amount={item.price * item.quantity} showTooltip={false} />
              </div>
              
              <button
                onClick={() => onRemove(item.menuItemId)}
                className="w-8 h-8 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive flex items-center justify-center touch-manipulation"
                disabled={loading}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
      
      <div className="p-4 border-t border-border bg-background space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal:</span>
            <span><CurrencyDisplay amount={subtotal} showTooltip={false} /></span>
          </div>
          <div className="flex justify-between text-xl font-bold text-primary pt-2 border-t border-border">
            <span>TOTAL:</span>
            <span><CurrencyDisplay amount={total} showTooltip={false} /></span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onKOT}
              disabled={items.length === 0 || loading}
              className="py-3 px-4 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation transition-all active:scale-95"
            >
              KOT / Hold
            </button>
            <button
              onClick={onCancel}
              disabled={items.length === 0 || loading}
              className="py-3 px-4 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation transition-all active:scale-95"
            >
              Cancel
            </button>
          </div>
          <button
            onClick={onPayNow}
            disabled={items.length === 0 || loading}
            className="w-full py-4 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation transition-all active:scale-95"
          >
            {loading ? 'Processing...' : 'PAY NOW'}
          </button>
        </div>
      </div>
    </div>
  );
};

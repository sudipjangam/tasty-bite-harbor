import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantId } from '@/hooks/useRestaurantId';
import { QSR_CATEGORIES, QSR_MENU_ITEMS, QSRMenuItem, QSROrderItem } from '@/types/qsr';
import { CategoryList } from './CategoryList';
import { MenuItemsGrid } from './MenuItemsGrid';
import { OrderSummary } from './OrderSummary';
import { OrderHistory } from './OrderHistory';
import { ToastNotification } from './ToastNotification';
import { Zap } from 'lucide-react';

type ViewMode = 'order' | 'history';
type ToastType = { message: string; type: 'success' | 'error' | 'info' } | null;

const TAX_RATE = 0.05;

export const QSRPosMain = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('order');
  const [selectedCategory, setSelectedCategory] = useState(QSR_CATEGORIES[0].id);
  const [orderItems, setOrderItems] = useState<QSROrderItem[]>([]);
  const [toast, setToast] = useState<ToastType>(null);
  const [loading, setLoading] = useState(false);
  const restaurantId = useRestaurantId();

  const filteredItems = QSR_MENU_ITEMS.filter(
    (item) => item.category === selectedCategory
  );

  const subtotal = orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };

  const addItem = (menuItem: QSRMenuItem) => {
    setOrderItems((prev) => {
      const existing = prev.find((item) => item.menuItemId === menuItem.id);
      if (existing) {
        return prev.map((item) =>
          item.menuItemId === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          menuItemId: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: 1,
        },
      ];
    });
  };

  const incrementItem = (menuItemId: string) => {
    setOrderItems((prev) =>
      prev.map((item) =>
        item.menuItemId === menuItemId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  const decrementItem = (menuItemId: string) => {
    setOrderItems((prev) =>
      prev
        .map((item) =>
          item.menuItemId === menuItemId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (menuItemId: string) => {
    setOrderItems((prev) => prev.filter((item) => item.menuItemId !== menuItemId));
  };

  const clearOrder = () => {
    setOrderItems([]);
  };

  const saveOrder = async (status: 'paid' | 'pending' | 'held') => {
    if (!restaurantId || orderItems.length === 0) return;

    setLoading(true);
    try {
      const orderData = {
        restaurant_id: restaurantId,
        customer_name: 'QSR Customer',
        items: orderItems.map((item) => `${item.name} x${item.quantity}`),
        total: total,
        status: status === 'pending' ? 'held' : status,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('orders').insert([orderData]);

      if (error) throw error;

      const statusMessages = {
        paid: 'Order completed and paid successfully!',
        pending: 'Order saved as KOT/Hold',
        held: 'Order saved as KOT/Hold',
      };

      showToast(statusMessages[status], 'success');
      clearOrder();
    } catch (error) {
      console.error('Error saving order:', error);
      showToast('Failed to save order. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleKOT = () => saveOrder('held');
  const handleCancel = () => {
    clearOrder();
    showToast('Order cancelled', 'info');
  };
  const handlePayNow = () => saveOrder('paid');

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold text-primary">QSR POS</h1>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('order')}
            className={`px-6 py-2 rounded-lg font-medium transition-all touch-manipulation ${
              viewMode === 'order'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            New Order
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`px-6 py-2 rounded-lg font-medium transition-all touch-manipulation ${
              viewMode === 'history'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Order History
          </button>
        </div>
      </header>

      {/* Main Content */}
      {viewMode === 'order' ? (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Categories - Left Column */}
          <div className="md:col-span-2 border-r border-border overflow-hidden">
            <CategoryList
              categories={QSR_CATEGORIES}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </div>

          {/* Menu Items - Middle Column */}
          <div className="md:col-span-6 overflow-hidden">
            <MenuItemsGrid items={filteredItems} onAddItem={addItem} />
          </div>

          {/* Order Summary - Right Column */}
          <div className="md:col-span-4 overflow-hidden">
            <OrderSummary
              items={orderItems}
              subtotal={subtotal}
              tax={tax}
              total={total}
              onIncrement={incrementItem}
              onDecrement={decrementItem}
              onRemove={removeItem}
              onKOT={handleKOT}
              onCancel={handleCancel}
              onPayNow={handlePayNow}
              loading={loading}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <OrderHistory />
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

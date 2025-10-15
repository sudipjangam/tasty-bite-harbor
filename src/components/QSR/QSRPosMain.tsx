import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantId } from '@/hooks/useRestaurantId';
import { useQSRMenuItems, QSRMenuItem } from '@/hooks/useQSRMenuItems';
import { QSROrderItem } from '@/types/qsr';
import { CategoryList } from './CategoryList';
import { MenuItemsGrid } from './MenuItemsGrid';
import { OrderSummary } from './OrderSummary';
import { OrderHistory } from './OrderHistory';
import { ToastNotification } from './ToastNotification';
import { Zap } from 'lucide-react';

type ViewMode = 'order' | 'history';
type ToastType = { message: string; type: 'success' | 'error' | 'info' } | null;

const TAX_RATE = 0;

export const QSRPosMain = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('order');
  const [orderItems, setOrderItems] = useState<QSROrderItem[]>([]);
  const [toast, setToast] = useState<ToastType>(null);
  const [loading, setLoading] = useState(false);
  const [retrievedOrderId, setRetrievedOrderId] = useState<string | null>(null);
  const { restaurantId } = useRestaurantId();
  const { menuItems, categories, isLoading: menuLoading } = useQSRMenuItems();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Set first category as default when categories load
  React.useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0].id);
    }
  }, [categories, selectedCategory]);

  const filteredItems = menuItems.filter(
    (item) => item.category.toLowerCase().replace(/\s+/g, '-') === selectedCategory
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
          category: menuItem.category,
        },
      ];
    });
    showToast(`${menuItem.name} added to order`, 'success');
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
        status: status,
        source: 'qsr',
      };

      // Kitchen order items format
      const kitchenItems = orderItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      }));

      // Try to UPDATE existing retrieved order first
      if (retrievedOrderId) {
        const { data: updatedRows, error: updateError } = await supabase
          .from('orders')
          .update(orderData)
          .eq('id', retrievedOrderId)
          .select('id');

        if (updateError) throw updateError;

        // Create or update corresponding kitchen order
        const { data: koUpdated, error: koUpdateError } = await supabase
          .from('kitchen_orders')
          .update({
            items: kitchenItems,
            status: 'new',
            source: 'QSR-POS',
          })
          .eq('order_id', retrievedOrderId)
          .select('id');

        if (koUpdateError) throw koUpdateError;

        if (!koUpdated || koUpdated.length === 0) {
          await supabase
            .from('kitchen_orders')
            .insert({
              restaurant_id: restaurantId,
              order_id: retrievedOrderId,
              source: 'QSR-POS',
              status: 'new',
              items: kitchenItems,
            });
        }

        // If no rows were updated (edge case), INSERT a new order and DELETE the old held one
        if (!updatedRows || updatedRows.length === 0) {
          const { data: insertedRows, error: insertError } = await supabase
            .from('orders')
            .insert([{ ...orderData, created_at: new Date().toISOString() }])
            .select('id');
          if (insertError) throw insertError;

          // Create or update kitchen order for this new order
          if (insertedRows && insertedRows[0]) {
            await supabase
              .from('kitchen_orders')
              .insert({
                restaurant_id: restaurantId,
                order_id: insertedRows[0].id,
                source: 'QSR-POS',
                status: 'new',
                items: kitchenItems,
              });
          }

          // Remove old held order to avoid duplicates in history
          await supabase.from('orders').delete().eq('id', retrievedOrderId);
        }
      } else {
        // Otherwise, INSERT a brand new order
        const { data: insertedOrder, error: insertError } = await supabase
          .from('orders')
          .insert([{ ...orderData, created_at: new Date().toISOString() }])
          .select('id');
        if (insertError) throw insertError;

        // Create kitchen order if not held (only for paid orders)
        if (status !== 'held' && insertedOrder && insertedOrder[0]) {
          const { error: kitchenError } = await supabase
            .from('kitchen_orders')
            .insert({
              restaurant_id: restaurantId,
              order_id: insertedOrder[0].id,
              source: 'QSR-POS',
              status: 'new',
              items: kitchenItems,
            });
          
          if (kitchenError) {
            console.error('Error creating kitchen order:', kitchenError);
            // Don't throw - order was created successfully, kitchen order is secondary
          }
        }
      }

      const statusMessages = {
        paid: 'Order completed and sent to kitchen!',
        pending: 'Order saved as KOT/Hold',
        held: 'Order saved as KOT/Hold',
      };

      showToast(statusMessages[status], 'success');
      clearOrder();
      setRetrievedOrderId(null); // Clear retrieved order ID after saving
    } catch (error) {
      console.error('Error saving order:', error);
      showToast('Failed to save order. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const retrieveOrder = (orderId: string, items: string[], orderTotal: number) => {
    if (orderItems.length > 0) {
      showToast('Please clear current order before retrieving a held order', 'error');
      return;
    }

    // Parse items back into order format
    const parsedItems: QSROrderItem[] = items.map((itemStr) => {
      const match = itemStr.match(/^(.+?) x(\d+)$/);
      if (match) {
        const itemName = match[1];
        const qty = parseInt(match[2]);
        const menuItem = menuItems.find(m => m.name === itemName);
        
        if (menuItem) {
          return {
            menuItemId: menuItem.id,
            name: menuItem.name,
            price: menuItem.price,
            quantity: qty,
            category: menuItem.category,
          };
        }
      }
      return null;
    }).filter(Boolean) as QSROrderItem[];

    setOrderItems(parsedItems);
    setRetrievedOrderId(orderId); // Store the retrieved order ID
    setViewMode('order');
    showToast('Order retrieved successfully', 'success');
  };
  const handleKOT = () => saveOrder('held');
  const handleCancel = () => {
    clearOrder();
    setRetrievedOrderId(null); // Clear retrieved order ID on cancel
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
            {menuLoading ? (
              <div className="p-4 text-center text-muted-foreground">Loading...</div>
            ) : (
              <CategoryList
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            )}
          </div>

          {/* Menu Items - Middle Column */}
          <div className="md:col-span-6 overflow-hidden">
            {menuLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading menu items...</div>
            ) : (
              <MenuItemsGrid items={filteredItems} onAddItem={addItem} />
            )}
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
          <OrderHistory 
            onRetrieveOrder={retrieveOrder}
            currentOrderHasItems={orderItems.length > 0}
          />
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

// Import React for useEffect
import React from 'react';

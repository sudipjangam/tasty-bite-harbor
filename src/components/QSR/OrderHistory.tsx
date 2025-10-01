import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantId } from '@/hooks/useRestaurantId';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface HistoryOrder {
  id: string;
  total: number;
  status: string;
  created_at: string;
  items: string[];
  customer_name?: string;
  source?: string;
}

interface OrderHistoryProps {
  onRetrieveOrder: (orderId: string, items: string[], total: number) => void;
  currentOrderHasItems: boolean;
}

export const OrderHistory = ({ onRetrieveOrder, currentOrderHasItems }: OrderHistoryProps) => {
  const { restaurantId } = useRestaurantId();
  const [showQSROnly, setShowQSROnly] = useState(true);

  const { data: allOrders = [], isLoading } = useQuery({
    queryKey: ['qsr-orders', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as HistoryOrder[];
    },
    enabled: !!restaurantId,
  });

  // Filter orders based on toggle
  const orders = showQSROnly 
    ? allOrders.filter(order => order.source === 'qsr')
    : allOrders;

  // Set up real-time subscription for orders
  useRealtimeSubscription({
    table: 'orders',
    queryKey: ['qsr-orders', restaurantId],
    filter: restaurantId ? { column: 'restaurant_id', value: restaurantId } : null,
  });

  const getStatusBadge = (status: string) => {
    const statusMap = {
      paid: { label: 'Paid', variant: 'default' as const },
      completed: { label: 'Paid', variant: 'default' as const },
      pending: { label: 'Pending KOT', variant: 'secondary' as const },
      held: { label: 'Pending KOT', variant: 'secondary' as const },
      cancelled: { label: 'Cancelled', variant: 'destructive' as const },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'outline' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const parseItems = (items: string[]) => {
    if (!items || items.length === 0) return [];
    return items;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading order history...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="p-6 border-b border-border sticky top-0 bg-background z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Order History Log</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowQSROnly(true)}
              className={`px-4 py-2 rounded-lg font-medium transition-all touch-manipulation ${
                showQSROnly
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              QSR Orders
            </button>
            <button
              onClick={() => setShowQSROnly(false)}
              className={`px-4 py-2 rounded-lg font-medium transition-all touch-manipulation ${
                !showQSROnly
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              All Orders
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-6 space-y-4">
        {orders.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            No orders found
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="font-semibold text-lg text-card-foreground">
                    Order ID: #{order.id.substring(0, 8).toUpperCase()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {order.customer_name && `Customer: ${order.customer_name} | `}
                    {format(new Date(order.created_at), 'MMM dd, yyyy, h:mm a')}
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <div className="text-2xl font-bold text-primary">
                    <CurrencyDisplay amount={order.total} showTooltip={false} />
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(order.status)}
                    {order.status === 'held' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRetrieveOrder(order.id, order.items, order.total)}
                        disabled={currentOrderHasItems}
                        className="gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Retrieve
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="border-t border-border pt-3">
                <div className="text-sm text-muted-foreground font-medium mb-2">Items:</div>
                <div className="text-card-foreground">
                  {parseItems(order.items).join(', ') || 'No items'}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

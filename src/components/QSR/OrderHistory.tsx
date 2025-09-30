import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantId } from '@/hooks/useRestaurantId';
import { CurrencyDisplay } from '@/components/ui/currency-display';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface HistoryOrder {
  id: string;
  total: number;
  status: string;
  created_at: string;
  items: string[];
  customer_name?: string;
}

export const OrderHistory = () => {
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const restaurantId = useRestaurantId();

  useEffect(() => {
    if (!restaurantId) return;

    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setOrders(data as HistoryOrder[]);
      }
      setLoading(false);
    };

    fetchOrders();

    // Real-time subscription
    const channel = supabase
      .channel('qsr-order-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading order history...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="p-6 border-b border-border sticky top-0 bg-background z-10">
        <h2 className="text-2xl font-bold text-foreground">Order History Log</h2>
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
                <div>
                  <div className="font-semibold text-lg text-card-foreground">
                    Order ID: #{order.id.substring(0, 8).toUpperCase()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {order.customer_name && `Customer: ${order.customer_name} | `}
                    {format(new Date(order.created_at), 'MMM dd, yyyy, h:mm a')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary mb-2">
                    <CurrencyDisplay amount={order.total} showTooltip={false} />
                  </div>
                  {getStatusBadge(order.status)}
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

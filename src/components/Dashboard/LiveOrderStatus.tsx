import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { Card } from "@/components/ui/card";
import { Bell, Clock, CheckCircle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface KitchenOrder {
  id: string;
  order_id: string;
  source: string;
  status: 'new' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  items: Array<{ name: string; quantity: number; notes?: string }>;
  created_at: string;
}

export const LiveOrderStatus = () => {
  const { restaurantId } = useRestaurantId();
  const [preparingOrders, setPreparingOrders] = useState<KitchenOrder[]>([]);
  const [readyOrders, setReadyOrders] = useState<KitchenOrder[]>([]);
  const [newlyReadyIds, setNewlyReadyIds] = useState<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3');
    audioRef.current.volume = 0.5;
  }, []);

  // Fetch initial orders
  useEffect(() => {
    if (!restaurantId) return;

    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('kitchen_orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .in('status', ['preparing', 'ready'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching kitchen orders:', error);
        return;
      }

      const preparing = data.filter(o => o.status === 'preparing');
      const ready = data.filter(o => o.status === 'ready');
      
      setPreparingOrders(preparing);
      setReadyOrders(ready);
    };

    fetchOrders();
  }, [restaurantId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel('kitchen-orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kitchen_orders',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        (payload) => {
          console.log('Kitchen order change detected:', payload);
          
          if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as KitchenOrder;
            
            // Order marked as ready
            if (updatedOrder.status === 'ready') {
              setPreparingOrders(prev => prev.filter(o => o.id !== updatedOrder.id));
              setReadyOrders(prev => {
                const exists = prev.find(o => o.id === updatedOrder.id);
                if (!exists) {
                  // Play notification sound
                  audioRef.current?.play().catch(e => console.error('Audio play failed:', e));
                  
                  // Add to newly ready set for animation
                  setNewlyReadyIds(prevSet => new Set(prevSet).add(updatedOrder.id));
                  
                  // Remove from newly ready after animation
                  setTimeout(() => {
                    setNewlyReadyIds(prevSet => {
                      const newSet = new Set(prevSet);
                      newSet.delete(updatedOrder.id);
                      return newSet;
                    });
                  }, 3000);
                  
                  return [updatedOrder, ...prev];
                }
                return prev.map(o => o.id === updatedOrder.id ? updatedOrder : o);
              });
            }
            // Order marked as preparing
            else if (updatedOrder.status === 'preparing') {
              setReadyOrders(prev => prev.filter(o => o.id !== updatedOrder.id));
              setPreparingOrders(prev => {
                const exists = prev.find(o => o.id === updatedOrder.id);
                if (!exists) return [updatedOrder, ...prev];
                return prev.map(o => o.id === updatedOrder.id ? updatedOrder : o);
              });
            }
            // Order completed or cancelled - remove from both
            else if (updatedOrder.status === 'completed' || updatedOrder.status === 'cancelled') {
              setPreparingOrders(prev => prev.filter(o => o.id !== updatedOrder.id));
              setReadyOrders(prev => prev.filter(o => o.id !== updatedOrder.id));
            }
          }
          else if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as KitchenOrder;
            if (newOrder.status === 'preparing') {
              setPreparingOrders(prev => [newOrder, ...prev]);
            } else if (newOrder.status === 'ready') {
              setReadyOrders(prev => [newOrder, ...prev]);
            }
          }
          else if (payload.eventType === 'DELETE') {
            const deletedOrder = payload.old as KitchenOrder;
            setPreparingOrders(prev => prev.filter(o => o.id !== deletedOrder.id));
            setReadyOrders(prev => prev.filter(o => o.id !== deletedOrder.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  const handleDismissReady = async (orderId: string) => {
    // Update order status to completed
    const { error } = await supabase
      .from('kitchen_orders')
      .update({ status: 'completed' })
      .eq('id', orderId);

    if (error) {
      console.error('Error dismissing order:', error);
      return;
    }

    setReadyOrders(prev => prev.filter(o => o.id !== orderId));
  };

  const OrderTicket = ({ order, isReady }: { order: KitchenOrder; isReady?: boolean }) => {
    const isNewlyReady = newlyReadyIds.has(order.id);
    
    return (
      <Card 
        className={cn(
          "p-4 transition-all duration-300",
          isNewlyReady && "animate-pulse border-2 border-green-500 bg-green-50 dark:bg-green-900/20"
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {isReady ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Bell className="h-4 w-4 animate-bounce" />
                <span className="font-semibold">Ready for Pickup!</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <Clock className="h-4 w-4" />
                <span className="font-semibold">Preparing</span>
              </div>
            )}
          </div>
          {isReady && (
            <button
              onClick={() => handleDismissReady(order.id)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="font-mono">
              {order.source}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(order.created_at).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
          
          <div className="border-t pt-2 mt-2">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Items:</p>
            <ul className="space-y-1">
              {order.items.map((item, idx) => (
                <li key={idx} className="text-sm flex justify-between">
                  <span>{item.name}</span>
                  <span className="text-muted-foreground">x{item.quantity}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Live Order Status</h2>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Preparing Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-orange-600 dark:text-orange-400 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Preparing in Kitchen
            </h3>
            <Badge variant="secondary">{preparingOrders.length}</Badge>
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {preparingOrders.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No orders preparing</p>
              </Card>
            ) : (
              preparingOrders.map(order => (
                <OrderTicket key={order.id} order={order} />
              ))
            )}
          </div>
        </div>

        {/* Ready Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Ready for Pickup
            </h3>
            <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/40">
              {readyOrders.length}
            </Badge>
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {readyOrders.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No orders ready</p>
              </Card>
            ) : (
              readyOrders.map(order => (
                <OrderTicket key={order.id} order={order} isReady />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Check, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { KitchenOrder } from "./KitchenDisplay";

interface OrderTicketProps {
  order: KitchenOrder;
  onStatusUpdate: (orderId: string, status: KitchenOrder["status"]) => void;
}

const OrderTicket = ({ order, onStatusUpdate }: OrderTicketProps) => {
  const [completedItems, setCompletedItems] = useState<Set<number>>(new Set());

  const orderAge = formatDistanceToNow(new Date(order.created_at), { addSuffix: true });

  const getNextStatus = (): KitchenOrder["status"] => {
    switch (order.status) {
      case "new":
        return "preparing";
      case "preparing":
        return "ready";
      default:
        return "ready";
    }
  };

  const getStatusColor = () => {
    switch (order.status) {
      case "new":
        return "border-l-yellow-500";
      case "preparing":
        return "border-l-blue-500";
      case "ready":
        return "border-l-green-500";
      default:
        return "border-l-gray-500";
    }
  };

  const toggleItemComplete = (index: number) => {
    const newCompleted = new Set(completedItems);
    if (completedItems.has(index)) {
      newCompleted.delete(index);
    } else {
      newCompleted.add(index);
    }
    setCompletedItems(newCompleted);
  };

  return (
    <Card className={`border-l-4 ${getStatusColor()} hover:shadow-md transition-shadow`}>
      <div className="p-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold">{order.source}</h3>
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="w-4 h-4 mr-1" />
              {orderAge}
            </div>
          </div>
          {order.status !== "ready" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStatusUpdate(order.id, getNextStatus())}
            >
              {order.status === "new" ? (
                <>
                  Start Preparing
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              ) : (
                <>
                  Mark Ready
                  <Check className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          )}
        </div>
        
        <div className="space-y-2">
          {order.items.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => toggleItemComplete(index)}
            >
              <div
                className={`flex-1 ${
                  completedItems.has(index) ? "line-through text-muted-foreground" : ""
                }`}
              >
                <span className="font-medium">{item.quantity}x</span> {item.name}
                {item.notes && item.notes.length > 0 && (
                  <ul className="ml-6 text-sm text-muted-foreground">
                    {item.notes.map((note, noteIndex) => (
                      <li key={noteIndex}>- {note}</li>
                    ))}
                  </ul>
                )}
              </div>
              {completedItems.has(index) && (
                <Check className="w-4 h-4 text-green-500" />
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default OrderTicket;

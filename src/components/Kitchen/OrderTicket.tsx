
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Check, ChevronRight, Clock, Play, CheckCircle2, Timer } from "lucide-react";
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

  const getStatusStyles = () => {
    switch (order.status) {
      case "new":
        return {
          border: "border-l-4 border-amber-500",
          statusBadge: "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
          button: "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white",
          icon: <Play className="w-4 h-4" />
        };
      case "preparing":
        return {
          border: "border-l-4 border-blue-500",
          statusBadge: "bg-gradient-to-r from-blue-500 to-indigo-600 text-white",
          button: "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white",
          icon: <CheckCircle2 className="w-4 h-4" />
        };
      case "ready":
        return {
          border: "border-l-4 border-green-500",
          statusBadge: "bg-gradient-to-r from-green-500 to-emerald-500 text-white",
          button: "bg-gray-300 text-gray-500 cursor-not-allowed",
          icon: <CheckCircle2 className="w-4 h-4" />
        };
      default:
        return {
          border: "border-l-4 border-gray-500",
          statusBadge: "bg-gray-500 text-white",
          button: "bg-gray-300 text-gray-500",
          icon: <Clock className="w-4 h-4" />
        };
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

  const styles = getStatusStyles();
  const completionPercentage = order.items.length > 0 ? (completedItems.size / order.items.length) * 100 : 0;

  return (
    <Card className={`${styles.border} hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-2xl overflow-hidden`}>
      <div className="p-6">
        {/* Order Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className={`px-3 py-1 rounded-full text-sm font-semibold ${styles.statusBadge} shadow-lg`}>
                {order.status.toUpperCase()}
              </div>
              <h3 className="text-xl font-bold text-gray-800">{order.source}</h3>
            </div>
            
            <div className="flex items-center text-sm text-gray-500 gap-4">
              <div className="flex items-center gap-1">
                <Timer className="w-4 h-4" />
                <span>{orderAge}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{completedItems.size}/{order.items.length} items completed</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-3 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-green-400 to-green-500 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
          
          {order.status !== "ready" && (
            <Button
              className={`ml-4 rounded-xl font-semibold px-6 py-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 ${styles.button}`}
              onClick={() => onStatusUpdate(order.id, getNextStatus())}
            >
              <div className="flex items-center gap-2">
                {styles.icon}
                {order.status === "new" ? "Start Preparing" : "Mark Ready"}
              </div>
            </Button>
          )}
        </div>
        
        {/* Order Items */}
        <div className="space-y-3">
          {order.items.map((item, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                completedItems.has(index) 
                  ? "bg-green-50 border-2 border-green-200" 
                  : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200"
              }`}
              onClick={() => toggleItemComplete(index)}
            >
              <div className="flex-1 min-w-0">
                <div className={`font-semibold text-lg ${
                  completedItems.has(index) ? "line-through text-gray-500" : "text-gray-800"
                }`}>
                  <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-bold mr-2">
                    {item.quantity}x
                  </span>
                  {item.name}
                </div>
                {item.notes && item.notes.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {item.notes.map((note, noteIndex) => (
                      <div key={noteIndex} className={`text-sm p-2 rounded-lg ${
                        completedItems.has(index) 
                          ? "text-gray-400 bg-green-100" 
                          : "text-gray-600 bg-yellow-100 border border-yellow-200"
                      }`}>
                        <span className="font-medium">Note:</span> {note}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 ${
                completedItems.has(index) 
                  ? "bg-green-500 text-white shadow-lg" 
                  : "bg-white border-2 border-gray-300 text-gray-400 hover:border-green-400"
              }`}>
                {completedItems.has(index) && <Check className="w-5 h-5" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default OrderTicket;

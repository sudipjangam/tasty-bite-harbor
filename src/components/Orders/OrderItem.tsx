import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, format } from "date-fns";
import OrderActions from "./OrderActions";
import type { Order } from "@/types/orders";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Star,
  Zap,
  User,
} from "lucide-react";
import { sanitizeOrderItemDisplay } from "@/lib/order-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OrderItemProps {
  order: Order;
  onStatusChange: (orderId: string, newStatus: string) => Promise<void>;
  onEdit?: () => void;
  onDelete?: (orderId: string) => void;
  onPrintBill?: (order: Order) => void;
  onPriorityChange?: (
    orderId: string,
    priority: "normal" | "rush" | "vip",
  ) => void;
}

const OrderItem: React.FC<OrderItemProps> = ({
  order,
  onStatusChange,
  onEdit,
  onDelete,
  onPrintBill,
  onPriorityChange,
}) => {
  const { toast } = useToast();

  const orderTimestamp = order.source === "quickserve"
    ? order.created_at
    : order.updated_at || order.created_at;
  const formattedDate = formatDistanceToNow(new Date(order.created_at), { addSuffix: true });
  const actualTime = format(new Date(orderTimestamp), "hh:mm a");

  const handlePriorityChange = async (priority: "normal" | "rush" | "vip") => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ priority })
        .eq("id", order.id);
      if (error) throw error;
      toast({ title: "Priority Updated", description: `Order priority changed to ${priority.toUpperCase()}` });
      if (onPriorityChange) onPriorityChange(order.id, priority);
    } catch (error) {
      console.error("Error updating priority:", error);
      toast({ variant: "destructive", title: "Update Failed", description: "Could not update order priority" });
    }
  };

  // Status config
  const statusConfig = useMemo(() => {
    switch (order.status) {
      case "completed":
        return { label: "Completed", dotColor: "#3b82f6", bgClass: "bg-blue-50 text-blue-700 border-blue-200" };
      case "pending":
        return { label: "Pending", dotColor: "#f59e0b", bgClass: "bg-amber-50 text-amber-700 border-amber-200" };
      case "preparing":
        return { label: "Preparing", dotColor: "#f97316", bgClass: "bg-orange-50 text-orange-700 border-orange-200" };
      case "ready":
        return { label: "Ready", dotColor: "#10b981", bgClass: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case "held":
        return { label: "Held", dotColor: "#8b5cf6", bgClass: "bg-violet-50 text-violet-700 border-violet-200" };
      case "cancelled":
        return { label: "Cancelled", dotColor: "#ef4444", bgClass: "bg-red-50 text-red-700 border-red-200" };
      default:
        return { label: order.status, dotColor: "#94a3b8", bgClass: "bg-gray-50 text-gray-700 border-gray-200" };
    }
  }, [order.status]);

  // Stripe gradient based on status
  const stripeGradient = useMemo(() => {
    switch (order.status) {
      case "preparing": return "linear-gradient(135deg, #f97316 0%, #fb923c 100%)";
      case "pending": return "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)";
      case "ready": return "linear-gradient(135deg, #10b981 0%, #34d399 100%)";
      case "completed": return "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)";
      case "held": return "linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)";
      case "cancelled": return "linear-gradient(135deg, #ef4444 0%, #f87171 100%)";
      default: return "linear-gradient(135deg, #f97316 0%, #1d4ed8 100%)";
    }
  }, [order.status]);

  const getSourceLabel = (source?: string, orderType?: string) => {
    if (!source) return null;
    const sourceLabels: Record<string, string> = {
      pos: "POS", table: "Table Order", manual: "Manual", room_service: "Room Service", qsr: "QSR",
    };
    const orderTypeLabels: Record<string, string> = {
      "dine-in": "Dine-In", takeaway: "Takeaway", delivery: "Delivery", "non-chargeable": "Non-Chargeable",
    };
    const sourceText = sourceLabels[source] || source;
    if (orderType === "non-chargeable") return sourceText;
    const typeText = orderType ? orderTypeLabels[orderType] || orderType : "";
    return typeText || sourceText;
  };

  const sourceLabel = getSourceLabel(order.source, order.order_type);
  const isNCOrder = order.order_type === "non-chargeable";

  const calculateSubtotal = () => {
    return order.items.reduce((sum, itemStr) => {
      const match = itemStr.match(/^(\d+)x\s+(.+?)(?:\s+@(\d+(?:\.\d+)?))?$/);
      if (match && match[3]) return sum + parseInt(match[1]) * parseFloat(match[3]);
      return sum;
    }, 0);
  };

  const displayTotal = isNCOrder ? calculateSubtotal() : order.total;

  // Parse items for display chips
  const parsedItems = useMemo(() => {
    return order.items.map((itemStr) => {
      const sanitized = sanitizeOrderItemDisplay(itemStr);
      const match = sanitized.match(/^(\d+)x\s+(.+?)(?:\s+@(\d+(?:\.\d+)?))?$/);
      if (match) {
        return { qty: match[1], name: match[2], price: match[3] ? `₹${match[3]}` : "" };
      }
      return { qty: "1", name: sanitized, price: "" };
    });
  }, [order.items]);

  // Short order ID
  const shortId = useMemo(() => {
    const id = order.id;
    if (id.length > 8) return `#${id.substring(0, 8).toUpperCase()}`;
    return `#${id.toUpperCase()}`;
  }, [order.id]);

  return (
    <div
      className="bg-white/70 backdrop-blur-2xl border border-white/85 rounded-[20px] mb-3 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 group"
      style={{
        boxShadow: "0 8px 32px rgba(29,78,216,0.12), 0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      {/* Color stripe */}
      <div className="h-[3px]" style={{ background: stripeGradient }} />

      {/* Top section: Order info + status + amount */}
      <div className="flex items-start gap-3 p-4 pb-3">
        {/* Order number tag */}
        <div className="font-mono text-[10px] font-semibold px-2.5 py-1 rounded-[7px] border whitespace-nowrap mt-0.5 flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, rgba(29,78,216,0.1), rgba(249,115,22,0.08))",
            color: "#2563eb",
            borderColor: "rgba(29,78,216,0.18)",
          }}
        >
          {shortId}
        </div>

        {/* Customer info */}
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-bold text-slate-800 mb-1.5 tracking-tight truncate">
            {order.customer_name}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {sourceLabel && (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md tracking-wide"
                style={{
                  background: "linear-gradient(135deg, rgba(29,78,216,0.1), rgba(59,130,246,0.12))",
                  color: "#1d4ed8",
                  border: "1px solid rgba(29,78,216,0.2)",
                }}
              >
                {sourceLabel}
              </span>
            )}
            {order.attendant && (
              <span className="text-[11px] text-slate-400 font-medium">
                Attendant: {order.attendant}
              </span>
            )}
            <span className="text-[11px] text-slate-400 font-medium">
              · {formattedDate} · {actualTime}
            </span>
          </div>
        </div>

        {/* Right: Status + Amount */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {/* Status pill */}
          <div className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full border tracking-wide ${statusConfig.bgClass}`}>
            <span
              className="w-[6px] h-[6px] rounded-full"
              style={{
                backgroundColor: statusConfig.dotColor,
                boxShadow: `0 0 5px ${statusConfig.dotColor}`,
              }}
            />
            {statusConfig.label}
          </div>

          {/* Priority badges */}
          {order.priority === "vip" && (
            <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
              <Star className="w-3 h-3" /> VIP
            </div>
          )}
          {order.priority === "rush" && (
            <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white">
              <Zap className="w-3 h-3" /> RUSH
            </div>
          )}

          {/* Amount */}
          <div className="text-right">
            <div className="text-[9px] font-bold tracking-widest uppercase text-slate-400">Total Amount</div>
            {isNCOrder ? (
              <div className="flex flex-col items-end">
                <span className="text-sm text-slate-400 line-through">
                  <CurrencyDisplay amount={displayTotal} showTooltip={false} />
                </span>
                <span className="text-xl font-extrabold font-mono bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  <CurrencyDisplay amount={0} showTooltip={false} />
                </span>
              </div>
            ) : (
              <>
                <CurrencyDisplay
                  amount={order.total}
                  className="text-[20px] font-extrabold font-mono text-slate-800 tracking-tight"
                />
                {order.discount_amount && order.discount_amount > 0 ? (
                  <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
                    {(order as any).discount_notes
                      ? (order as any).discount_notes
                      : order.discount_percentage && order.discount_percentage > 0
                        ? `${order.discount_percentage}% discount`
                        : "Discount applied"}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>

      {/* NC badge */}
      {isNCOrder && (
        <div className="px-4 pb-2">
          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-300/50 border-0 flex items-center gap-1.5 px-3 w-fit">
            <span>🎁</span> Non-Chargeable
          </Badge>
        </div>
      )}

      {/* Items chips */}
      <div className="px-4 pb-3 flex gap-[7px] flex-wrap">
        {parsedItems.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center gap-1.5 text-[11px] font-medium bg-white/75 border border-blue-100/60 rounded-lg px-2.5 py-1.5 text-slate-600 transition-all hover:bg-white hover:border-blue-200"
          >
            <span className="font-extrabold text-blue-600 font-mono text-[10px]">{item.qty}×</span>
            <span>{item.name}</span>
            {item.price && <span className="font-mono text-[10px] text-slate-400">{item.price}</span>}
          </div>
        ))}
      </div>

      {/* Footer: Time + Actions */}
      <div className="flex items-center justify-between px-4 py-2.5 flex-wrap gap-2 border-t border-slate-100/60">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
          <Clock className="w-3.5 h-3.5" />
          Ordered {formattedDate}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Priority selector */}
          {onPriorityChange && (
            <Select
              value={order.priority || "normal"}
              onValueChange={(value: "normal" | "rush" | "vip") => handlePriorityChange(value)}
            >
              <SelectTrigger className="h-7 text-[10px] border-slate-200 w-[100px] rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vip">
                  <div className="flex items-center gap-1.5"><Star className="w-3 h-3 text-yellow-500" /> VIP</div>
                </SelectItem>
                <SelectItem value="rush">
                  <div className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-red-500" /> Rush</div>
                </SelectItem>
                <SelectItem value="normal">
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-gray-500" /> Normal</div>
                </SelectItem>
              </SelectContent>
            </Select>
          )}

          <OrderActions
            order={order}
            onStatusUpdate={onStatusChange}
            onEdit={onEdit ? () => onEdit() : undefined}
            onDelete={onDelete}
            onPrintBill={onPrintBill}
          />
        </div>
      </div>
    </div>
  );
};

export default OrderItem;

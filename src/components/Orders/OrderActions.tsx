import React from "react";
import { Edit, Trash2, Check, Clock, Printer } from "lucide-react";
import type { Order } from "@/types/orders";

interface OrderActionsProps {
  order: Order;
  loading?: boolean;
  onEdit?: (order: Order) => void;
  onStatusUpdate?: (orderId: string, newStatus: string) => void;
  onDelete?: (orderId: string) => void;
  onPrintBill?: (order: Order) => void;
}

const OrderActions: React.FC<OrderActionsProps> = ({
  order,
  loading = false,
  onEdit,
  onStatusUpdate,
  onDelete,
  onPrintBill,
}) => {
  if (!order) return null;

  return (
    <div className="flex items-center gap-[7px] flex-wrap">
      {/* Edit */}
      {onEdit && (
        <button
          onClick={() => onEdit(order)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white/85 text-slate-600 border border-blue-100 shadow-sm transition-all hover:bg-white hover:text-blue-600 hover:border-blue-300 hover:shadow-md disabled:opacity-50"
        >
          <Edit className="w-3 h-3" />
          Edit
        </button>
      )}

      {/* Complete / Revert */}
      {onStatusUpdate &&
        (order.status === "pending" || order.status === "preparing") ? (
        <button
          onClick={() => onStatusUpdate(order.id, "completed")}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white transition-all hover:shadow-lg hover:-translate-y-px disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
            boxShadow: "0 3px 12px rgba(5,150,105,0.38)",
          }}
        >
          <Check className="w-3 h-3" />
          Complete
        </button>
      ) : onStatusUpdate && order.status === "completed" ? (
        <button
          onClick={() => onStatusUpdate(order.id, "pending")}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 transition-all hover:bg-amber-100 disabled:opacity-50"
        >
          <Clock className="w-3 h-3" />
          Revert
        </button>
      ) : null}

      {/* Print Bill */}
      {onPrintBill && (
        <button
          onClick={() => onPrintBill(order)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:bg-blue-100/80 disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, rgba(29,78,216,0.1), rgba(59,130,246,0.13))",
            color: "#1d4ed8",
            border: "1px solid rgba(29,78,216,0.22)",
          }}
        >
          <Printer className="w-3 h-3" />
          Print Bill
        </button>
      )}

      {/* Delete */}
      {onDelete && (
        <button
          onClick={() => onDelete(order.id)}
          disabled={loading}
          className="flex items-center justify-center w-7 h-7 rounded-[7px] text-slate-400 bg-transparent border-none transition-all hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default OrderActions;

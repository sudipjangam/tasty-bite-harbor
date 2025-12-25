import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Ban, Send, X } from "lucide-react";

interface ExistingOrder {
  id: string;
  source: string;
  items: { name: string; quantity: number }[];
  created_at: string;
}

interface DuplicateOrderWarningDialogProps {
  open: boolean;
  onClose: () => void;
  existingOrder: ExistingOrder | null;
  newOrderItems: { name: string; quantity: number }[];
  onSendAnyway: () => void;
  onMarkNonChargeable: () => void;
}

export const DuplicateOrderWarningDialog = ({
  open,
  onClose,
  existingOrder,
  newOrderItems,
  onSendAnyway,
  onMarkNonChargeable,
}: DuplicateOrderWarningDialogProps) => {
  if (!existingOrder) return null;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const timeSinceOrder = () => {
    const created = new Date(existingOrder.created_at);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins === 1) return "1 minute ago";
    return `${diffMins} minutes ago`;
  };

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <AlertDialogContent className="max-w-lg p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white text-lg">
              <AlertTriangle className="h-6 w-6" />
              Duplicate Order Warning
            </AlertDialogTitle>
          </AlertDialogHeader>
        </div>

        <div className="p-4 space-y-4">
          <AlertDialogDescription className="text-base text-gray-700 dark:text-gray-300">
            A similar order for{" "}
            <span className="font-bold text-gray-900 dark:text-gray-100">
              {existingOrder.source}
            </span>{" "}
            was placed{" "}
            <span className="font-bold text-orange-600">
              {timeSinceOrder()}
            </span>
            . Are you sure you want to send another order?
          </AlertDialogDescription>

          {/* Orders Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Existing Order */}
            <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-700 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-orange-200 dark:border-orange-700">
                <span className="text-lg">🕐</span>
                <div>
                  <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                    Existing Order
                  </p>
                  <p className="text-xs text-orange-600 dark:text-orange-500">
                    {formatTime(existingOrder.created_at)}
                  </p>
                </div>
              </div>
              <ul className="space-y-1.5">
                {existingOrder.items.slice(0, 4).map((item, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2"
                  >
                    <span className="min-w-[24px] h-6 px-1.5 bg-orange-200 dark:bg-orange-800 rounded-md flex items-center justify-center text-xs font-bold text-orange-800 dark:text-orange-200">
                      {item.quantity}x
                    </span>
                    <span className="truncate">{item.name}</span>
                  </li>
                ))}
                {existingOrder.items.length > 4 && (
                  <li className="text-xs text-gray-500 italic pl-8">
                    +{existingOrder.items.length - 4} more items
                  </li>
                )}
              </ul>
            </div>

            {/* New Order */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-blue-200 dark:border-blue-700">
                <span className="text-lg">🆕</span>
                <div>
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                    New Order
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-500">
                    Current
                  </p>
                </div>
              </div>
              <ul className="space-y-1.5">
                {newOrderItems.slice(0, 4).map((item, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2"
                  >
                    <span className="min-w-[24px] h-6 px-1.5 bg-blue-200 dark:bg-blue-800 rounded-md flex items-center justify-center text-xs font-bold text-blue-800 dark:text-blue-200">
                      {item.quantity}x
                    </span>
                    <span className="truncate">{item.name}</span>
                  </li>
                ))}
                {newOrderItems.length > 4 && (
                  <li className="text-xs text-gray-500 italic pl-8">
                    +{newOrderItems.length - 4} more items
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Action Buttons - Stacked vertically for clarity */}
          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={onSendAnyway}
              size="lg"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold shadow-lg"
            >
              <Send className="h-5 w-5" />
              Send Anyway (This is a new order)
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={onMarkNonChargeable}
              className="w-full flex items-center justify-center gap-2 text-orange-600 border-2 border-orange-300 hover:bg-orange-50 dark:border-orange-700 dark:hover:bg-orange-900/20 font-semibold"
            >
              <Ban className="h-5 w-5" />
              Mark as Non-Chargeable (Accidental KOT)
            </Button>

            <Button
              variant="ghost"
              size="lg"
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <X className="h-5 w-5" />
              Cancel
            </Button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DuplicateOrderWarningDialog;

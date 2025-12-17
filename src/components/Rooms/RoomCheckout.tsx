
import React from 'react';
import RoomCheckoutPage from './CheckoutComponents/RoomCheckoutPage';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Receipt } from "lucide-react";

interface RoomCheckoutProps {
  roomId: string;
  reservationId: string;
  onComplete: () => Promise<void>;
  onCancel?: () => void;
  open?: boolean;
}

const RoomCheckout: React.FC<RoomCheckoutProps> = ({ 
  roomId, 
  reservationId, 
  onComplete,
  onCancel,
  open = true
}) => {
  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onCancel?.()}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-[85vw] lg:max-w-[75vw] xl:max-w-[65vw] overflow-y-auto p-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950"
      >
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-white/20 dark:border-gray-700/20 p-4 sm:p-6">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                <Receipt className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Room Checkout
              </span>
            </SheetTitle>
          </SheetHeader>
        </div>
        <div className="p-4 sm:p-6">
          <RoomCheckoutPage 
            roomId={roomId} 
            reservationId={reservationId} 
            onComplete={onComplete}
            onCancel={onCancel}
            isInSheet={true}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default RoomCheckout;

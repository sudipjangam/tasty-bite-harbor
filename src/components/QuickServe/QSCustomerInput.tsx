import React from "react";
import { User, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";

interface QSCustomerInputProps {
  customerName: string;
  customerPhone: string;
  onNameChange: (name: string) => void;
  onPhoneChange: (phone: string) => void;
}

export const QSCustomerInput: React.FC<QSCustomerInputProps> = ({
  customerName,
  customerPhone,
  onNameChange,
  onPhoneChange,
}) => {
  return (
    <div className="px-4 py-2.5 space-y-2 border-b border-gray-200/50 dark:border-white/5">
      <p className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-white/30 font-semibold">
        Customer (optional)
      </p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-orange-400/60 dark:text-orange-500/40" />
          <Input
            placeholder="Name"
            value={customerName}
            onChange={(e) => onNameChange(e.target.value)}
            className="pl-8 bg-white/70 dark:bg-white/5 backdrop-blur-sm border-gray-200/50 dark:border-white/[0.08] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/20 h-9 rounded-xl text-xs focus:border-orange-300 dark:focus:border-orange-500/40 focus:ring-orange-400/20 transition-all"
          />
        </div>
        <div className="relative flex-1">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-orange-400/60 dark:text-orange-500/40" />
          <Input
            placeholder="Phone"
            value={customerPhone}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 10);
              onPhoneChange(val);
            }}
            className="pl-8 bg-white/70 dark:bg-white/5 backdrop-blur-sm border-gray-200/50 dark:border-white/[0.08] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/20 h-9 rounded-xl text-xs focus:border-orange-300 dark:focus:border-orange-500/40 focus:ring-orange-400/20 transition-all"
            type="tel"
            maxLength={10}
          />
        </div>
      </div>
    </div>
  );
};

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
    <div className="px-4 py-2 space-y-2 border-b border-white/10">
      <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium">
        Customer (optional)
      </p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <Input
            placeholder="Name"
            value={customerName}
            onChange={(e) => onNameChange(e.target.value)}
            className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-white/25 h-8 rounded-lg text-xs"
          />
        </div>
        <div className="relative flex-1">
          <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <Input
            placeholder="Phone"
            value={customerPhone}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 10);
              onPhoneChange(val);
            }}
            className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-white/25 h-8 rounded-lg text-xs"
            type="tel"
            maxLength={10}
          />
        </div>
      </div>
    </div>
  );
};
